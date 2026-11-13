import { formatPhoneNumber } from '../utils'
import { latinizeLookalikes, normalizePlate, titleCase } from './normalize'

// Parse the text rows of a Ukrainian motor third-party liability policy ("Автоцивілка", ОСЦПВ)
// into the fields the app needs. Fields that cannot be found are left empty, so the
// review dialog can show them for the user to fill in.
//
// All insurers fill in the same official MTSBU form (sections 1–18), but the layout differs:
//   * BBS:     labelled rows ("Прізвище, ім’я, по батькові | …", "Номер телефону | …"), "EP-…" numbers
//   * Arsenal: the policyholder block has no labels (name, РНОКПП, passport, address, "phone, email"),
//              digits-only numbers, and an electronic stamp printed over the car table
//
// rows: output of extractPolicyRows(), e.g. ["Поліс № | EP-200000001", "9.2. Марка | CHERY", ...]
export function parsePolicy(rows) {
  const lines = rows.map((row) => String(row).replace(/\s+/g, ' ').trim())
  const text = lines.join('\n')

  // Section headers (\b does not work with Cyrillic, so match the whole cell)
  const insuredIndex = lines.findIndex((line) => /(^|\|\s*)СТРАХУВАЛЬНИК\s*(\||$)/.test(line))
  const insurerIndex = lines.findIndex((line) => /(^|\|\s*)СТРАХОВИК\s*(\||$)/.test(line))
  const insuredStart = Math.max(0, insuredIndex)
  const insurerStart = Math.max(0, insurerIndex)
  // Policyholder block without labels: the rows up to the next numbered section ("4 | Предметом Договору…")
  const insuredBlock = insuredIndex < 0 ? [] : sectionRows(lines, insuredIndex)

  // Label: "Прізвище, ім’я, по батькові" (current BBS form) or "П.І.Б." (older BBS form); Arsenal has none
  const fullName = valueAfter(lines, /^(Прізвище,\s*ім.я,\s*по\s*батькові|П\.\s*І\.\s*Б\.?)/i) || unlabelledName(insuredBlock)
  const [lastName = '', firstName = '', ...fatherParts] = fullName.split(' ').filter(Boolean)

  const [brand, model] = splitBrandModel(
    latinizeLookalikes(valueAfter(lines, /^9\.\d+\.\s*Марка/, 0, { lastCell: true })),
    latinizeLookalikes(valueAfter(lines, /^9\.\d+\.\s*Модель/, 0, { lastCell: true }))
  )

  const result = {
    policyNumber: parsePolicyNumber(text),
    isMotorLiability: /цивільно-правової\s+відповідальності\s+власників\s+наземних\s+транспортних\s+засобів/i.test(text),
    client: {
      lastName: titleCase(lastName),
      firstName: titleCase(firstName),
      fatherName: titleCase(fatherParts.join(' ')),
      phone: parsePhone(valueAfter(lines, /^Номер телефону/, insuredStart)) || findPhone(insuredBlock),
      email: parseEmail(valueAfter(lines, /^(Адреса електронної пошти(?! для)|E-?mail)/i, insuredStart)) || parseEmail(insuredBlock.join(' ')),
      birthDate: toInputDate(firstDate(valueAfter(lines, /^Дата народження/, insuredStart))),
    },
    startDate: toInputDate(lastDate(valueAfter(lines, /Дата та час початку строку дії/i))),
    endDate: toInputDate(firstDate(valueAfter(lines, /Дата закінчення строку дії/i))),
    // Section 6: "6 | Дата укладення Договору | 07.09.2026" (the contract date)
    policyDate: toInputDate(firstDate(valueAfter(lines, /Дата укладення Договору/i))),
    premium: parsePremium(lines),
    insurer: {
      name: parseInsurerName(lines, insurerStart),
      edrpou: (valueAfter(lines, /^(Код )?ЄДРПОУ/, insurerStart).match(/\d{8}/) || [''])[0],
    },
    vehicle: {
      // The value is the rightmost cell: stamp text printed over the table can land in the same row
      brand,
      model,
      plate: normalizePlate(valueAfter(lines, /^9\.\d+\.\s*Реєстраційний номер/, 0, { lastCell: true })),
      year: (valueAfter(lines, /^9\.\d+\.\s*Рік випуску/, 0, { lastCell: true }).match(/\d{4}/) || [''])[0],
      vin: normalizePlate(valueAfter(lines, /^9\.\d+\.\s*VIN/, 0, { lastCell: true })),
    },
  }

  return result
}

// A parse is usable when the main fields were found
export function looksLikePolicy(parsed) {
  return !!(parsed.policyNumber || parsed.client.lastName) && !!(parsed.startDate || parsed.premium)
}

// "ЗАЗ Ланос, BC1234AA"
export function vehicleComment({ brand, model, plate }) {
  const car = [brand, model].map((s) => String(s || '').trim()).filter(Boolean).join(' ')
  return [car, String(plate || '').trim()].filter(Boolean).join(', ')
}

// Value of the first row (at or after `from`) whose label matches, with the label and cell separators removed.
// lastCell: return only the rightmost cell (table values sit in the right column)
function valueAfter(lines, labelPattern, from = 0, { lastCell = false } = {}) {
  for (let i = from; i < lines.length; i++) {
    const match = lines[i].match(labelPattern)
    if (!match) continue
    const rest = lines[i].slice(match.index + match[0].length)
    // The value starts after the label cell: "Дата ... Договору | з | 00:00 08.09.2026" -> "з 00:00 08.09.2026"
    const separator = rest.indexOf('|')
    if (separator < 0) return rest.trim()
    const cells = rest.slice(separator + 1).split('|').map((c) => c.trim()).filter(Boolean)
    return lastCell ? cells[cells.length - 1] || '' : cells.join(' ')
  }
  return ''
}

// Rows after a section header, up to the next numbered section ("4 | Предметом…") — at most 12 rows
function sectionRows(lines, headerIndex) {
  const rows = []
  for (let i = headerIndex + 1; i < lines.length && rows.length < 12; i++) {
    if (/^\d{1,2}\s*\|/.test(lines[i])) break
    rows.push(lines[i])
  }
  return rows
}

// First row of the block that looks like a full name: 2–4 words, letters only (e.g. "Ільків Володимир Миронович")
function unlabelledName(block) {
  const name = block.find((row) => {
    const words = row.split(' ')
    return words.length >= 2 && words.length <= 4 && words.every((w) => /^[\p{L}][\p{L}'’ʼ-]*$/u.test(w))
  })
  return name || ''
}

// A Ukrainian phone anywhere in the block: "380671611945", "+38 067 161 19 45", "0671611945"
function findPhone(block) {
  for (const row of block) {
    if (/^(РНОКПП|ІПН|Ідентифікаційний|паспорт|ЄДРПОУ)/i.test(row)) continue // tax / document numbers, not phones
    const match = row.match(/(?:\+?\s*3\s*8\s*)?0(?:[\s()-]*\d){9}/)
    if (match) return parsePhone(match[0])
  }
  return ''
}

// Brands written as two words, kept together when a brand has to be split off the model
const TWO_WORD_BRANDS = ['ALFA ROMEO', 'ASTON MARTIN', 'GREAT WALL', 'LAND ROVER', 'MERCEDES BENZ', 'ROLLS ROYCE']

// Some insurers repeat the brand in the model, or put brand and model in both cells:
//   Марка CHERY             / Модель QQ                 -> CHERY, QQ (unchanged)
//   Марка CHEVROLET         / Модель CHEVROLET LACETTI  -> CHEVROLET, LACETTI
//   Марка CHEVROLET LACETTI / Модель CHEVROLET LACETTI  -> CHEVROLET, LACETTI
export function splitBrandModel(brand = '', model = '') {
  const b = brand.trim()
  const m = model.trim()
  if (!b || !m) return [b, m]
  if (m.toUpperCase() === b.toUpperCase() && b.includes(' ')) {
    const twoWord = TWO_WORD_BRANDS.find((name) => b.toUpperCase().startsWith(`${name} `))
    const brandLength = twoWord ? twoWord.length : b.indexOf(' ')
    return [b.slice(0, brandLength).trim(), b.slice(brandLength).trim()]
  }
  if (m.toUpperCase().startsWith(`${b.toUpperCase()} `)) return [b, m.slice(b.length).trim()]
  return [b, m]
}

// "Поліс № EP-242116145" -> "EP-242116145"; "Поліс № 233797863" -> "233797863"
function parsePolicyNumber(text) {
  const match = text.match(/Поліс\s*№\s*\|?\s*(?:([A-ZА-ЯІЇЄ]{2})[\s_-]*)?(\d{6,})/)
  if (!match) return ''
  return match[1] ? `${normalizePlate(match[1])}-${match[2]}` : match[2]
}

function parsePhone(value) {
  // Skip insurer hotlines such as "0-800-500-123"
  if (/^\s*0[-\s]?800/.test(value)) return ''
  const digits = value.replace(/\D/g, '')
  if (digits.length < 9) return ''
  // +38 050 111 22 33 -> 0501112233 -> (050) 111 22 33
  return formatPhoneNumber(digits.length >= 10 ? digits.slice(-10) : `0${digits.slice(-9)}`)
}

function parseEmail(value) {
  const match = value.match(/[^\s|@]+@[^\s|@]+\.[^\s|@]+/)
  return match ? match[0].toLowerCase() : ''
}

function firstDate(value) {
  return (value.match(/\d{2}\.\d{2}\.\d{4}/) || [''])[0]
}

function lastDate(value) {
  const all = value.match(/\d{2}\.\d{2}\.\d{4}/g) || []
  return all[all.length - 1] || ''
}

// dd.mm.yyyy -> dd/mm/yyyy (the format the app's date inputs use)
function toInputDate(value) {
  return value ? value.replace(/\./g, '/') : ''
}

// The premium near the "Розмір страхової премії, грн" label -> number as text, e.g. "2416".
// BBS: "2.416,00 грн." on the next row; Arsenal: "… | 3 483,00" on the label row (no "грн").
// Looks at the label row first, then below, then above, so the insured sums elsewhere are not picked up.
function parsePremium(lines) {
  const label = lines.findIndex((line) => /Розмір страхової премії,\s*грн/i.test(line))
  if (label < 0) return ''
  for (const offset of [0, 1, 2, 3, -1, -2]) {
    const line = lines[label + offset]
    if (!line) continue
    const match = line.match(/(?<![\d,])(\d{1,3}(?:[.\s ]\d{3})*,\d{2})(?!\d)/)
    if (match) return String(parseFloat(match[1].replace(/[.\s ]/g, '').replace(',', '.')))
  }
  return ''
}

// Rows between "СТРАХОВИК" and "(Код) ЄДРПОУ" hold the insurer's legal name, often split across lines:
// АКЦІОНЕРНЕ ТОВАРИСТВО «СТРАХОВА КОМПАНІЯ / Найменування / «ББС ІНШУРАНС»   or   ПРАТ «СК «АРСЕНАЛ СТРАХУВАННЯ»
// Returns the brand name inside the innermost quotes, e.g. "ББС ІНШУРАНС" or "АРСЕНАЛ СТРАХУВАННЯ".
function parseInsurerName(lines, from) {
  const end = lines.findIndex((line, i) => i > from && /^(Код )?ЄДРПОУ/.test(line))
  if (end < 0) return ''
  const block = lines.slice(from + 1, end).filter((l) => !/^Найменування$/.test(l)).join(' ')
  const quoted = [...block.matchAll(/[«"]([^«»"]+)[»"]/g)].map((m) => m[1].trim())
  return quoted[quoted.length - 1] || block.replace(/^.*?ТОВАРИСТВО\s*/i, '').replace(/[«»"]/g, '').trim()
}

import { formatPhoneNumber } from '../utils'
import { latinizeLookalikes, normalizePlate, titleCase } from './normalize'

// Parse the text rows of a Ukrainian motor third-party liability policy ("Автоцивілка", ОСЦПВ)
// into the fields the app needs. Fields that cannot be found are left empty, so the
// review dialog can show them for the user to fill in.
//
// rows: output of extractPolicyRows(), e.g. ["Поліс № | EP-200000001", "9.2. Марка | CHERY", ...]
export function parsePolicy(rows) {
  const lines = rows.map((row) => String(row).replace(/\s+/g, ' ').trim())
  const text = lines.join('\n')

  // Section headers (\b does not work with Cyrillic, so match the whole cell)
  const insuredStart = findIndex(lines, /(^|\|\s*)СТРАХУВАЛЬНИК\s*(\||$)/)
  const insurerStart = findIndex(lines, /(^|\|\s*)СТРАХОВИК\s*(\||$)/)

  const fullName = valueAfter(lines, /^Прізвище,\s*ім.я,\s*по\s*батькові/i)
  const [lastName = '', firstName = '', ...fatherParts] = fullName.split(' ').filter(Boolean)

  const result = {
    policyNumber: parsePolicyNumber(text),
    isMotorLiability: /цивільно-правової\s+відповідальності\s+власників\s+наземних\s+транспортних\s+засобів/i.test(text),
    client: {
      lastName: titleCase(lastName),
      firstName: titleCase(firstName),
      fatherName: titleCase(fatherParts.join(' ')),
      phone: parsePhone(valueAfter(lines, /^Номер телефону/, insuredStart)),
      email: parseEmail(valueAfter(lines, /^Адреса електронної пошти(?! для)/, insuredStart)),
      birthDate: toInputDate(firstDate(valueAfter(lines, /^Дата народження/, insuredStart))),
    },
    startDate: toInputDate(lastDate(valueAfter(lines, /Дата та час початку строку дії/i))),
    endDate: toInputDate(firstDate(valueAfter(lines, /Дата закінчення строку дії/i))),
    // Section 6: "6 | Дата укладення Договору | 07.09.2026" (the contract date)
    policyDate: toInputDate(firstDate(valueAfter(lines, /Дата укладення Договору/i))),
    premium: parsePremium(lines),
    insurer: {
      name: parseInsurerName(lines, insurerStart),
      edrpou: (valueAfter(lines, /^Код ЄДРПОУ/, insurerStart).match(/\d{8}/) || [''])[0],
    },
    vehicle: {
      brand: latinizeLookalikes(valueAfter(lines, /^9\.\d+\.\s*Марка/)),
      model: latinizeLookalikes(valueAfter(lines, /^9\.\d+\.\s*Модель/)),
      plate: normalizePlate(valueAfter(lines, /^9\.\d+\.\s*Реєстраційний номер/)),
      year: (valueAfter(lines, /^9\.\d+\.\s*Рік випуску/).match(/\d{4}/) || [''])[0],
      vin: normalizePlate(valueAfter(lines, /^9\.\d+\.\s*VIN/)),
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

function findIndex(lines, pattern) {
  const index = lines.findIndex((line) => pattern.test(line))
  return index < 0 ? 0 : index
}

// Value of the first row (at or after `from`) whose label matches, with the label and cell separators removed
function valueAfter(lines, labelPattern, from = 0) {
  for (let i = from; i < lines.length; i++) {
    const match = lines[i].match(labelPattern)
    if (!match) continue
    const rest = lines[i].slice(match.index + match[0].length)
    // The value starts after the label cell: "Дата ... Договору | з | 00:00 08.09.2026" -> "з 00:00 08.09.2026"
    const separator = rest.indexOf('|')
    if (separator < 0) return rest.trim()
    return rest.slice(separator + 1).split('|').map((c) => c.trim()).filter(Boolean).join(' ')
  }
  return ''
}

function parsePolicyNumber(text) {
  const match = text.match(/Поліс\s*№\s*\|?\s*([A-ZА-ЯІЇЄ]{2})[\s_-]*(\d{6,})/)
  return match ? `${normalizePlate(match[1])}-${match[2]}` : ''
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

// "2.416,00 грн." near the "Розмір страхової премії, грн" label -> 2416
function parsePremium(lines) {
  const label = lines.findIndex((line) => /Розмір страхової премії,\s*грн/i.test(line))
  if (label < 0) return ''
  for (let i = Math.max(0, label - 2); i <= Math.min(lines.length - 1, label + 3); i++) {
    const match = lines[i].match(/(\d{1,3}(?:[.\s ]\d{3})*,\d{2})\s*грн/)
    if (match) return String(parseFloat(match[1].replace(/[.\s ]/g, '').replace(',', '.')))
  }
  return ''
}

// Rows between "СТРАХОВИК" and "Код ЄДРПОУ" hold the insurer's legal name, often split across lines:
// АКЦІОНЕРНЕ ТОВАРИСТВО «СТРАХОВА КОМПАНІЯ / Найменування / «ББС ІНШУРАНС»
// Returns the brand name inside the innermost quotes, e.g. "ББС ІНШУРАНС".
function parseInsurerName(lines, from) {
  const end = lines.findIndex((line, i) => i > from && /^Код ЄДРПОУ/.test(line))
  if (end < 0) return ''
  const block = lines.slice(from + 1, end).filter((l) => !/^Найменування$/.test(l)).join(' ')
  const quoted = [...block.matchAll(/[«"]([^«»"]+)[»"]/g)].map((m) => m[1].trim())
  return quoted[quoted.length - 1] || block.replace(/^.*?ТОВАРИСТВО\s*/i, '').replace(/[«»"]/g, '').trim()
}

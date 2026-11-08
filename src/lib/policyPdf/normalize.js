// Text helpers for data read from Ukrainian policy PDFs

// Cyrillic letters that look like Latin ones. Plates and car models often mix them
// (e.g. "І30" with a Cyrillic І, or a plate typed with Cyrillic В/С).
const LOOKALIKES = {
  А: 'A', В: 'B', С: 'C', Е: 'E', Н: 'H', І: 'I', К: 'K', М: 'M', О: 'O', Р: 'P', Т: 'T', Х: 'X', У: 'Y',
  а: 'a', с: 'c', е: 'e', і: 'i', к: 'k', м: 'm', о: 'o', р: 'p', т: 't', х: 'x', у: 'y',
}
const CYRILLIC = /[Ѐ-ӿ]/

// Convert look-alike Cyrillic letters to Latin, but only when the text has no other
// Cyrillic letters (so "ЗАЗ" or "Ланос" stay as they are).
export function latinizeLookalikes(text) {
  const value = String(text || '')
  const other = [...value].some((ch) => CYRILLIC.test(ch) && !LOOKALIKES[ch])
  return other ? value : [...value].map((ch) => LOOKALIKES[ch] || ch).join('')
}

// "BC 1234 АА" -> "BC1234AA"
export function normalizePlate(plate) {
  const compact = String(plate || '').replace(/[\s-]/g, '').toUpperCase()
  return [...compact].map((ch) => LOOKALIKES[ch] || ch).join('')
}

// "КОВАЛЕНКО" -> "Коваленко", "іванова-петренко" -> "Іванова-Петренко"
export function titleCase(word) {
  return String(word || '')
    .toLowerCase()
    .replace(/(^|[-\s])(\p{L})/gu, (_, sep, letter) => sep + letter.toUpperCase())
}

// Lower-case, unify apostrophes and spaces, for comparing names
export function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[’ʼ`´‘]/g, "'")
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim()
}

// Last 9 digits identify a Ukrainian mobile number regardless of +380 / 0 prefix
export function phoneKey(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  return digits.length >= 9 ? digits.slice(-9) : ''
}

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', ы: 'y', э: 'e', ё: 'e', ъ: '',
}

// Ukrainian -> Latin, for matching "ББС ІНШУРАНС" against a company saved as "BBS Insurance"
export function transliterate(text) {
  return [...String(text || '').toLowerCase()].map((ch) => TRANSLIT[ch] ?? ch).join('')
}

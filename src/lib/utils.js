import clsx from 'clsx'

export function cn(...inputs) {
  return clsx(inputs)
}

// Format a date as DD/MM/YYYY
export function formatDate(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (isNaN(date.getTime())) return ''
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

// Format a numeric amount with no currency sign, e.g. 1,234.50
export function formatAmount(value) {
  const num = Number(value) || 0
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatDateInput(value) {
  if (!value) return ''
  const [year, month, day] = String(value).slice(0, 10).split('-')
  return year && month && day ? `${day}/${month}/${year}` : String(value)
}

export function maskDateInput(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

function isRealDate(year, month, day) {
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1) return false
  const daysInMonth = new Date(year, month, 0).getDate()
  return day <= daysInMonth
}

// Convert a dd/mm/yyyy input (or an already-ISO yyyy-mm-dd value) into yyyy-mm-dd.
// Returns null when the value is empty, incomplete, or not a real calendar date.
export function parseDateInput(value) {
  const str = String(value || '').trim()
  let year, month, day

  const dmy = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dmy) {
    ;[, day, month, year] = dmy
  } else if (iso) {
    ;[, year, month, day] = iso
  } else {
    return null
  }

  if (!isRealDate(Number(year), Number(month), Number(day))) return null
  return `${year}-${month}-${day}`
}

// Today's date in the user's local time zone, formatted as dd/mm/yyyy for masked inputs
export function todayDateInput() {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${now.getFullYear()}`
}

// Format a phone number as (XXX) XXX XX XX while typing
export function formatPhoneNumber(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 10)
  if (!digits) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  if (digits.length <= 8) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)} ${digits.slice(6)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`
}

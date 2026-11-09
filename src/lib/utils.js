import clsx from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// tailwind-merge resolves conflicts, so a class passed in by a page wins over a component's default
// (e.g. <Button className="p-0"> removes the button's padding). It also needs to know the app's own shadows.
const twMerge = extendTailwindMerge({
  extend: { theme: { shadow: ['card', 'popover'] } },
})

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

// Parse a value into a Date. Date-only strings (yyyy-mm-dd, as stored by the database) are read
// as local midnight; new Date('yyyy-mm-dd') would read them as UTC and can shift the day.
export function parseLocalDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value)
  return isNaN(date.getTime()) ? null : date
}

// Whole days from today (local) until the given date; negative when the date has passed
export function daysUntil(value) {
  const date = parseLocalDate(value)
  if (!date) return null
  const today = new Date()
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.round((dateMidnight - todayMidnight) / (1000 * 60 * 60 * 24))
}

// Distinct years of the given date field, newest first
export function getYears(rows, field) {
  const years = rows
    .map((row) => parseLocalDate(row[field])?.getFullYear())
    .filter((year) => year !== undefined)
  return [...new Set(years)].sort((a, b) => b - a)
}

// Whether a date falls in the selected period: 'all', 'year' or 'month'
export function matchesPeriod(value, periodType, year, month) {
  if (periodType === 'all') return true
  const date = parseLocalDate(value)
  if (!date) return false
  if (periodType === 'year') return date.getFullYear() === year
  if (periodType === 'month') return date.getFullYear() === year && date.getMonth() + 1 === month
  return true
}

// Format a date as DD/MM/YYYY
export function formatDate(value) {
  if (!value) return ''
  const date = parseLocalDate(value)
  if (!date) return ''
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

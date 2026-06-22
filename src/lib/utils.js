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

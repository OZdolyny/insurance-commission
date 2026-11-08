// Build CSV text from rows and column definitions: [{ header, value: (row) => any }]
export function toCsv(rows, columns) {
  const escape = (value) => {
    const text = value === null || value === undefined ? '' : String(value)
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const lines = [
    columns.map((column) => escape(column.header)).join(','),
    ...rows.map((row) => columns.map((column) => escape(column.value(row))).join(',')),
  ]
  return lines.join('\r\n')
}

// Save CSV text as a file. The BOM makes Excel open UTF-8 (e.g. Cyrillic names) correctly.
export function downloadCsv(filename, csv) {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

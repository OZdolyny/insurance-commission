import { useEffect, useState } from 'react'
import { getYears, matchesPeriod, parseDateInput, parseLocalDate } from '../lib/utils'

// Period filter state shared by the Dashboard and Commissions pages.
// type: 'all' | 'year' | 'month' | 'custom'
export function usePeriodFilter(rows, field) {
  const now = new Date()
  const [type, setType] = useState('all')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const availableYears = getYears(rows, field)
  const yearsKey = availableYears.join(',')

  // Default to a year that has data (the current year may have none yet)
  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(year)) {
      setYear(availableYears[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearsKey])

  const matches = (row) => {
    if (type !== 'custom') return matchesPeriod(row[field], type, year, month)
    const start = parseDateInput(customStart)
    const end = parseDateInput(customEnd)
    // Ignore the range until both dates are complete and valid
    if (!start || !end) return true
    const date = parseLocalDate(row[field])
    return !!date && date >= parseLocalDate(start) && date <= parseLocalDate(end)
  }

  return {
    type, setType,
    year, setYear,
    month, setMonth,
    customStart, setCustomStart,
    customEnd, setCustomEnd,
    availableYears,
    matches,
  }
}

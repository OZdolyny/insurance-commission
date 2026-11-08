import { useMemo, useState } from 'react'

// Search + sort for a table.
//   searchText(row): text the search box matches against
//   sorters: { key: (row) => comparable value }
export function useTableControls(rows, { searchText, sorters, defaultSort }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState(defaultSort || null) // { key, dir: 'asc' | 'desc' }

  const toggleSort = (key) => {
    setSort((current) =>
      current?.key === key
        ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    )
  }

  const visibleRows = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    let result = words.length
      ? rows.filter((row) => {
          const text = String(searchText(row) || '').toLowerCase()
          return words.every((word) => text.includes(word))
        })
      : rows

    const getValue = sort && sorters[sort.key]
    if (getValue) {
      const factor = sort.dir === 'asc' ? 1 : -1
      result = [...result].sort((a, b) => {
        const av = getValue(a)
        const bv = getValue(b)
        // Empty values stay at the bottom in both directions
        return isEmpty(av) || isEmpty(bv) ? compareValues(av, bv) : compareValues(av, bv) * factor
      })
    }
    return result
    // searchText/sorters are recreated on every render; rows, query and sort decide the result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, sort])

  return { query, setQuery, sort, toggleSort, rows: visibleRows }
}

function isEmpty(value) {
  return value === null || value === undefined || value === ''
}

export function compareValues(a, b) {
  const aEmpty = isEmpty(a)
  const bEmpty = isEmpty(b)
  if (aEmpty || bEmpty) return aEmpty === bEmpty ? 0 : aEmpty ? 1 : -1 // empty values last
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

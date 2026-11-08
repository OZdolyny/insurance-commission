import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Label } from './ui/Label'
import { Select } from './ui/Select'
import { MONTHS, maskDateInput } from '../lib/utils'

const TYPES = [
  { value: 'all', label: 'All Time' },
  { value: 'year', label: 'By Year' },
  { value: 'month', label: 'By Month' },
  { value: 'custom', label: 'Custom' },
]

// Buttons and selects for a usePeriodFilter() state
export function PeriodFilter({ filter, allowCustom = false }) {
  const types = allowCustom ? TYPES : TYPES.filter((t) => t.value !== 'custom')
  const showYear = (filter.type === 'year' || filter.type === 'month') && filter.availableYears.length > 0

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap gap-2">
        {types.map((t) => (
          <Button
            key={t.value}
            variant={filter.type === t.value ? 'default' : 'secondary'}
            size="sm"
            onClick={() => filter.setType(t.value)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {showYear && (
        <div className="flex items-center gap-2">
          <Label className="text-muted-foreground">Year:</Label>
          <Select
            aria-label="Year"
            value={filter.year}
            onChange={(e) => filter.setYear(parseInt(e.target.value))}
            className="w-28"
          >
            {filter.availableYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </Select>
        </div>
      )}

      {filter.type === 'month' && filter.availableYears.length > 0 && (
        <div className="flex items-center gap-2">
          <Label className="text-muted-foreground">Month:</Label>
          <Select
            aria-label="Month"
            value={filter.month}
            onChange={(e) => filter.setMonth(parseInt(e.target.value))}
            className="w-36"
          >
            {MONTHS.map((month, idx) => (
              <option key={month} value={idx + 1}>{month}</option>
            ))}
          </Select>
        </div>
      )}

      {filter.type === 'custom' && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-muted-foreground">From:</Label>
            <Input
              aria-label="From date"
              inputMode="numeric"
              placeholder="dd/mm/yyyy"
              value={filter.customStart}
              onChange={(e) => filter.setCustomStart(maskDateInput(e.target.value))}
              className="w-36"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-muted-foreground">To:</Label>
            <Input
              aria-label="To date"
              inputMode="numeric"
              placeholder="dd/mm/yyyy"
              value={filter.customEnd}
              onChange={(e) => filter.setCustomEnd(maskDateInput(e.target.value))}
              className="w-36"
            />
          </div>
        </div>
      )}
    </div>
  )
}

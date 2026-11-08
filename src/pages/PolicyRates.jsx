import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Select } from '../components/ui/Select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table'
import { Badge } from '../components/ui/Badge'
import { useToast } from '../components/ui/Toast'
import { useConfirm } from '../components/ui/ConfirmDialog'
import { formatDate } from '../lib/utils'
import { formatRate, percentToRate, rateToPercent } from '../lib/commission'
import { friendlyError } from '../lib/errors'
import { Plus, Percent, Pencil, Trash2 } from 'lucide-react'

const emptyForm = {
  insurance_company_code: '',
  insurance_policy_type: '',
  commission_percent: ''
}

function PolicyRates() {
  const toast = useToast()
  const confirm = useConfirm()
  const [policyRates, setPolicyRates] = useState([])
  const [companies, setCompanies] = useState([])
  const [policyTypes, setPolicyTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyForm)

  useEffect(() => {
    fetchData()
    // Load once when the page opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchData = async () => {
    try {
      const [companiesResult, typesResult, ratesResult] = await Promise.all([
        supabase.from('insurance_companies').select('code, name').order('name'),
        supabase.from('insurance_policy_types').select('type, name').order('name'),
        supabase
          .from('insurance_policy_rates')
          .select(`
            *,
            insurance_companies (code, name),
            insurance_policy_types (type, name)
          `)
          .order('created_at', { ascending: false })
      ])

      for (const result of [companiesResult, typesResult, ratesResult]) {
        if (result.error) throw result.error
      }
      setCompanies(companiesResult.data || [])
      setPolicyTypes(typesResult.data || [])
      setPolicyRates(ratesResult.data || [])
    } catch (error) {
      toast.error(friendlyError(error))
    } finally {
      setLoading(false)
    }
  }

  const closeForm = () => {
    setFormData(emptyForm)
    setEditingId(null)
    setShowForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const rate = percentToRate(formData.commission_percent)
    if (rate === null || rate < 0 || rate > 1) {
      toast.error('Enter a commission rate between 0 and 100%.')
      return
    }

    try {
      const { error } = editingId
        ? await supabase.from('insurance_policy_rates').update({ commission_rate: rate }).eq('id', editingId)
        : await supabase.from('insurance_policy_rates').insert([{
            insurance_company_code: formData.insurance_company_code,
            insurance_policy_type: formData.insurance_policy_type,
            commission_rate: rate
          }])

      if (error) throw error

      toast.success(editingId
        ? 'Rate updated. Existing policies keep the rate they were saved with.'
        : 'Commission rate added.')
      closeForm()
      fetchData()
    } catch (error) {
      toast.error(friendlyError(error, {
        duplicate: 'A rate for this company and policy type already exists. Edit that rate instead.'
      }))
    }
  }

  const startEditing = (rate) => {
    setFormData({
      insurance_company_code: rate.insurance_company_code,
      insurance_policy_type: rate.insurance_policy_type,
      commission_percent: rateToPercent(rate.commission_rate)
    })
    setEditingId(rate.id)
    setShowForm(true)
    requestAnimationFrame(() => document.getElementById('rate-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const handleDelete = async (rate) => {
    const ok = await confirm({
      title: `Delete the ${rate.insurance_company_code} / ${rate.insurance_policy_type} rate?`,
      message: 'Existing policies keep their saved rate. New policies for this combination will need a new rate or "No commission".',
      confirmLabel: 'Delete',
      destructive: true
    })
    if (!ok) return

    try {
      const { error } = await supabase.from('insurance_policy_rates').delete().eq('id', rate.id)
      if (error) throw error
      toast.success('Rate deleted.')
      if (editingId === rate.id) closeForm()
      fetchData()
    } catch (error) {
      toast.error(friendlyError(error))
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading policy rates...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Commission Rate List</h2>
          <p className="text-sm text-muted-foreground">{policyRates.length} commission rates configured</p>
        </div>
        <Button onClick={() => (showForm ? closeForm() : setShowForm(true))}>
          <Plus className="h-4 w-4" />
          Add Rate
        </Button>
      </div>

      {/* Add / Edit Rate Form */}
      {showForm && (
        <Card id="rate-form">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Commission Rate' : 'Add New Commission Rate'}</CardTitle>
            <CardDescription>
              {editingId
                ? 'Changing a rate affects new policies only. Existing policies keep the rate they were saved with.'
                : 'Set a commission rate for a company and policy type combination'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="insurance_company_code">Insurance Company *</Label>
                <Select
                  id="insurance_company_code"
                  name="insurance_company_code"
                  value={formData.insurance_company_code}
                  onChange={handleChange}
                  disabled={!!editingId}
                  required
                >
                  <option value="">Select a company</option>
                  {companies.map((company) => (
                    <option key={company.code} value={company.code}>
                      {company.code} - {company.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="insurance_policy_type">Policy Type *</Label>
                <Select
                  id="insurance_policy_type"
                  name="insurance_policy_type"
                  value={formData.insurance_policy_type}
                  onChange={handleChange}
                  disabled={!!editingId}
                  required
                >
                  <option value="">Select a policy type</option>
                  {policyTypes.map((type) => (
                    <option key={type.type} value={type.type}>
                      {type.type} - {type.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="commission_percent">Commission Rate (%) *</Label>
                <div className="relative max-w-xs">
                  <Input
                    id="commission_percent"
                    name="commission_percent"
                    type="number"
                    inputMode="decimal"
                    value={formData.commission_percent}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="e.g., 15"
                    className="pr-8"
                    required
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
              </div>

              <div className="flex gap-2 md:col-span-2">
                <Button type="submit">{editingId ? 'Save Changes' : 'Add Rate'}</Button>
                <Button type="button" variant="secondary" onClick={closeForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Rates Table */}
      {policyRates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Percent className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No commission rates yet. Add your first rate above!</p>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Policy Type</TableHead>
              <TableHead>Commission Rate</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {policyRates.map((rate) => (
              <TableRow key={rate.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-muted px-2 py-1 font-mono text-xs font-medium">
                      {rate.insurance_companies?.code}
                    </span>
                    <span className="font-medium">{rate.insurance_companies?.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-muted px-2 py-1 font-mono text-xs font-medium">
                      {rate.insurance_policy_types?.type}
                    </span>
                    <span>{rate.insurance_policy_types?.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="success">{formatRate(rate.commission_rate)}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(rate.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" aria-label="Edit rate" onClick={() => startEditing(rate)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Delete rate" onClick={() => handleDelete(rate)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

export default PolicyRates

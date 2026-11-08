import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Select } from '../components/ui/Select'
import { Badge } from '../components/ui/Badge'
import { SearchInput } from '../components/ui/SearchInput'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, SortableTableHead } from '../components/ui/Table'
import { useToast } from '../components/ui/Toast'
import { useConfirm } from '../components/ui/ConfirmDialog'
import { useTableControls } from '../hooks/useTableControls'
import { daysUntil, formatAmount, formatDate, formatDateInput, maskDateInput } from '../lib/utils'
import { calculateCommission, formatRate } from '../lib/commission'
import { buildPolicyData } from '../lib/policyForm'
import { friendlyError } from '../lib/errors'
import { PolicyImportDialog } from '../components/PolicyImportDialog'
import { Plus, AlertCircle, FileText, Pencil, Trash2, X, Upload } from 'lucide-react'

// Client fields the policy form and the PDF import (client matching) need
const CLIENT_COLUMNS = 'id, first_name, last_name, father_name, phone_number, email'

const emptyForm = {
  client_id: '',
  insurance_company_code: '',
  insurance_policy_type: '',
  amount: '',
  paid_amount: '',
  start_date: '',
  end_date: '',
  policy_number: '',
  comment: '',
  no_commission: false
}

const EXPIRY_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'expiring-30', label: 'Expiring in 30 days', maxDays: 30 },
  { value: 'expiring-60', label: 'Expiring in 60 days', maxDays: 60 },
  { value: 'expiring-90', label: 'Expiring in 90 days', maxDays: 90 },
  { value: 'expired', label: 'Expired' },
]

const clientName = (p) => `${p.clients?.first_name || ''} ${p.clients?.last_name || ''}`.trim()

const sorters = {
  client: clientName,
  company: (p) => p.insurance_company_code,
  type: (p) => p.insurance_policy_type,
  amount: (p) => parseFloat(p.amount),
  commission: (p) => parseFloat(p.commission_amount),
  start: (p) => p.start_date,
  end: (p) => p.end_date,
}

function Policies({ params = {}, navigate }) {
  const toast = useToast()
  const confirm = useConfirm()
  const clientFilter = params.client ? Number(params.client) : null

  const [policies, setPolicies] = useState([])
  const [clients, setClients] = useState([])
  const [companies, setCompanies] = useState([])
  const [policyTypes, setPolicyTypes] = useState([])
  const [policyRates, setPolicyRates] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [expirationFilter, setExpirationFilter] = useState('all')
  const [formData, setFormData] = useState(emptyForm)
  const [importFile, setImportFile] = useState(null)
  const fileInputRef = useRef(null)
  // Rate the policy being edited was saved with, so editing keeps it instead of picking up today's rate
  const [originalRate, setOriginalRate] = useState(null)

  useEffect(() => {
    fetchData()
    // Load once when the page opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentTableRate = policyRates.find(
    r => r.insurance_company_code === formData.insurance_company_code &&
         r.insurance_policy_type === formData.insurance_policy_type
  ) || null

  const keepsOriginalRate = !!originalRate &&
    originalRate.insurance_company_code === formData.insurance_company_code &&
    originalRate.insurance_policy_type === formData.insurance_policy_type

  const selectedRate = !formData.insurance_company_code || !formData.insurance_policy_type
    ? null
    : keepsOriginalRate ? originalRate : currentTableRate

  // After the import dialog adds or edits a client
  const reloadClients = async () => {
    const { data, error } = await supabase.from('clients').select(CLIENT_COLUMNS).order('first_name')
    if (!error) setClients(data || [])
  }

  const fetchData = async () => {
    try {
      const results = await Promise.all([
        supabase.from('clients').select(CLIENT_COLUMNS).order('first_name'),
        supabase.from('insurance_companies').select('code, name').order('name'),
        supabase.from('insurance_policy_types').select('type, name').order('name'),
        supabase.from('insurance_policy_rates').select('*'),
        supabase
          .from('client_policies')
          .select(`
            *,
            clients (id, first_name, last_name),
            insurance_companies (code, name),
            insurance_policy_types (type, name)
          `)
          .order('created_at', { ascending: false })
      ])

      const failed = results.find((result) => result.error)
      if (failed) throw failed.error

      const [clientsResult, companiesResult, typesResult, ratesResult, policiesResult] = results
      setClients(clientsResult.data || [])
      setCompanies(companiesResult.data || [])
      setPolicyTypes(typesResult.data || [])
      setPolicyRates(ratesResult.data || [])
      setPolicies(policiesResult.data || [])
    } catch (error) {
      toast.error(friendlyError(error))
    } finally {
      setLoading(false)
    }
  }

  const commission = calculateCommission({
    amount: formData.amount,
    paidAmount: formData.paid_amount,
    rate: selectedRate?.commission_rate,
    noCommission: formData.no_commission
  })

  const paidTooHigh = formData.amount !== '' && formData.paid_amount !== '' &&
    parseFloat(formData.paid_amount) > parseFloat(formData.amount)

  const handleSubmit = async (e) => {
    e.preventDefault()

    const { error: validationError, data: policyData } = buildPolicyData(formData, { selectedRate, isNew: !editingId })
    if (validationError) {
      toast.error(validationError)
      return
    }

    try {
      const { error } = editingId
        ? await supabase.from('client_policies').update(policyData).eq('id', editingId)
        : await supabase.from('client_policies').insert([policyData])

      if (error) throw error
      toast.success(editingId ? 'Policy updated.' : 'Policy added.')
      resetForm()
      fetchData()
    } catch (error) {
      toast.error(friendlyError(error))
    }
  }

  const openNewForm = () => {
    setFormData({ ...emptyForm, client_id: clientFilter ? String(clientFilter) : '' })
    setShowForm(true)
  }

  const handleEdit = (policy) => {
    setFormData({
      client_id: policy.client_id.toString(),
      insurance_company_code: policy.insurance_company_code,
      insurance_policy_type: policy.insurance_policy_type,
      amount: policy.amount.toString(),
      paid_amount: policy.paid_amount.toString(),
      start_date: formatDateInput(policy.start_date),
      end_date: policy.end_date ? formatDateInput(policy.end_date) : '',
      policy_number: policy.policy_number || '',
      comment: policy.comment || '',
      no_commission: policy.no_commission || false
    })
    // Policies saved with "No commission" have rate 0, so there is no original rate worth keeping
    setOriginalRate(policy.no_commission ? null : {
      insurance_company_code: policy.insurance_company_code,
      insurance_policy_type: policy.insurance_policy_type,
      commission_rate: policy.commission_rate
    })
    setEditingId(policy.id)
    setShowForm(true)
    requestAnimationFrame(() => document.getElementById('policy-edit-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const handleDelete = async (policy) => {
    const ok = await confirm({
      title: 'Delete this policy?',
      message: `${clientName(policy)} · ${policy.insurance_company_code} ${policy.insurance_policy_type} · ${formatAmount(policy.amount)}. Its commission record is deleted too. This cannot be undone.`,
      confirmLabel: 'Delete policy',
      destructive: true
    })
    if (!ok) return

    try {
      const { error } = await supabase.from('client_policies').delete().eq('id', policy.id)
      if (error) throw error
      toast.success('Policy deleted.')
      if (editingId === policy.id) resetForm()
      fetchData()
    } catch (error) {
      toast.error(friendlyError(error))
    }
  }

  const resetForm = () => {
    setFormData(emptyForm)
    setEditingId(null)
    setOriginalRate(null)
    setShowForm(false)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const matchesExpiry = (policy) => {
    if (expirationFilter === 'all') return true
    if (!policy.end_date) return false
    const days = daysUntil(policy.end_date)
    if (expirationFilter === 'expired') return days < 0
    const { maxDays } = EXPIRY_FILTERS.find((f) => f.value === expirationFilter)
    return days >= 0 && days <= maxDays
  }

  const scopedPolicies = policies.filter((p) =>
    (!clientFilter || p.client_id === clientFilter) && matchesExpiry(p)
  )

  const table = useTableControls(scopedPolicies, {
    searchText: (p) => [
      clientName(p), p.policy_number, p.comment,
      p.insurance_company_code, p.insurance_companies?.name,
      p.insurance_policy_type, p.insurance_policy_types?.name,
    ].join(' '),
    sorters,
    defaultSort: { key: 'start', dir: 'desc' },
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading policies...</div>
      </div>
    )
  }

  const filteredClient = clientFilter ? clients.find((c) => c.id === clientFilter) : null
  const clientPolicyCount = clientFilter ? policies.filter((p) => p.client_id === clientFilter).length : policies.length
  const sortProps = { sort: table.sort, onSort: table.toggleSort }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {filteredClient ? `Policies of ${filteredClient.first_name} ${filteredClient.last_name}` : 'Policy List'}
          </h2>
          <p className="text-sm text-muted-foreground">{table.rows.length} policies</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <SearchInput value={table.query} onChange={table.setQuery} placeholder="Search policies" />
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Upload PDF
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf,.p7s,application/pkcs7-mime"
            className="hidden"
            aria-label="Upload policy PDF"
            onChange={(e) => {
              setImportFile(e.target.files?.[0] || null)
              e.target.value = '' // allow choosing the same file again
            }}
          />
          {!showForm && (
            <Button onClick={openNewForm}>
              <Plus className="h-4 w-4" />
              Add Policy
            </Button>
          )}
        </div>
      </div>

      {importFile && (
        <PolicyImportDialog
          file={importFile}
          onClose={() => setImportFile(null)}
          onSaved={() => {
            setImportFile(null)
            fetchData()
          }}
          clients={clients}
          companies={companies}
          policyTypes={policyTypes}
          policyRates={policyRates}
          policies={policies}
          reloadClients={reloadClients}
        />
      )}

      {clientFilter && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary" className="gap-1 py-1">
            Client: {filteredClient ? `${filteredClient.first_name} ${filteredClient.last_name}` : `#${clientFilter}`}
            <button type="button" aria-label="Show all clients" onClick={() => navigate('policies')} className="ml-1 hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </Badge>
          <Button variant="link" size="sm" className="h-auto p-0" onClick={() => navigate('clients')}>
            Back to clients
          </Button>
        </div>
      )}

      {/* Add/Edit Policy Form */}
      {showForm && (
        <Card id="policy-edit-form">
          <CardHeader>
            <CardTitle>{editingId ? 'Update Policy' : 'Add New Policy'}</CardTitle>
            <CardDescription>Enter the policy details. Commission will be auto-calculated.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="client_id">Client *</Label>
                  <Select
                    id="client_id"
                    name="client_id"
                    value={formData.client_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select a client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.first_name} {client.last_name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="policy_number">Policy Number</Label>
                  <Input
                    id="policy_number"
                    name="policy_number"
                    value={formData.policy_number}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="insurance_company_code">Insurance Company *</Label>
                  <Select
                    id="insurance_company_code"
                    name="insurance_company_code"
                    value={formData.insurance_company_code}
                    onChange={handleChange}
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
              </div>

              {/* Commission Rate Info */}
              {selectedRate && !formData.no_commission && (
                <div className="rounded-lg border border-border bg-muted p-3">
                  <span className="text-sm text-muted-foreground">Commission Rate: </span>
                  <Badge variant="success">{formatRate(selectedRate.commission_rate)}</Badge>
                  {keepsOriginalRate && currentTableRate &&
                    parseFloat(currentTableRate.commission_rate) !== parseFloat(originalRate.commission_rate) && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>Saved rate kept. Current rate is {formatRate(currentTableRate.commission_rate)}.</span>
                      <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setOriginalRate(null)}>
                        Use current rate
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {formData.insurance_company_code && formData.insurance_policy_type && !selectedRate && !formData.no_commission && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  No commission rate found for this combination. Add a rate on the Rates page first or tick &quot;No commission&quot;.
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="amount">Policy Amount *</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    value={formData.amount}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paid_amount">Paid Amount *</Label>
                  <Input
                    id="paid_amount"
                    name="paid_amount"
                    type="number"
                    value={formData.paid_amount}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>

              {paidTooHigh && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Paid amount cannot be more than the policy amount.
                </div>
              )}

              {/* Commission Calculation Preview */}
              {formData.amount && formData.paid_amount && (
                <div className="space-y-2 rounded-lg border border-border bg-muted p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount:</span>
                    <span>{formatAmount(parseFloat(formData.amount) - parseFloat(formData.paid_amount))}</span>
                  </div>
                  {selectedRate && !formData.no_commission && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Full Commission:</span>
                        <span>{formatAmount(parseFloat(formData.amount) * parseFloat(selectedRate.commission_rate))}</span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-2 font-medium text-success">
                        <span>Your Commission:</span>
                        <span>{formatAmount(commission)}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* No Commission Checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="no_commission"
                  name="no_commission"
                  checked={formData.no_commission}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="no_commission" className="font-normal text-muted-foreground">
                  Set Commission as 0 (No commission for this policy)
                </Label>
              </div>

              {formData.no_commission && (
                <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm text-warning">
                  Commission set to 0.00 (No commission)
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="comment">Comment</Label>
                <textarea
                  id="comment"
                  name="comment"
                  value={formData.comment}
                  onChange={handleChange}
                  rows={3}
                  className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Add a note about this policy"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    name="start_date"
                    type="text"
                    inputMode="numeric"
                    placeholder="dd/mm/yyyy"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: maskDateInput(e.target.value) })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    name="end_date"
                    type="text"
                    inputMode="numeric"
                    placeholder="dd/mm/yyyy"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: maskDateInput(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">{editingId ? 'Update Policy' : 'Add Policy'}</Button>
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Expiration Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Filter:</span>
            {EXPIRY_FILTERS.map((filter) => (
              <Button
                key={filter.value}
                variant={expirationFilter === filter.value ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setExpirationFilter(filter.value)}
              >
                {filter.value === 'all' ? `All (${clientPolicyCount})` : filter.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Policies Table */}
      {table.rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No policies found with the selected filters.</p>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead sortKey="client" {...sortProps}>Client</SortableTableHead>
              <SortableTableHead sortKey="company" {...sortProps}>Company</SortableTableHead>
              <SortableTableHead sortKey="type" {...sortProps}>Type</SortableTableHead>
              <SortableTableHead sortKey="amount" {...sortProps}>Amount</SortableTableHead>
              <SortableTableHead sortKey="commission" {...sortProps}>Commission</SortableTableHead>
              <SortableTableHead sortKey="end" {...sortProps}>Dates</SortableTableHead>
              <TableHead>Comment</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.rows.map((policy) => {
              const daysUntilExpiry = policy.end_date ? daysUntil(policy.end_date) : null

              return (
                <TableRow key={policy.id}>
                  <TableCell className="font-medium">
                    {clientName(policy)}
                    {policy.policy_number && (
                      <div className="text-xs font-normal text-muted-foreground">#{policy.policy_number}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                        {policy.insurance_companies?.code}
                      </span>
                      <span className="text-sm text-muted-foreground">{policy.insurance_companies?.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {policy.insurance_policy_types?.type}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="font-medium">{formatAmount(policy.amount)}</div>
                      <div className="text-xs text-muted-foreground">
                        Paid: {formatAmount(policy.paid_amount)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {policy.no_commission ? (
                      <span className="text-muted-foreground">No Commission</span>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="font-medium text-success">
                          {formatAmount(policy.commission_amount)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatRate(policy.commission_rate)}
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5 text-sm">
                      <div>{formatDate(policy.start_date)}</div>
                      {policy.end_date && (
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">
                            {formatDate(policy.end_date)}
                          </span>
                          {daysUntilExpiry !== null && (
                            <Badge variant={daysUntilExpiry < 0 ? 'error' : daysUntilExpiry <= 30 ? 'warning' : 'secondary'}>
                              {daysUntilExpiry < 0 ? 'Expired' : `${daysUntilExpiry}d left`}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate text-muted-foreground" title={policy.comment || undefined}>
                    {policy.comment || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" aria-label="Edit policy" onClick={() => handleEdit(policy)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Delete policy" onClick={() => handleDelete(policy)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

export default Policies

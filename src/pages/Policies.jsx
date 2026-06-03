import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Select } from '../components/ui/Select'
import { Badge } from '../components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table'
import { Plus, AlertCircle, CheckCircle2, FileText, Pencil, Trash2 } from 'lucide-react'

function Policies() {
  const [policies, setPolicies] = useState([])
  const [clients, setClients] = useState([])
  const [companies, setCompanies] = useState([])
  const [policyTypes, setPolicyTypes] = useState([])
  const [policyRates, setPolicyRates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [expirationFilter, setExpirationFilter] = useState('all')
  
  const [formData, setFormData] = useState({
    client_id: '',
    insurance_company_code: '',
    insurance_policy_type: '',
    amount: '',
    paid_amount: '',
    start_date: '',
    end_date: '',
    policy_number: '',
    no_commission: false
  })

  const [selectedRate, setSelectedRate] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (formData.insurance_company_code && formData.insurance_policy_type) {
      const rate = policyRates.find(
        r => r.insurance_company_code === formData.insurance_company_code && 
             r.insurance_policy_type === formData.insurance_policy_type
      )
      setSelectedRate(rate || null)
    } else {
      setSelectedRate(null)
    }
  }, [formData.insurance_company_code, formData.insurance_policy_type, policyRates])

  const fetchData = async () => {
    try {
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .order('first_name')

      if (clientsError) throw clientsError
      setClients(clientsData || [])

      const { data: companiesData, error: companiesError } = await supabase
        .from('insurance_companies')
        .select('code, name')
        .order('name')

      if (companiesError) throw companiesError
      setCompanies(companiesData || [])

      const { data: typesData, error: typesError } = await supabase
        .from('insurance_policy_types')
        .select('type, name')
        .order('name')

      if (typesError) throw typesError
      setPolicyTypes(typesData || [])

      const { data: ratesData, error: ratesError } = await supabase
        .from('insurance_policy_rates')
        .select('*')

      if (ratesError) throw ratesError
      setPolicyRates(ratesData || [])

      const { data: policiesData, error: policiesError } = await supabase
        .from('client_policies')
        .select(`
          *,
          clients (id, first_name, last_name),
          insurance_companies (code, name),
          insurance_policy_types (type, name)
        `)
        .order('created_at', { ascending: false })

      if (policiesError) throw policiesError
      setPolicies(policiesData || [])
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!selectedRate && !formData.no_commission) {
      setError('No commission rate found for this company and policy type combination. Please add a rate first or check "No Commission".')
      return
    }

    try {
      const commissionAmount = calculateCommission()

      const policyData = {
        client_id: parseInt(formData.client_id),
        insurance_company_code: formData.insurance_company_code,
        insurance_policy_type: formData.insurance_policy_type,
        amount: parseFloat(formData.amount),
        paid_amount: parseFloat(formData.paid_amount),
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        policy_number: formData.policy_number || null,
        commission_rate: formData.no_commission ? 0 : parseFloat(selectedRate.commission_rate),
        commission_amount: commissionAmount,
        no_commission: formData.no_commission,
        payment_status: 'pending'
      }

      if (editingId) {
        const { error } = await supabase
          .from('client_policies')
          .update(policyData)
          .eq('id', editingId)

        if (error) throw error
        setSuccess('Policy updated successfully!')
        setEditingId(null)
      } else {
        const { error } = await supabase
          .from('client_policies')
          .insert([policyData])

        if (error) throw error
        setSuccess('Policy added successfully!')
      }

      resetForm()
      fetchData()
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      setError(error.message)
    }
  }

  const handleEdit = (policy) => {
    setFormData({
      client_id: policy.client_id.toString(),
      insurance_company_code: policy.insurance_company_code,
      insurance_policy_type: policy.insurance_policy_type,
      amount: policy.amount.toString(),
      paid_amount: policy.paid_amount.toString(),
      start_date: policy.start_date,
      end_date: policy.end_date || '',
      policy_number: policy.policy_number || '',
      no_commission: policy.no_commission || false
    })
    setEditingId(policy.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this policy?')) return

    try {
      const { error } = await supabase
        .from('client_policies')
        .delete()
        .eq('id', id)

      if (error) throw error
      setSuccess('Policy deleted successfully!')
      fetchData()
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      setError(error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      client_id: '',
      insurance_company_code: '',
      insurance_policy_type: '',
      amount: '',
      paid_amount: '',
      start_date: '',
      end_date: '',
      policy_number: '',
      no_commission: false
    })
    setEditingId(null)
    setSelectedRate(null)
    setShowForm(false)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const calculateCommission = () => {
    if (formData.no_commission) return 0
    if (!formData.amount || !formData.paid_amount || !selectedRate) return 0
    
    const policyAmount = parseFloat(formData.amount)
    const paidAmount = parseFloat(formData.paid_amount)
    const discount = policyAmount - paidAmount
    
    const fullCommission = policyAmount * parseFloat(selectedRate.commission_rate)
    const finalCommission = fullCommission - discount
    
    return Math.max(0, finalCommission)
  }

  const getFilteredPolicies = () => {
    const today = new Date()
    
    return policies.filter(policy => {
      if (expirationFilter === 'all') return true
      if (!policy.end_date) return false
      
      const endDate = new Date(policy.end_date)
      const daysUntilExpiry = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24))
      
      switch (expirationFilter) {
        case 'expired':
          return daysUntilExpiry < 0
        case 'expiring-30':
          return daysUntilExpiry >= 0 && daysUntilExpiry <= 30
        case 'expiring-60':
          return daysUntilExpiry >= 0 && daysUntilExpiry <= 60
        case 'expiring-90':
          return daysUntilExpiry >= 0 && daysUntilExpiry <= 90
        default:
          return true
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading policies...</div>
      </div>
    )
  }

  const filteredPolicies = getFilteredPolicies()

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-success/50 bg-success/10 p-4 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          {success}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{editingId ? 'Edit Policy' : 'Policy List'}</h2>
          <p className="text-sm text-muted-foreground">{filteredPolicies.length} policies</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Add Policy
          </Button>
        )}
      </div>

      {/* Add/Edit Policy Form */}
      {showForm && (
        <Card>
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
                  <Badge variant="success">{(parseFloat(selectedRate.commission_rate) * 100).toFixed(2)}%</Badge>
                </div>
              )}

              {formData.insurance_company_code && formData.insurance_policy_type && !selectedRate && !formData.no_commission && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  No commission rate found for this combination. Please add a rate in the Rates section first or check &quot;No Commission&quot;.
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="amount">Policy Amount ($) *</Label>
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
                  <Label htmlFor="paid_amount">Paid Amount ($) *</Label>
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

              {/* Commission Calculation Preview */}
              {formData.amount && formData.paid_amount && (
                <div className="rounded-lg border border-border bg-muted p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount:</span>
                    <span>${(parseFloat(formData.amount) - parseFloat(formData.paid_amount)).toFixed(2)}</span>
                  </div>
                  {selectedRate && !formData.no_commission && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Full Commission:</span>
                        <span>${(parseFloat(formData.amount) * parseFloat(selectedRate.commission_rate)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium text-success pt-2 border-t border-border">
                        <span>Your Commission:</span>
                        <span>${calculateCommission().toFixed(2)}</span>
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
                  Set Commission as $0 (No commission for this policy)
                </Label>
              </div>

              {formData.no_commission && (
                <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm text-warning">
                  Commission set to $0.00 (No commission)
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    name="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    name="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={handleChange}
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
            {[
              { value: 'all', label: `All (${policies.length})` },
              { value: 'expiring-30', label: 'Expiring in 30 days' },
              { value: 'expiring-60', label: 'Expiring in 60 days' },
              { value: 'expiring-90', label: 'Expiring in 90 days' },
              { value: 'expired', label: 'Expired' },
            ].map((filter) => (
              <Button
                key={filter.value}
                variant={expirationFilter === filter.value ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setExpirationFilter(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Policies Table */}
      {filteredPolicies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No policies found with the selected filter.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPolicies.map((policy) => {
                const daysUntilExpiry = policy.end_date 
                  ? Math.ceil((new Date(policy.end_date) - new Date()) / (1000 * 60 * 60 * 24))
                  : null
                
                return (
                  <TableRow key={policy.id}>
                    <TableCell className="font-medium">
                      {policy.clients?.first_name} {policy.clients?.last_name}
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
                        <div className="font-medium">${parseFloat(policy.amount).toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">
                          Paid: ${parseFloat(policy.paid_amount).toFixed(2)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {policy.no_commission ? (
                        <span className="text-muted-foreground">No Commission</span>
                      ) : (
                        <div className="space-y-0.5">
                          <div className="font-medium text-success">
                            ${parseFloat(policy.commission_amount).toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(parseFloat(policy.commission_rate) * 100).toFixed(2)}%
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5 text-sm">
                        <div>{new Date(policy.start_date).toLocaleDateString()}</div>
                        {policy.end_date && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">
                              {new Date(policy.end_date).toLocaleDateString()}
                            </span>
                            {daysUntilExpiry !== null && (
                              <Badge variant={daysUntilExpiry < 0 ? 'error' : daysUntilExpiry <= 30 ? 'warning' : 'secondary'}>
                                {daysUntilExpiry < 0 
                                  ? `Expired` 
                                  : `${daysUntilExpiry}d left`
                                }
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(policy)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(policy.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

export default Policies

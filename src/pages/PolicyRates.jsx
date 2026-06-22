import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Select } from '../components/ui/Select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table'
import { Badge } from '../components/ui/Badge'
import { formatDate } from '../lib/utils'
import { Plus, AlertCircle, CheckCircle2, Percent } from 'lucide-react'

function PolicyRates() {
  const [policyRates, setPolicyRates] = useState([])
  const [companies, setCompanies] = useState([])
  const [policyTypes, setPolicyTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showForm, setShowForm] = useState(false)
  
  const [formData, setFormData] = useState({
    insurance_company_code: '',
    insurance_policy_type: '',
    commission_rate: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
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
        .select(`
          *,
          insurance_companies (code, name),
          insurance_policy_types (type, name)
        `)
        .order('created_at', { ascending: false })

      if (ratesError) throw ratesError
      setPolicyRates(ratesData || [])
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

    try {
      const { error } = await supabase
        .from('insurance_policy_rates')
        .insert([formData])

      if (error) throw error

      setSuccess('Commission rate added successfully!')
      setFormData({
        insurance_company_code: '',
        insurance_policy_type: '',
        commission_rate: ''
      })
      setShowForm(false)
      fetchData()
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      if (error.code === '23505') {
        setError('A rate for this company and policy type combination already exists')
      } else {
        setError(error.message)
      }
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
      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-success/50 bg-success/10 p-4 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          {success}
        </div>
      )}

      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Commission Rate List</h2>
          <p className="text-sm text-muted-foreground">{policyRates.length} commission rates configured</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Add Rate
        </Button>
      </div>

      {/* Add Rate Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Commission Rate</CardTitle>
            <CardDescription>Set a commission rate for a company and policy type combination</CardDescription>
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

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="commission_rate">Commission Rate (as decimal) *</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="commission_rate"
                    name="commission_rate"
                    type="number"
                    value={formData.commission_rate}
                    onChange={handleChange}
                    step="0.0001"
                    min="0"
                    max="1"
                    placeholder="e.g., 0.15 for 15%"
                    className="max-w-xs"
                    required
                  />
                  {formData.commission_rate && (
                    <Badge variant="success">
                      = {(parseFloat(formData.commission_rate) * 100).toFixed(2)}%
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex gap-2 md:col-span-2">
                <Button type="submit">Add Rate</Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
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
                  <Badge variant="success">
                    {(parseFloat(rate.commission_rate) * 100).toFixed(2)}%
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(rate.created_at)}
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

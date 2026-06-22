import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table'
import { formatDate } from '../lib/utils'
import { Plus, AlertCircle, CheckCircle2, Building2 } from 'lucide-react'

function Companies() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showForm, setShowForm] = useState(false)
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    manager_name: '',
    manager_email: '',
    manager_phone: ''
  })

  useEffect(() => {
    fetchCompanies()
  }, [])

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('insurance_companies')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCompanies(data || [])
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

    if (formData.code.length !== 3) {
      setError('Code must be exactly 3 characters')
      return
    }

    try {
      const { error } = await supabase
        .from('insurance_companies')
        .insert([{
          ...formData,
          code: formData.code.toUpperCase()
        }])

      if (error) throw error

      setSuccess('Insurance company added successfully!')
      setFormData({
        code: '',
        name: '',
        address: '',
        manager_name: '',
        manager_email: '',
        manager_phone: ''
      })
      setShowForm(false)
      fetchCompanies()
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      if (error.code === '23505') {
        setError('A company with this code already exists')
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
        <div className="text-muted-foreground">Loading insurance companies...</div>
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
          <h2 className="text-lg font-semibold">Company List</h2>
          <p className="text-sm text-muted-foreground">{companies.length} insurance companies</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Add Company
        </Button>
      </div>

      {/* Add Company Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Insurance Company</CardTitle>
            <CardDescription>Enter the company&apos;s information below</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="code">Code (3 characters) *</Label>
                <Input
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  maxLength="3"
                  className="uppercase"
                  placeholder="e.g., AXA"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="2"
                  className="flex min-h-[60px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manager_name">Manager Name</Label>
                <Input
                  id="manager_name"
                  name="manager_name"
                  value={formData.manager_name}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manager_email">Manager Email</Label>
                <Input
                  id="manager_email"
                  name="manager_email"
                  type="email"
                  value={formData.manager_email}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manager_phone">Manager Phone</Label>
                <Input
                  id="manager_phone"
                  name="manager_phone"
                  type="tel"
                  value={formData.manager_phone}
                  onChange={handleChange}
                />
              </div>

              <div className="flex gap-2 md:col-span-2">
                <Button type="submit">Add Company</Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Companies Table */}
      {companies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No insurance companies yet. Add your first company above!</p>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company.code}>
                <TableCell>
                  <span className="rounded bg-muted px-2 py-1 font-mono text-sm font-medium">
                    {company.code}
                  </span>
                </TableCell>
                <TableCell className="font-medium">{company.name}</TableCell>
                <TableCell className="text-muted-foreground">{company.manager_name || '-'}</TableCell>
                <TableCell>
                  {company.manager_email && (
                    <div className="text-sm">{company.manager_email}</div>
                  )}
                  {company.manager_phone && (
                    <div className="text-sm text-muted-foreground">{company.manager_phone}</div>
                  )}
                  {!company.manager_email && !company.manager_phone && (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(company.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

export default Companies

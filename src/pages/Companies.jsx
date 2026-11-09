import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Textarea } from '../components/ui/Textarea'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table'
import { useToast } from '../components/ui/Toast'
import { useConfirm } from '../components/ui/ConfirmDialog'
import { formatDate } from '../lib/utils'
import { friendlyError } from '../lib/errors'
import { Plus, Building2, Pencil, Trash2 } from 'lucide-react'

const emptyForm = {
  code: '',
  name: '',
  address: '',
  manager_name: '',
  manager_email: '',
  manager_phone: ''
}

function Companies() {
  const toast = useToast()
  const confirm = useConfirm()
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCode, setEditingCode] = useState(null)
  const [formData, setFormData] = useState(emptyForm)

  useEffect(() => {
    fetchCompanies()
    // Load once when the page opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      toast.error(friendlyError(error))
    } finally {
      setLoading(false)
    }
  }

  const closeForm = () => {
    setFormData(emptyForm)
    setEditingCode(null)
    setShowForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const code = formData.code.trim().toUpperCase()
    if (code.length !== 3) {
      toast.error('Code must be exactly 3 characters.')
      return
    }

    try {
      const { code: _code, ...details } = formData
      const { error } = editingCode
        ? await supabase.from('insurance_companies').update(details).eq('code', editingCode)
        : await supabase.from('insurance_companies').insert([{ ...formData, code }])

      if (error) throw error

      toast.success(editingCode ? 'Company updated.' : 'Insurance company added.')
      closeForm()
      fetchCompanies()
    } catch (error) {
      toast.error(friendlyError(error, { duplicate: 'A company with this code already exists.' }))
    }
  }

  const startEditing = (company) => {
    setFormData({
      code: company.code,
      name: company.name || '',
      address: company.address || '',
      manager_name: company.manager_name || '',
      manager_email: company.manager_email || '',
      manager_phone: company.manager_phone || ''
    })
    setEditingCode(company.code)
    setShowForm(true)
    requestAnimationFrame(() => document.getElementById('company-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const handleDelete = async (company) => {
    const ok = await confirm({
      title: `Delete ${company.code} - ${company.name}?`,
      message: 'Its commission rates are deleted too. Companies that have policies cannot be deleted.',
      confirmLabel: 'Delete',
      destructive: true
    })
    if (!ok) return

    try {
      const { error } = await supabase.from('insurance_companies').delete().eq('code', company.code)
      if (error) throw error
      toast.success('Company deleted.')
      if (editingCode === company.code) closeForm()
      fetchCompanies()
    } catch (error) {
      toast.error(friendlyError(error, {
        inUse: `${company.code} has policies, so it cannot be deleted. Delete or move those policies first.`
      }))
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
      {/* Header with Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Company List</h2>
          <p className="text-sm text-muted-foreground">{companies.length} insurance companies</p>
        </div>
        <Button onClick={() => (showForm ? closeForm() : setShowForm(true))}>
          <Plus className="h-4 w-4" />
          Add Company
        </Button>
      </div>

      {/* Add / Edit Company Form */}
      {showForm && (
        <Card id="company-form">
          <CardHeader>
            <CardTitle>{editingCode ? `Edit ${editingCode}` : 'Add New Insurance Company'}</CardTitle>
            <CardDescription>
              {editingCode ? 'The code cannot be changed because policies refer to it.' : 'Enter the company’s information below'}
            </CardDescription>
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
                  disabled={!!editingCode}
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
                <Textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="2"
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
                <Button type="submit">{editingCode ? 'Save Changes' : 'Add Company'}</Button>
                <Button type="button" variant="secondary" onClick={closeForm}>
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
              <TableHead className="text-right">Actions</TableHead>
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
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" aria-label={`Edit ${company.code}`} onClick={() => startEditing(company)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${company.code}`} onClick={() => handleDelete(company)}>
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

export default Companies

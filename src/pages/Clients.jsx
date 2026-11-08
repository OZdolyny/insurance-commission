import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { SearchInput } from '../components/ui/SearchInput'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, SortableTableHead } from '../components/ui/Table'
import { useToast } from '../components/ui/Toast'
import { useTableControls } from '../hooks/useTableControls'
import { formatDate, formatPhoneNumber } from '../lib/utils'
import { friendlyError } from '../lib/errors'
import { Plus, Pencil, FileText } from 'lucide-react'

const emptyForm = {
  first_name: '',
  last_name: '',
  father_name: '',
  phone_number: '',
  email: '',
  comment: ''
}

const policyCount = (client) => client.client_policies?.[0]?.count ?? 0

const sorters = {
  id: (c) => c.id,
  name: (c) => `${c.first_name} ${c.last_name}`,
  phone: (c) => c.phone_number,
  email: (c) => c.email,
  policies: policyCount,
  added: (c) => c.created_at,
}

function Clients({ navigate }) {
  const toast = useToast()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingClientId, setEditingClientId] = useState(null)
  const [formData, setFormData] = useState(emptyForm)

  const table = useTableControls(clients, {
    searchText: (c) => [c.first_name, c.last_name, c.father_name, c.phone_number, c.email, c.comment].join(' '),
    sorters,
    defaultSort: { key: 'added', dir: 'desc' },
  })

  useEffect(() => {
    fetchClients()
    // Load once when the page opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*, client_policies(count)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      toast.error(friendlyError(error))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const { error } = editingClientId
        ? await supabase.from('clients').update(formData).eq('id', editingClientId)
        : await supabase.from('clients').insert([formData])

      if (error) throw error

      toast.success(editingClientId ? 'Client updated.' : 'Client added.')
      cancelForm()
      fetchClients()
    } catch (error) {
      toast.error(friendlyError(error))
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: name === 'phone_number' ? formatPhoneNumber(value) : value
    })
  }

  const startEditing = (client) => {
    setEditingClientId(client.id)
    setFormData({
      first_name: client.first_name || '',
      last_name: client.last_name || '',
      father_name: client.father_name || '',
      phone_number: formatPhoneNumber(client.phone_number),
      email: client.email || '',
      comment: client.comment || ''
    })
    setShowForm(true)
    requestAnimationFrame(() => document.getElementById('client-edit-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const cancelForm = () => {
    setFormData(emptyForm)
    setEditingClientId(null)
    setShowForm(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading clients...</div>
      </div>
    )
  }

  const sortProps = { sort: table.sort, onSort: table.toggleSort }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Client List</h2>
          <p className="text-sm text-muted-foreground">
            {table.query ? `${table.rows.length} of ${clients.length} clients` : `${clients.length} total clients`}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <SearchInput value={table.query} onChange={table.setQuery} placeholder="Search clients" />
          <Button onClick={() => (showForm ? cancelForm() : setShowForm(true))}>
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Add Client Form */}
      {showForm && (
        <Card id="client-edit-form">
          <CardHeader>
            <CardTitle>{editingClientId ? 'Edit Client' : 'Add New Client'}</CardTitle>
            <CardDescription>{editingClientId ? 'Update the client’s information below' : 'Enter the client’s information below'}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="father_name">Father Name</Label>
                <Input
                  id="father_name"
                  name="father_name"
                  value={formData.father_name}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  name="phone_number"
                  type="tel"
                  inputMode="tel"
                  placeholder="(xxx) xxx xx xx"
                  value={formData.phone_number}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="comment">Comment</Label>
                <textarea
                  id="comment"
                  name="comment"
                  value={formData.comment}
                  onChange={handleChange}
                  rows="3"
                  className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                />
              </div>

              <div className="flex gap-2 md:col-span-2">
                <Button type="submit">{editingClientId ? 'Save Changes' : 'Add Client'}</Button>
                <Button type="button" variant="secondary" onClick={cancelForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Clients Table */}
      {clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No clients yet. Add your first client above!</p>
          </CardContent>
        </Card>
      ) : table.rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No clients match &ldquo;{table.query}&rdquo;.</p>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead sortKey="id" {...sortProps}>ID</SortableTableHead>
              <SortableTableHead sortKey="name" {...sortProps}>Name</SortableTableHead>
              <TableHead>Father Name</TableHead>
              <SortableTableHead sortKey="phone" {...sortProps}>Phone</SortableTableHead>
              <SortableTableHead sortKey="email" {...sortProps}>Email</SortableTableHead>
              <TableHead>Comment</TableHead>
              <SortableTableHead sortKey="policies" {...sortProps}>Policies</SortableTableHead>
              <SortableTableHead sortKey="added" {...sortProps}>Added</SortableTableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.rows.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-mono text-muted-foreground">{client.id}</TableCell>
                <TableCell className="font-medium">{client.first_name} {client.last_name}</TableCell>
                <TableCell className="text-muted-foreground">{client.father_name || '-'}</TableCell>
                <TableCell className="whitespace-nowrap">{client.phone_number || '-'}</TableCell>
                <TableCell className="text-muted-foreground">{client.email || '-'}</TableCell>
                <TableCell className="max-w-[240px] truncate text-muted-foreground" title={client.comment || undefined}>
                  {client.comment || '-'}
                </TableCell>
                <TableCell>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto px-0"
                    aria-label={`View policies of ${client.first_name} ${client.last_name}`}
                    onClick={() => navigate('policies', { client: client.id })}
                  >
                    <FileText className="h-4 w-4" />
                    {policyCount(client)}
                  </Button>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(client.created_at)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${client.first_name} ${client.last_name}`}
                    onClick={() => startEditing(client)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

export default Clients

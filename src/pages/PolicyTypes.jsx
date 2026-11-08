import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table'
import { useToast } from '../components/ui/Toast'
import { useConfirm } from '../components/ui/ConfirmDialog'
import { formatDate } from '../lib/utils'
import { friendlyError } from '../lib/errors'
import { Plus, Layers, Pencil, Trash2 } from 'lucide-react'

const emptyForm = { type: '', name: '' }

function PolicyTypes() {
  const toast = useToast()
  const confirm = useConfirm()
  const [policyTypes, setPolicyTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingType, setEditingType] = useState(null)
  const [formData, setFormData] = useState(emptyForm)

  useEffect(() => {
    fetchPolicyTypes()
    // Load once when the page opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchPolicyTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('insurance_policy_types')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPolicyTypes(data || [])
    } catch (error) {
      toast.error(friendlyError(error))
    } finally {
      setLoading(false)
    }
  }

  const closeForm = () => {
    setFormData(emptyForm)
    setEditingType(null)
    setShowForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const type = formData.type.trim().toUpperCase()
    if (type.length !== 3) {
      toast.error('Type code must be exactly 3 characters.')
      return
    }

    try {
      const { error } = editingType
        ? await supabase.from('insurance_policy_types').update({ name: formData.name }).eq('type', editingType)
        : await supabase.from('insurance_policy_types').insert([{ type, name: formData.name }])

      if (error) throw error

      toast.success(editingType ? 'Policy type updated.' : 'Policy type added.')
      closeForm()
      fetchPolicyTypes()
    } catch (error) {
      toast.error(friendlyError(error, { duplicate: 'A policy type with this code already exists.' }))
    }
  }

  const startEditing = (policyType) => {
    setFormData({ type: policyType.type, name: policyType.name || '' })
    setEditingType(policyType.type)
    setShowForm(true)
    requestAnimationFrame(() => document.getElementById('policy-type-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const handleDelete = async (policyType) => {
    const ok = await confirm({
      title: `Delete ${policyType.type} - ${policyType.name}?`,
      message: 'Its commission rates are deleted too. Policy types that have policies cannot be deleted.',
      confirmLabel: 'Delete',
      destructive: true
    })
    if (!ok) return

    try {
      const { error } = await supabase.from('insurance_policy_types').delete().eq('type', policyType.type)
      if (error) throw error
      toast.success('Policy type deleted.')
      if (editingType === policyType.type) closeForm()
      fetchPolicyTypes()
    } catch (error) {
      toast.error(friendlyError(error, {
        inUse: `${policyType.type} is used by policies, so it cannot be deleted. Delete or change those policies first.`
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
        <div className="text-muted-foreground">Loading policy types...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Policy Type List</h2>
          <p className="text-sm text-muted-foreground">{policyTypes.length} policy types</p>
        </div>
        <Button onClick={() => (showForm ? closeForm() : setShowForm(true))}>
          <Plus className="h-4 w-4" />
          Add Policy Type
        </Button>
      </div>

      {/* Add / Edit Policy Type Form */}
      {showForm && (
        <Card id="policy-type-form">
          <CardHeader>
            <CardTitle>{editingType ? `Edit ${editingType}` : 'Add New Policy Type'}</CardTitle>
            <CardDescription>
              {editingType ? 'The code cannot be changed because policies refer to it.' : 'Define a new type of insurance policy'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type">Type Code (3 characters) *</Label>
                <Input
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  maxLength="3"
                  className="uppercase"
                  placeholder="e.g., LIF"
                  disabled={!!editingType}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Policy Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Life Insurance"
                  required
                />
              </div>

              <div className="flex gap-2 md:col-span-2">
                <Button type="submit">{editingType ? 'Save Changes' : 'Add Policy Type'}</Button>
                <Button type="button" variant="secondary" onClick={closeForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Policy Types Table */}
      {policyTypes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No policy types yet. Add your first policy type above!</p>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {policyTypes.map((policyType) => (
              <TableRow key={policyType.type}>
                <TableCell>
                  <span className="rounded bg-muted px-2 py-1 font-mono text-sm font-medium">
                    {policyType.type}
                  </span>
                </TableCell>
                <TableCell className="font-medium">{policyType.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(policyType.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" aria-label={`Edit ${policyType.type}`} onClick={() => startEditing(policyType)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${policyType.type}`} onClick={() => handleDelete(policyType)}>
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

export default PolicyTypes

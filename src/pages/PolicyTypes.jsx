import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table'
import { formatDate } from '../lib/utils'
import { Plus, AlertCircle, CheckCircle2, Layers } from 'lucide-react'

function PolicyTypes() {
  const [policyTypes, setPolicyTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showForm, setShowForm] = useState(false)
  
  const [formData, setFormData] = useState({
    type: '',
    name: ''
  })

  useEffect(() => {
    fetchPolicyTypes()
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
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (formData.type.length !== 3) {
      setError('Type code must be exactly 3 characters')
      return
    }

    try {
      const { error } = await supabase
        .from('insurance_policy_types')
        .insert([{
          type: formData.type.toUpperCase(),
          name: formData.name
        }])

      if (error) throw error

      setSuccess('Policy type added successfully!')
      setFormData({ type: '', name: '' })
      setShowForm(false)
      fetchPolicyTypes()
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      if (error.code === '23505') {
        setError('A policy type with this code already exists')
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
        <div className="text-muted-foreground">Loading policy types...</div>
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
          <h2 className="text-lg font-semibold">Policy Type List</h2>
          <p className="text-sm text-muted-foreground">{policyTypes.length} policy types</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Add Policy Type
        </Button>
      </div>

      {/* Add Policy Type Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Policy Type</CardTitle>
            <CardDescription>Define a new type of insurance policy</CardDescription>
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
                <Button type="submit">Add Policy Type</Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

export default PolicyTypes

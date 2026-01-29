import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function PolicyTypes() {
  const [policyTypes, setPolicyTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  
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

    // Validate code is exactly 3 characters
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
    return <div className="loading">Loading policy types...</div>
  }

  return (
    <div>
      <h2>Insurance Policy Types</h2>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <h3>Add New Policy Type</h3>
        
        <div className="form-group">
          <label htmlFor="type">Type Code (3 characters) *</label>
          <input
            type="text"
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            maxLength="3"
            style={{ textTransform: 'uppercase' }}
            placeholder="e.g., LIF"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="name">Policy Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Life Insurance"
            required
          />
        </div>

        <button type="submit">Add Policy Type</button>
      </form>

      <h3>Policy Type List ({policyTypes.length})</h3>
      
      {policyTypes.length === 0 ? (
        <p>No policy types yet. Add your first policy type above!</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Added</th>
            </tr>
          </thead>
          <tbody>
            {policyTypes.map((policyType) => (
              <tr key={policyType.type}>
                <td><strong>{policyType.type}</strong></td>
                <td>{policyType.name}</td>
                <td>{new Date(policyType.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default PolicyTypes

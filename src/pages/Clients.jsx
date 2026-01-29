import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    father_name: '',
    phone_number: '',
    email: '',
    comment: ''
  })

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setClients(data || [])
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
        .from('clients')
        .insert([formData])

      if (error) throw error

      setSuccess('Client added successfully!')
      setFormData({ 
        first_name: '', 
        last_name: '', 
        father_name: '', 
        phone_number: '', 
        email: '', 
        comment: '' 
      })
      fetchClients()
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      setError(error.message)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  if (loading) {
    return <div className="loading">Loading clients...</div>
  }

  return (
    <div>
      <h2>Clients</h2>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <h3>Add New Client</h3>
        
        <div className="form-group">
          <label htmlFor="first_name">First Name *</label>
          <input
            type="text"
            id="first_name"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="last_name">Last Name *</label>
          <input
            type="text"
            id="last_name"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="father_name">Father Name</label>
          <input
            type="text"
            id="father_name"
            name="father_name"
            value={formData.father_name}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="phone_number">Phone Number</label>
          <input
            type="tel"
            id="phone_number"
            name="phone_number"
            value={formData.phone_number}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="comment">Comment</label>
          <textarea
            id="comment"
            name="comment"
            value={formData.comment}
            onChange={handleChange}
            rows="3"
          />
        </div>

        <button type="submit">Add Client</button>
      </form>

      <h3>Client List ({clients.length})</h3>
      
      {clients.length === 0 ? (
        <p>No clients yet. Add your first client above!</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Father Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Added</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td>{client.id}</td>
                <td>{client.first_name} {client.last_name}</td>
                <td>{client.father_name || '-'}</td>
                <td>{client.phone_number || '-'}</td>
                <td>{client.email || '-'}</td>
                <td>{new Date(client.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default Clients

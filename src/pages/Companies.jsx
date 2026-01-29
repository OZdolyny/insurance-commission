import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function Companies() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  
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

    // Validate code is exactly 3 characters
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
    return <div className="loading">Loading insurance companies...</div>
  }

  return (
    <div>
      <h2>Insurance Companies</h2>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <h3>Add New Insurance Company</h3>
        
        <div className="form-group">
          <label htmlFor="code">Code (3 characters) *</label>
          <input
            type="text"
            id="code"
            name="code"
            value={formData.code}
            onChange={handleChange}
            maxLength="3"
            style={{ textTransform: 'uppercase' }}
            placeholder="e.g., AXA"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="name">Company Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="address">Address</label>
          <textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows="2"
          />
        </div>

        <div className="form-group">
          <label htmlFor="manager_name">Manager Name</label>
          <input
            type="text"
            id="manager_name"
            name="manager_name"
            value={formData.manager_name}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="manager_email">Manager Email</label>
          <input
            type="email"
            id="manager_email"
            name="manager_email"
            value={formData.manager_email}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="manager_phone">Manager Phone</label>
          <input
            type="tel"
            id="manager_phone"
            name="manager_phone"
            value={formData.manager_phone}
            onChange={handleChange}
          />
        </div>

        <button type="submit">Add Company</button>
      </form>

      <h3>Insurance Company List ({companies.length})</h3>
      
      {companies.length === 0 ? (
        <p>No insurance companies yet. Add your first company above!</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Manager</th>
              <th>Contact</th>
              <th>Added</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr key={company.code}>
                <td><strong>{company.code}</strong></td>
                <td>{company.name}</td>
                <td>{company.manager_name || '-'}</td>
                <td>
                  {company.manager_email && <div>{company.manager_email}</div>}
                  {company.manager_phone && <div>{company.manager_phone}</div>}
                  {!company.manager_email && !company.manager_phone && '-'}
                </td>
                <td>{new Date(company.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default Companies

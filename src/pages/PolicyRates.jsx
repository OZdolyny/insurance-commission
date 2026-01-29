import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function PolicyRates() {
  const [policyRates, setPolicyRates] = useState([])
  const [companies, setCompanies] = useState([])
  const [policyTypes, setPolicyTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  
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
      // Fetch companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('insurance_companies')
        .select('code, name')
        .order('name')

      if (companiesError) throw companiesError
      setCompanies(companiesData || [])

      // Fetch policy types
      const { data: typesData, error: typesError } = await supabase
        .from('insurance_policy_types')
        .select('type, name')
        .order('name')

      if (typesError) throw typesError
      setPolicyTypes(typesData || [])

      // Fetch policy rates with joins
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
    return <div className="loading">Loading policy rates...</div>
  }

  return (
    <div>
      <h2>Commission Rates</h2>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <h3>Add New Commission Rate</h3>
        
        <div className="form-group">
          <label htmlFor="insurance_company_code">Insurance Company *</label>
          <select
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
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="insurance_policy_type">Policy Type *</label>
          <select
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
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="commission_rate">Commission Rate (as decimal, e.g., 0.15 for 15%) *</label>
          <input
            type="number"
            id="commission_rate"
            name="commission_rate"
            value={formData.commission_rate}
            onChange={handleChange}
            step="0.0001"
            min="0"
            max="1"
            placeholder="e.g., 0.15"
            required
          />
          {formData.commission_rate && (
            <small style={{ color: '#646cff' }}>
              = {(parseFloat(formData.commission_rate) * 100).toFixed(2)}%
            </small>
          )}
        </div>

        <button type="submit">Add Rate</button>
      </form>

      <h3>Commission Rate List ({policyRates.length})</h3>
      
      {policyRates.length === 0 ? (
        <p>No commission rates yet. Add your first rate above!</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Policy Type</th>
              <th>Commission Rate</th>
              <th>Added</th>
            </tr>
          </thead>
          <tbody>
            {policyRates.map((rate) => (
              <tr key={rate.id}>
                <td>
                  <strong>{rate.insurance_companies?.code}</strong> - {rate.insurance_companies?.name}
                </td>
                <td>
                  <strong>{rate.insurance_policy_types?.type}</strong> - {rate.insurance_policy_types?.name}
                </td>
                <td>
                  {rate.commission_rate} ({(parseFloat(rate.commission_rate) * 100).toFixed(2)}%)
                </td>
                <td>{new Date(rate.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default PolicyRates

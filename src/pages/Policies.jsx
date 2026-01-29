import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function Policies() {
  const [policies, setPolicies] = useState([])
  const [clients, setClients] = useState([])
  const [companies, setCompanies] = useState([])
  const [policyTypes, setPolicyTypes] = useState([])
  const [policyRates, setPolicyRates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  
  const [formData, setFormData] = useState({
    client_id: '',
    insurance_company_code: '',
    insurance_policy_type: '',
    amount: '',
    start_date: '',
    end_date: '',
    discount: '0',
    policy_number: ''
  })

  const [selectedRate, setSelectedRate] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    // Auto-select commission rate when company and policy type are selected
    if (formData.insurance_company_code && formData.insurance_policy_type) {
      const rate = policyRates.find(
        r => r.insurance_company_code === formData.insurance_company_code && 
             r.insurance_policy_type === formData.insurance_policy_type
      )
      setSelectedRate(rate || null)
    } else {
      setSelectedRate(null)
    }
  }, [formData.insurance_company_code, formData.insurance_policy_type, policyRates])

  const fetchData = async () => {
    try {
      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .order('first_name')

      if (clientsError) throw clientsError
      setClients(clientsData || [])

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

      // Fetch policy rates
      const { data: ratesData, error: ratesError } = await supabase
        .from('insurance_policy_rates')
        .select('*')

      if (ratesError) throw ratesError
      setPolicyRates(ratesData || [])

      // Fetch policies
      const { data: policiesData, error: policiesError } = await supabase
        .from('client_policies')
        .select(`
          *,
          clients (id, first_name, last_name),
          insurance_companies (code, name),
          insurance_policy_types (type, name)
        `)
        .order('created_at', { ascending: false })

      if (policiesError) throw policiesError
      setPolicies(policiesData || [])
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

    if (!selectedRate) {
      setError('No commission rate found for this company and policy type combination. Please add a rate first.')
      return
    }

    try {
      const amount = parseFloat(formData.amount)
      const discount = parseFloat(formData.discount) || 0
      const netAmount = amount - discount
      const commissionAmount = netAmount * parseFloat(selectedRate.commission_rate)

      const { error } = await supabase
        .from('client_policies')
        .insert([{
          ...formData,
          client_id: parseInt(formData.client_id),
          amount: amount,
          discount: discount,
          commission_rate: selectedRate.commission_rate,
          commission_amount: commissionAmount,
          payment_status: 'pending'
        }])

      if (error) throw error

      setSuccess('Policy added successfully!')
      setFormData({
        client_id: '',
        insurance_company_code: '',
        insurance_policy_type: '',
        amount: '',
        start_date: '',
        end_date: '',
        discount: '0',
        policy_number: ''
      })
      setSelectedRate(null)
      fetchData()
      
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

  const calculateCommission = () => {
    if (!formData.amount || !selectedRate) return 0
    const amount = parseFloat(formData.amount)
    const discount = parseFloat(formData.discount) || 0
    const netAmount = amount - discount
    return netAmount * parseFloat(selectedRate.commission_rate)
  }

  if (loading) {
    return <div className="loading">Loading policies...</div>
  }

  return (
    <div>
      <h2>Client Policies</h2>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <h3>Add New Policy</h3>
        
        <div className="form-group">
          <label htmlFor="client_id">Client *</label>
          <select
            id="client_id"
            name="client_id"
            value={formData.client_id}
            onChange={handleChange}
            required
          >
            <option value="">Select a client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.first_name} {client.last_name}
              </option>
            ))}
          </select>
        </div>

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

        {selectedRate && (
          <div style={{ padding: '0.75rem', backgroundColor: '#2a2a2a', borderRadius: '4px', marginBottom: '1rem' }}>
            <strong>Commission Rate:</strong> {(parseFloat(selectedRate.commission_rate) * 100).toFixed(2)}%
          </div>
        )}

        {formData.insurance_company_code && formData.insurance_policy_type && !selectedRate && (
          <div className="error">
            No commission rate found for this combination. Please add a rate in the Rates section first.
          </div>
        )}

        <div className="form-group">
          <label htmlFor="policy_number">Policy Number</label>
          <input
            type="text"
            id="policy_number"
            name="policy_number"
            value={formData.policy_number}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="amount">Premium Amount ($) *</label>
          <input
            type="number"
            id="amount"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            step="0.01"
            min="0"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="discount">Discount ($)</label>
          <input
            type="number"
            id="discount"
            name="discount"
            value={formData.discount}
            onChange={handleChange}
            step="0.01"
            min="0"
          />
        </div>

        {formData.amount && selectedRate && (
          <div style={{ padding: '0.75rem', backgroundColor: '#1a2a1a', borderRadius: '4px', marginBottom: '1rem' }}>
            <div><strong>Net Amount:</strong> ${(parseFloat(formData.amount) - (parseFloat(formData.discount) || 0)).toFixed(2)}</div>
            <div style={{ color: '#51cf66', fontSize: '1.1em', marginTop: '0.5rem' }}>
              <strong>Your Commission:</strong> ${calculateCommission().toFixed(2)}
            </div>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="start_date">Start Date *</label>
          <input
            type="date"
            id="start_date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="end_date">End Date</label>
          <input
            type="date"
            id="end_date"
            name="end_date"
            value={formData.end_date}
            onChange={handleChange}
          />
        </div>

        <button type="submit">Add Policy</button>
      </form>

      <h3>Policy List ({policies.length})</h3>
      
      {policies.length === 0 ? (
        <p>No policies yet. Add your first policy above!</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Company</th>
              <th>Policy Type</th>
              <th>Amount</th>
              <th>Commission</th>
              <th>Start Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((policy) => (
              <tr key={policy.id}>
                <td>{policy.clients?.first_name} {policy.clients?.last_name}</td>
                <td>{policy.insurance_companies?.name}</td>
                <td>{policy.insurance_policy_types?.name}</td>
                <td>${parseFloat(policy.amount).toFixed(2)}</td>
                <td>
                  <strong style={{ color: '#51cf66' }}>
                    ${parseFloat(policy.commission_amount).toFixed(2)}
                  </strong>
                  <br />
                  <small>({(parseFloat(policy.commission_rate) * 100).toFixed(2)}%)</small>
                </td>
                <td>{new Date(policy.start_date).toLocaleDateString()}</td>
                <td>
                  <span style={{ 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '12px',
                    backgroundColor: policy.payment_status === 'paid' ? '#2a4a2a' : '#4a4a2a',
                    color: policy.payment_status === 'paid' ? '#51cf66' : '#ffd43b'
                  }}>
                    {policy.payment_status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default Policies

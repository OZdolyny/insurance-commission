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
  const [editingId, setEditingId] = useState(null)
  const [expirationFilter, setExpirationFilter] = useState('all') // all, expiring-30, expiring-60, expiring-90, expired
  
  const [formData, setFormData] = useState({
    client_id: '',
    insurance_company_code: '',
    insurance_policy_type: '',
    amount: '',
    paid_amount: '',
    start_date: '',
    end_date: '',
    policy_number: '',
    no_commission: false
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

    if (!selectedRate && !formData.no_commission) {
      setError('No commission rate found for this company and policy type combination. Please add a rate first or check "No Commission".')
      return
    }

    try {
      const commissionAmount = calculateCommission()

      const policyData = {
        client_id: parseInt(formData.client_id),
        insurance_company_code: formData.insurance_company_code,
        insurance_policy_type: formData.insurance_policy_type,
        amount: parseFloat(formData.amount),
        paid_amount: parseFloat(formData.paid_amount),
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        policy_number: formData.policy_number || null,
        commission_rate: formData.no_commission ? 0 : parseFloat(selectedRate.commission_rate),
        commission_amount: commissionAmount,
        no_commission: formData.no_commission,
        payment_status: 'pending'
      }

      if (editingId) {
        // Update existing policy
        const { error } = await supabase
          .from('client_policies')
          .update(policyData)
          .eq('id', editingId)

        if (error) throw error
        setSuccess('Policy updated successfully!')
        setEditingId(null)
      } else {
        // Insert new policy
        const { error } = await supabase
          .from('client_policies')
          .insert([policyData])

        if (error) throw error
        setSuccess('Policy added successfully!')
      }

      resetForm()
      fetchData()
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      setError(error.message)
    }
  }

  const handleEdit = (policy) => {
    setFormData({
      client_id: policy.client_id.toString(),
      insurance_company_code: policy.insurance_company_code,
      insurance_policy_type: policy.insurance_policy_type,
      amount: policy.amount.toString(),
      paid_amount: policy.paid_amount.toString(),
      start_date: policy.start_date,
      end_date: policy.end_date || '',
      policy_number: policy.policy_number || '',
      no_commission: policy.no_commission || false
    })
    setEditingId(policy.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this policy?')) return

    try {
      const { error } = await supabase
        .from('client_policies')
        .delete()
        .eq('id', id)

      if (error) throw error
      setSuccess('Policy deleted successfully!')
      fetchData()
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      setError(error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      client_id: '',
      insurance_company_code: '',
      insurance_policy_type: '',
      amount: '',
      paid_amount: '',
      start_date: '',
      end_date: '',
      policy_number: '',
      no_commission: false
    })
    setEditingId(null)
    setSelectedRate(null)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const calculateCommission = () => {
    if (formData.no_commission) return 0
    if (!formData.amount || !formData.paid_amount || !selectedRate) return 0
    
    const policyAmount = parseFloat(formData.amount)
    const paidAmount = parseFloat(formData.paid_amount)
    const discount = policyAmount - paidAmount
    
    // Full Commission = Policy Amount * Rate
    const fullCommission = policyAmount * parseFloat(selectedRate.commission_rate)
    
    // Final Commission = Full Commission - Discount
    const finalCommission = fullCommission - discount
    
    return Math.max(0, finalCommission) // Ensure not negative
  }

  const getFilteredPolicies = () => {
    const today = new Date()
    
    return policies.filter(policy => {
      if (expirationFilter === 'all') return true
      if (!policy.end_date) return false
      
      const endDate = new Date(policy.end_date)
      const daysUntilExpiry = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24))
      
      switch (expirationFilter) {
        case 'expired':
          return daysUntilExpiry < 0
        case 'expiring-30':
          return daysUntilExpiry >= 0 && daysUntilExpiry <= 30
        case 'expiring-60':
          return daysUntilExpiry >= 0 && daysUntilExpiry <= 60
        case 'expiring-90':
          return daysUntilExpiry >= 0 && daysUntilExpiry <= 90
        default:
          return true
      }
    })
  }

  if (loading) {
    return <div className="loading">Loading policies...</div>
  }

  const filteredPolicies = getFilteredPolicies()

  return (
    <div>
      <h2>{editingId ? 'Edit Policy' : 'Client Policies'}</h2>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <h3>{editingId ? 'Update Policy' : 'Add New Policy'}</h3>
        
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

        {selectedRate && !formData.no_commission && (
          <div style={{ padding: '0.75rem', backgroundColor: '#2a2a2a', borderRadius: '4px', marginBottom: '1rem' }}>
            <strong>Commission Rate:</strong> {(parseFloat(selectedRate.commission_rate) * 100).toFixed(2)}%
          </div>
        )}

        {formData.insurance_company_code && formData.insurance_policy_type && !selectedRate && !formData.no_commission && (
          <div className="error">
            No commission rate found for this combination. Please add a rate in the Rates section first or check "No Commission".
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
          <label htmlFor="amount">Policy Amount ($) *</label>
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
          <label htmlFor="paid_amount">Paid Amount ($) *</label>
          <input
            type="number"
            id="paid_amount"
            name="paid_amount"
            value={formData.paid_amount}
            onChange={handleChange}
            step="0.01"
            min="0"
            required
          />
        </div>

        {formData.amount && formData.paid_amount && (
          <div style={{ padding: '0.75rem', backgroundColor: '#2a2a2a', borderRadius: '4px', marginBottom: '1rem' }}>
            <strong>Discount:</strong> ${(parseFloat(formData.amount) - parseFloat(formData.paid_amount)).toFixed(2)}
          </div>
        )}

        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              name="no_commission"
              checked={formData.no_commission}
              onChange={handleChange}
            />
            Set Commission as 0 (No commission for this policy)
          </label>
        </div>

        {formData.amount && formData.paid_amount && selectedRate && !formData.no_commission && (
          <div style={{ padding: '0.75rem', backgroundColor: '#1a2a1a', borderRadius: '4px', marginBottom: '1rem' }}>
            <div><strong>Policy Amount:</strong> ${parseFloat(formData.amount).toFixed(2)}</div>
            <div><strong>Paid Amount:</strong> ${parseFloat(formData.paid_amount).toFixed(2)}</div>
            <div><strong>Discount:</strong> ${(parseFloat(formData.amount) - parseFloat(formData.paid_amount)).toFixed(2)}</div>
            <div><strong>Full Commission:</strong> ${(parseFloat(formData.amount) * parseFloat(selectedRate.commission_rate)).toFixed(2)}</div>
            <div style={{ color: '#51cf66', fontSize: '1.2em', marginTop: '0.5rem', borderTop: '1px solid #333', paddingTop: '0.5rem' }}>
              <strong>Your Commission:</strong> ${calculateCommission().toFixed(2)}
            </div>
          </div>
        )}

        {formData.no_commission && (
          <div style={{ padding: '0.75rem', backgroundColor: '#2a2a2a', borderRadius: '4px', marginBottom: '1rem', color: '#ffd43b' }}>
            <strong>Commission set to $0.00 (No commission)</strong>
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

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit">{editingId ? 'Update Policy' : 'Add Policy'}</button>
          {editingId && (
            <button 
              type="button" 
              onClick={resetForm}
              style={{ backgroundColor: '#666' }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div style={{ marginTop: '2rem', marginBottom: '1rem' }}>
        <h3>Policy List ({filteredPolicies.length})</h3>
        
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setExpirationFilter('all')}
            style={{ 
              backgroundColor: expirationFilter === 'all' ? '#646cff' : '#1a1a1a',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              color: 'white'
            }}
          >
            All ({policies.length})
          </button>
          <button 
            onClick={() => setExpirationFilter('expiring-30')}
            style={{ 
              backgroundColor: expirationFilter === 'expiring-30' ? '#646cff' : '#1a1a1a',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              color: 'white'
            }}
          >
            Expiring in 30 days
          </button>
          <button 
            onClick={() => setExpirationFilter('expiring-60')}
            style={{ 
              backgroundColor: expirationFilter === 'expiring-60' ? '#646cff' : '#1a1a1a',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              color: 'white'
            }}
          >
            Expiring in 60 days
          </button>
          <button 
            onClick={() => setExpirationFilter('expiring-90')}
            style={{ 
              backgroundColor: expirationFilter === 'expiring-90' ? '#646cff' : '#1a1a1a',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              color: 'white'
            }}
          >
            Expiring in 90 days
          </button>
          <button 
            onClick={() => setExpirationFilter('expired')}
            style={{ 
              backgroundColor: expirationFilter === 'expired' ? '#646cff' : '#1a1a1a',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              color: 'white'
            }}
          >
            Expired
          </button>
        </div>
      </div>
      
      {filteredPolicies.length === 0 ? (
        <p>No policies found with the selected filter.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Company</th>
              <th>Policy Type</th>
              <th>Policy Amount</th>
              <th>Paid Amount</th>
              <th>Commission</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPolicies.map((policy) => {
              const daysUntilExpiry = policy.end_date 
                ? Math.ceil((new Date(policy.end_date) - new Date()) / (1000 * 60 * 60 * 24))
                : null
              
              return (
                <tr key={policy.id}>
                  <td>{policy.clients?.first_name} {policy.clients?.last_name}</td>
                  <td>{policy.insurance_companies?.name}</td>
                  <td>{policy.insurance_policy_types?.name}</td>
                  <td>${parseFloat(policy.amount).toFixed(2)}</td>
                  <td>
                    ${parseFloat(policy.paid_amount).toFixed(2)}
                    {policy.discount > 0 && (
                      <div style={{ fontSize: '0.85em', color: '#ff6b6b' }}>
                        Discount: ${parseFloat(policy.discount).toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td>
                    {policy.no_commission ? (
                      <span style={{ color: '#999' }}>No Commission</span>
                    ) : (
                      <>
                        <strong style={{ color: '#51cf66' }}>
                          ${parseFloat(policy.commission_amount).toFixed(2)}
                        </strong>
                        <br />
                        <small>({(parseFloat(policy.commission_rate) * 100).toFixed(2)}%)</small>
                      </>
                    )}
                  </td>
                  <td>{new Date(policy.start_date).toLocaleDateString()}</td>
                  <td>
                    {policy.end_date ? (
                      <>
                        {new Date(policy.end_date).toLocaleDateString()}
                        {daysUntilExpiry !== null && (
                          <div style={{ 
                            fontSize: '0.85em', 
                            color: daysUntilExpiry < 0 ? '#ff6b6b' : daysUntilExpiry <= 30 ? '#ffd43b' : '#999'
                          }}>
                            {daysUntilExpiry < 0 
                              ? `Expired ${Math.abs(daysUntilExpiry)} days ago` 
                              : `${daysUntilExpiry} days left`
                            }
                          </div>
                        )}
                      </>
                    ) : '-'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleEdit(policy)}
                        style={{
                          padding: '0.4rem 0.8rem',
                          fontSize: '0.9em',
                          backgroundColor: '#646cff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          color: 'white'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(policy.id)}
                        style={{
                          padding: '0.4rem 0.8rem',
                          fontSize: '0.9em',
                          backgroundColor: '#ff6b6b',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          color: 'white'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default Policies

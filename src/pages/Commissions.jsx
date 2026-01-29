import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function Commissions() {
  const [commissions, setCommissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [filter, setFilter] = useState('all') // all, pending, paid

  useEffect(() => {
    fetchCommissions()
  }, [])

  const fetchCommissions = async () => {
    try {
      const { data, error } = await supabase
        .from('client_policies')
        .select(`
          *,
          clients (id, first_name, last_name, phone_number),
          insurance_companies (code, name),
          insurance_policy_types (type, name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCommissions(data || [])
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const markAsPaid = async (policyId) => {
    try {
      const { error } = await supabase
        .from('client_policies')
        .update({ 
          payment_status: 'paid',
          payment_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', policyId)

      if (error) throw error

      setSuccess('Commission marked as paid!')
      fetchCommissions()
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      setError(error.message)
    }
  }

  const markAsPending = async (policyId) => {
    try {
      const { error } = await supabase
        .from('client_policies')
        .update({ 
          payment_status: 'pending',
          payment_date: null
        })
        .eq('id', policyId)

      if (error) throw error

      setSuccess('Commission marked as pending!')
      fetchCommissions()
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      setError(error.message)
    }
  }

  const calculateTotals = () => {
    const filtered = getFilteredCommissions()
    const total = commissions.reduce((sum, c) => sum + (parseFloat(c.commission_amount) || 0), 0)
    const paid = commissions.filter(c => c.payment_status === 'paid').reduce((sum, c) => sum + (parseFloat(c.commission_amount) || 0), 0)
    const pending = commissions.filter(c => c.payment_status === 'pending').reduce((sum, c) => sum + (parseFloat(c.commission_amount) || 0), 0)
    
    return { total, paid, pending, count: filtered.length }
  }

  const getFilteredCommissions = () => {
    if (filter === 'all') return commissions
    return commissions.filter(c => c.payment_status === filter)
  }

  if (loading) {
    return <div className="loading">Loading commissions...</div>
  }

  const totals = calculateTotals()
  const filteredCommissions = getFilteredCommissions()

  return (
    <div>
      <h2>Commissions</h2>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Commissions</div>
          <div className="stat-value">${totals.total.toFixed(2)}</div>
          <small>{commissions.length} policies</small>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Paid</div>
          <div className="stat-value" style={{ color: '#51cf66' }}>${totals.paid.toFixed(2)}</div>
          <small>{commissions.filter(c => c.payment_status === 'paid').length} policies</small>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value" style={{ color: '#ffd43b' }}>${totals.pending.toFixed(2)}</div>
          <small>{commissions.filter(c => c.payment_status === 'pending').length} policies</small>
        </div>
      </div>

      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
        <button 
          onClick={() => setFilter('all')}
          style={{ 
            backgroundColor: filter === 'all' ? '#646cff' : '#1a1a1a',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer',
            color: 'white'
          }}
        >
          All ({commissions.length})
        </button>
        <button 
          onClick={() => setFilter('pending')}
          style={{ 
            backgroundColor: filter === 'pending' ? '#646cff' : '#1a1a1a',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer',
            color: 'white'
          }}
        >
          Pending ({commissions.filter(c => c.payment_status === 'pending').length})
        </button>
        <button 
          onClick={() => setFilter('paid')}
          style={{ 
            backgroundColor: filter === 'paid' ? '#646cff' : '#1a1a1a',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer',
            color: 'white'
          }}
        >
          Paid ({commissions.filter(c => c.payment_status === 'paid').length})
        </button>
      </div>

      <h3>Commission List ({filteredCommissions.length})</h3>
      
      {filteredCommissions.length === 0 ? (
        <p>No commissions found with the selected filter.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Company</th>
              <th>Policy Type</th>
              <th>Premium</th>
              <th>Commission</th>
              <th>Status</th>
              <th>Payment Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredCommissions.map((commission) => (
              <tr key={commission.id}>
                <td>
                  <strong>{commission.clients?.first_name} {commission.clients?.last_name}</strong>
                  {commission.clients?.phone_number && (
                    <div style={{ fontSize: '0.85em', color: '#999' }}>
                      {commission.clients?.phone_number}
                    </div>
                  )}
                </td>
                <td>{commission.insurance_companies?.name}</td>
                <td>{commission.insurance_policy_types?.name}</td>
                <td>
                  ${parseFloat(commission.amount).toFixed(2)}
                  {commission.discount > 0 && (
                    <div style={{ fontSize: '0.85em', color: '#999' }}>
                      Discount: -${parseFloat(commission.discount).toFixed(2)}
                    </div>
                  )}
                </td>
                <td>
                  <strong style={{ color: '#51cf66', fontSize: '1.1em' }}>
                    ${parseFloat(commission.commission_amount).toFixed(2)}
                  </strong>
                  <div style={{ fontSize: '0.85em', color: '#999' }}>
                    {(parseFloat(commission.commission_rate) * 100).toFixed(2)}%
                  </div>
                </td>
                <td>
                  <span style={{ 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '12px',
                    backgroundColor: commission.payment_status === 'paid' ? '#2a4a2a' : '#4a4a2a',
                    color: commission.payment_status === 'paid' ? '#51cf66' : '#ffd43b'
                  }}>
                    {commission.payment_status}
                  </span>
                </td>
                <td>
                  {commission.payment_date 
                    ? new Date(commission.payment_date).toLocaleDateString()
                    : '-'
                  }
                </td>
                <td>
                  {commission.payment_status === 'pending' ? (
                    <button
                      onClick={() => markAsPaid(commission.id)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.9em',
                        backgroundColor: '#51cf66',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: 'white'
                      }}
                    >
                      Mark as Paid
                    </button>
                  ) : (
                    <button
                      onClick={() => markAsPending(commission.id)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.9em',
                        backgroundColor: '#ffd43b',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: '#000'
                      }}
                    >
                      Mark as Pending
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default Commissions

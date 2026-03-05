import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function Commissions() {
  const [commissions, setCommissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [filter, setFilter] = useState('all') // all, pending, paid
  
  // Date filter states
  const [dateFilterType, setDateFilterType] = useState('all') // all, year, month, custom
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  
  // Payment date modal
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPolicyId, setSelectedPolicyId] = useState(null)
  const [customPaymentDate, setCustomPaymentDate] = useState(new Date().toISOString().split('T')[0])

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
        .order('start_date', { ascending: false })

      if (error) throw error
      setCommissions(data || [])
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const openPaymentModal = (policyId) => {
    setSelectedPolicyId(policyId)
    setCustomPaymentDate(new Date().toISOString().split('T')[0])
    setShowPaymentModal(true)
  }

  const confirmMarkAsPaid = async () => {
    try {
      const { error } = await supabase
        .from('client_policies')
        .update({ 
          payment_status: 'paid',
          payment_date: customPaymentDate
        })
        .eq('id', selectedPolicyId)

      if (error) throw error

      setSuccess('Commission marked as paid!')
      setShowPaymentModal(false)
      setSelectedPolicyId(null)
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

  const getAvailableYears = () => {
    if (commissions.length === 0) return []
    
    const years = commissions.map(c => new Date(c.start_date).getFullYear())
    return [...new Set(years)].sort((a, b) => b - a)
  }

  const filterByDate = (commission) => {
    const commissionDate = new Date(commission.start_date)
    
    switch (dateFilterType) {
      case 'all':
        return true
      
      case 'year':
        return commissionDate.getFullYear() === selectedYear
      
      case 'month':
        return commissionDate.getFullYear() === selectedYear && 
               commissionDate.getMonth() + 1 === selectedMonth
      
      case 'custom':
        if (!customStartDate || !customEndDate) return true
        const start = new Date(customStartDate)
        const end = new Date(customEndDate)
        return commissionDate >= start && commissionDate <= end
      
      default:
        return true
    }
  }

  const getFilteredCommissions = () => {
    return commissions.filter(commission => {
      // Filter by status
      const statusMatch = filter === 'all' || commission.payment_status === filter
      
      // Filter by date
      const dateMatch = filterByDate(commission)
      
      return statusMatch && dateMatch
    })
  }

  const calculateTotals = () => {
    const filtered = getFilteredCommissions()
    const total = filtered.reduce((sum, c) => sum + (parseFloat(c.commission_amount) || 0), 0)
    const paid = filtered.filter(c => c.payment_status === 'paid').reduce((sum, c) => sum + (parseFloat(c.commission_amount) || 0), 0)
    const pending = filtered.filter(c => c.payment_status === 'pending').reduce((sum, c) => sum + (parseFloat(c.commission_amount) || 0), 0)
    
    return { total, paid, pending, count: filtered.length }
  }

  if (loading) {
    return <div className="loading">Loading commissions...</div>
  }

  const totals = calculateTotals()
  const filteredCommissions = getFilteredCommissions()
  const availableYears = getAvailableYears()

  return (
    <div>
      <h2>Commissions</h2>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Commissions</div>
          <div className="stat-value">${totals.total.toFixed(2)}</div>
          <small>{totals.count} policies</small>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Paid</div>
          <div className="stat-value" style={{ color: '#51cf66' }}>${totals.paid.toFixed(2)}</div>
          <small>{filteredCommissions.filter(c => c.payment_status === 'paid').length} policies</small>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value" style={{ color: '#ffd43b' }}>${totals.pending.toFixed(2)}</div>
          <small>{filteredCommissions.filter(c => c.payment_status === 'pending').length} policies</small>
        </div>
      </div>

      {/* Status Filter */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1em', marginBottom: '0.75rem' }}>Filter by Status</h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setFilter('all')}
            style={{ 
              backgroundColor: filter === 'all' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              fontWeight: filter === 'all' ? '600' : '400'
            }}
          >
            All ({commissions.length})
          </button>
          <button 
            onClick={() => setFilter('pending')}
            style={{ 
              backgroundColor: filter === 'pending' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              fontWeight: filter === 'pending' ? '600' : '400'
            }}
          >
            Pending ({commissions.filter(c => c.payment_status === 'pending').length})
          </button>
          <button 
            onClick={() => setFilter('paid')}
            style={{ 
              backgroundColor: filter === 'paid' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              fontWeight: filter === 'paid' ? '600' : '400'
            }}
          >
            Paid ({commissions.filter(c => c.payment_status === 'paid').length})
          </button>
        </div>
      </div>

      {/* Date Filter */}
      <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <h3 style={{ fontSize: '1.1em', marginBottom: '1rem' }}>Filter by Commission Date (Policy Start Date)</h3>
        
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setDateFilterType('all')}
            style={{ 
              backgroundColor: dateFilterType === 'all' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              fontWeight: dateFilterType === 'all' ? '600' : '400'
            }}
          >
            All Data
          </button>
          <button 
            onClick={() => setDateFilterType('year')}
            style={{ 
              backgroundColor: dateFilterType === 'year' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              fontWeight: dateFilterType === 'year' ? '600' : '400'
            }}
          >
            By Year
          </button>
          <button 
            onClick={() => setDateFilterType('month')}
            style={{ 
              backgroundColor: dateFilterType === 'month' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              fontWeight: dateFilterType === 'month' ? '600' : '400'
            }}
          >
            By Month
          </button>
          <button 
            onClick={() => setDateFilterType('custom')}
            style={{ 
              backgroundColor: dateFilterType === 'custom' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              fontWeight: dateFilterType === 'custom' ? '600' : '400'
            }}
          >
            Custom Range
          </button>
        </div>

        {dateFilterType === 'year' && (
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Select Year:</label>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              style={{ 
                padding: '0.5rem', 
                borderRadius: '8px', 
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                minWidth: '150px'
              }}
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        )}

        {dateFilterType === 'month' && (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Year:</label>
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                style={{ 
                  padding: '0.5rem', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  minWidth: '120px'
                }}
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Month:</label>
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                style={{ 
                  padding: '0.5rem', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  minWidth: '150px'
                }}
              >
                <option value={1}>January</option>
                <option value={2}>February</option>
                <option value={3}>March</option>
                <option value={4}>April</option>
                <option value={5}>May</option>
                <option value={6}>June</option>
                <option value={7}>July</option>
                <option value={8}>August</option>
                <option value={9}>September</option>
                <option value={10}>October</option>
                <option value={11}>November</option>
                <option value={12}>December</option>
              </select>
            </div>
          </div>
        )}

        {dateFilterType === 'custom' && (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Start Date:</label>
              <input 
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{ 
                  padding: '0.5rem', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>End Date:</label>
              <input 
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={{ 
                  padding: '0.5rem', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>
        )}
      </div>

      <h3>Commission List ({filteredCommissions.length})</h3>
      
      {filteredCommissions.length === 0 ? (
        <p>No commissions found with the selected filters.</p>
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
              <th>Commission Date</th>
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
                    <div style={{ fontSize: '0.85em', color: 'var(--text-tertiary)' }}>
                      {commission.clients?.phone_number}
                    </div>
                  )}
                </td>
                <td>{commission.insurance_companies?.name}</td>
                <td>{commission.insurance_policy_types?.name}</td>
                <td>
                  ${parseFloat(commission.amount).toFixed(2)}
                  {commission.discount > 0 && (
                    <div style={{ fontSize: '0.85em', color: 'var(--text-tertiary)' }}>
                      Discount: -${parseFloat(commission.discount).toFixed(2)}
                    </div>
                  )}
                </td>
                <td>
                  <strong style={{ color: 'var(--success)', fontSize: '1.1em' }}>
                    ${parseFloat(commission.commission_amount).toFixed(2)}
                  </strong>
                  <div style={{ fontSize: '0.85em', color: 'var(--text-tertiary)' }}>
                    {(parseFloat(commission.commission_rate) * 100).toFixed(2)}%
                  </div>
                </td>
                <td>
                  <span style={{ 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '12px',
                    backgroundColor: commission.payment_status === 'paid' ? 'var(--success-bg)' : 'var(--warning-bg)',
                    color: commission.payment_status === 'paid' ? 'var(--success)' : 'var(--warning)',
                    fontWeight: '500'
                  }}>
                    {commission.payment_status}
                  </span>
                </td>
                <td>{new Date(commission.start_date).toLocaleDateString()}</td>
                <td>
                  {commission.payment_date 
                    ? new Date(commission.payment_date).toLocaleDateString()
                    : '-'
                  }
                </td>
                <td>
                  {commission.payment_status === 'pending' ? (
                    <button
                      onClick={() => openPaymentModal(commission.id)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.9em',
                        backgroundColor: 'var(--success)',
                        border: 'none',
                        borderRadius: '6px',
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
                        backgroundColor: 'var(--warning)',
                        border: 'none',
                        borderRadius: '6px',
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

      {/* Payment Date Modal */}
      {showPaymentModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            padding: '2rem',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Set Payment Date</h3>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                Payment Date:
              </label>
              <input
                type="date"
                value={customPaymentDate}
                onChange={(e) => setCustomPaymentDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontSize: '1em'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmMarkAsPaid}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, var(--success) 0%, #059669 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Commissions

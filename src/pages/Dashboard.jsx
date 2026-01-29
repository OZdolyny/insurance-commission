import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function Dashboard() {
  const [stats, setStats] = useState({
    totalClients: 0,
    totalPolicies: 0,
    totalCompanies: 0,
    totalCommissions: 0,
    paidCommissions: 0,
    pendingCommissions: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Fetch total clients
      const { count: clientCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })

      // Fetch total policies
      const { count: policyCount } = await supabase
        .from('client_policies')
        .select('*', { count: 'exact', head: true })

      // Fetch total companies
      const { count: companyCount } = await supabase
        .from('insurance_companies')
        .select('*', { count: 'exact', head: true })

      // Fetch commissions
      const { data: policies } = await supabase
        .from('client_policies')
        .select('commission_amount, payment_status')

      const totalCommissions = policies?.reduce((sum, p) => sum + (parseFloat(p.commission_amount) || 0), 0) || 0
      const paidCommissions = policies?.filter(p => p.payment_status === 'paid').reduce((sum, p) => sum + (parseFloat(p.commission_amount) || 0), 0) || 0
      const pendingCommissions = policies?.filter(p => p.payment_status === 'pending').reduce((sum, p) => sum + (parseFloat(p.commission_amount) || 0), 0) || 0

      setStats({
        totalClients: clientCount || 0,
        totalPolicies: policyCount || 0,
        totalCompanies: companyCount || 0,
        totalCommissions: totalCommissions,
        paidCommissions: paidCommissions,
        pendingCommissions: pendingCommissions
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Loading dashboard...</div>
  }

  return (
    <div>
      <h2>Dashboard</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Clients</div>
          <div className="stat-value">{stats.totalClients}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Active Policies</div>
          <div className="stat-value">{stats.totalPolicies}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Insurance Companies</div>
          <div className="stat-value">{stats.totalCompanies}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Total Earned</div>
          <div className="stat-value">${stats.totalCommissions.toFixed(2)}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Paid</div>
          <div className="stat-value" style={{ color: '#51cf66' }}>${stats.paidCommissions.toFixed(2)}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value" style={{ color: '#ffd43b' }}>${stats.pendingCommissions.toFixed(2)}</div>
        </div>
      </div>

      <div className="card">
        <h3>Quick Start Guide</h3>
        <p>Welcome to your Insurance Commission Tracker! Follow these steps to get started:</p>
        <ol style={{ marginTop: '1rem', marginLeft: '1.5rem', lineHeight: '2' }}>
          <li><strong>Companies:</strong> Add the insurance companies you work with</li>
          <li><strong>Policy Types:</strong> Define the types of policies you sell (Life, Health, Auto, etc.)</li>
          <li><strong>Rates:</strong> Set commission rates for each company/policy type combination</li>
          <li><strong>Clients:</strong> Add your clients' information</li>
          <li><strong>Policies:</strong> Create policies for your clients (commission is auto-calculated)</li>
          <li><strong>Commissions:</strong> Track and mark commissions as paid</li>
        </ol>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <h3>💡 Pro Tips</h3>
        <ul style={{ marginTop: '1rem', marginLeft: '1.5rem', lineHeight: '2' }}>
          <li>Set up your companies and policy types first before adding policies</li>
          <li>The commission rate will be automatically applied when you create a policy</li>
          <li>You can filter commissions by status (All, Pending, Paid)</li>
          <li>Discount amounts are automatically subtracted before calculating commission</li>
        </ul>
      </div>
    </div>
  )
}

export default Dashboard

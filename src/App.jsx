import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Policies from './pages/Policies'
import Commissions from './pages/Commissions'
import Companies from './pages/Companies'
import PolicyTypes from './pages/PolicyTypes'
import PolicyRates from './pages/PolicyRates'
import './index.css'

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />
      case 'clients':
        return <Clients />
      case 'policies':
        return <Policies />
      case 'commissions':
        return <Commissions />
      case 'companies':
        return <Companies />
      case 'policy-types':
        return <PolicyTypes />
      case 'policy-rates':
        return <PolicyRates />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="app">
      <h1>💼 Insurance Commission Tracker</h1>
      
      <nav>
        <button 
          className={currentPage === 'dashboard' ? 'active' : ''}
          onClick={() => setCurrentPage('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={currentPage === 'clients' ? 'active' : ''}
          onClick={() => setCurrentPage('clients')}
        >
          Clients
        </button>
        <button 
          className={currentPage === 'policies' ? 'active' : ''}
          onClick={() => setCurrentPage('policies')}
        >
          Policies
        </button>
        <button 
          className={currentPage === 'commissions' ? 'active' : ''}
          onClick={() => setCurrentPage('commissions')}
        >
          Commissions
        </button>
        <button 
          className={currentPage === 'companies' ? 'active' : ''}
          onClick={() => setCurrentPage('companies')}
        >
          Companies
        </button>
        <button 
          className={currentPage === 'policy-types' ? 'active' : ''}
          onClick={() => setCurrentPage('policy-types')}
        >
          Policy Types
        </button>
        <button 
          className={currentPage === 'policy-rates' ? 'active' : ''}
          onClick={() => setCurrentPage('policy-rates')}
        >
          Rates
        </button>
      </nav>

      {renderPage()}
    </div>
  )
}

export default App

import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Policies from './pages/Policies'
import Commissions from './pages/Commissions'
import Companies from './pages/Companies'
import PolicyTypes from './pages/PolicyTypes'
import PolicyRates from './pages/PolicyRates'
import { Sidebar } from './components/Sidebar'
import { cn } from './lib/utils'
import './index.css'

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const pageTitle = {
    dashboard: 'Overview',
    clients: 'Clients',
    policies: 'Policies',
    commissions: 'Commissions',
    companies: 'Insurance Companies',
    'policy-types': 'Policy Types',
    'policy-rates': 'Commission Rates',
  }

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
    <div className="min-h-screen bg-background">
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />
      
      <main
        className={cn(
          'min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <h1 className="text-xl font-semibold text-foreground">
            {pageTitle[currentPage]}
          </h1>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {renderPage()}
        </div>
      </main>
    </div>
  )
}

export default App

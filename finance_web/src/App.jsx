import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Chat from './pages/Chat'
import Portfolio from './pages/Portfolio'

const NAV = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'chat', label: '💬 Chat' },
  { id: 'transactions', label: '📋 Transaksi' },
  { id: 'portfolio', label: '₿ Portfolio' },
]

export default function App() {
  const [page, setPage] = useState('dashboard')

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Navbar */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-6">
        <span className="text-emerald-400 font-bold text-lg tracking-tight">
          Finance<span className="text-white">AI</span>
        </span>
        <div className="flex gap-2">
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => setPage(n.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                page === n.id
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {n.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="p-6">
        {page === 'dashboard' && <Dashboard />}
        {page === 'chat' && <Chat />}
        {page === 'transactions' && <Transactions />}
        {page === 'portfolio' && <Portfolio />}
      </main>
    </div>
  )
}

import { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Chat from './pages/Chat'
import Portfolio from './pages/Portfolio'
import Advisor from './pages/Advisor'

const NAV = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'chat', label: '💬 Chat' },
  { id: 'transactions', label: '📋 Transaksi' },
  { id: 'portfolio', label: '₿ Portfolio' },
  { id: 'advisor', label: '🤖 AI Advisor' },
]

const LEVEL_CONFIG = {
  1: { color: '#ef4444', label: 'KRITIS', dot: 'bg-red-500' },
  2: { color: '#f97316', label: 'WASPADA', dot: 'bg-orange-500' },
  3: { color: '#f59e0b', label: 'CUKUP', dot: 'bg-yellow-500' },
  4: { color: '#3b82f6', label: 'SEHAT', dot: 'bg-blue-500' },
  5: { color: '#10b981', label: 'PRIMA', dot: 'bg-emerald-500' },
}

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [healthLevel, setHealthLevel] = useState(null)

  useEffect(() => {
    const month = new Date().toISOString().slice(0, 7)
    fetch(`http://100.110.240.44:8001/api/v1/health-score?month=${month}`)
      .then(r => r.json())
      .then(d => setHealthLevel(d.level))
      .catch(() => {})
  }, [])

  const cfg = healthLevel ? LEVEL_CONFIG[healthLevel] : null

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-6">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400 font-bold text-lg tracking-tight">
            Finance<span className="text-white">AI</span>
          </span>
          {cfg && (
            <div className="flex items-center gap-1.5 bg-gray-800 rounded-full px-3 py-1">
              <span className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`}/>
              <span style={{ color: cfg.color }} className="text-xs font-bold">{cfg.label}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                page === n.id
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}>
              {n.label}
            </button>
          ))}
        </div>
      </nav>
      <main className="p-6">
        {page === 'dashboard' && <Dashboard />}
        {page === 'chat' && <Chat />}
        {page === 'transactions' && <Transactions />}
        {page === 'portfolio' && <Portfolio />}
        {page === 'advisor' && <Advisor />}
      </main>
    </div>
  )
}

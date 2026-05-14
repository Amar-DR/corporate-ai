import { useEffect, useState } from 'react'
import { getSummary, getHealthScore, getToday } from '../api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

const Card = ({ title, value, sub, color = 'emerald' }) => (
  <div className={`bg-gray-900 border border-gray-800 rounded-xl p-5`}>
    <div className="text-gray-400 text-xs uppercase tracking-widest mb-1">{title}</div>
    <div className={`text-2xl font-bold text-${color}-400`}>{value}</div>
    {sub && <div className="text-gray-500 text-xs mt-1">{sub}</div>}
  </div>
)

const LEVEL_COLOR = { 1: 'red', 2: 'orange', 3: 'yellow', 4: 'blue', 5: 'emerald' }

export default function Dashboard() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [summary, setSummary] = useState(null)
  const [health, setHealth] = useState(null)
  const [today, setToday] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getSummary(month).then(r => setSummary(r.data)),
      getHealthScore(month).then(r => setHealth(r.data)),
      getToday().then(r => setToday(r.data)),
    ]).finally(() => setLoading(false))
  }, [month])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-emerald-400 text-lg animate-pulse">
      Memuat data...
    </div>
  )

  const chartData = summary?.daily_chart?.reduce((acc, item) => {
    const existing = acc.find(d => d.date === item.date)
    if (existing) {
      existing[item.type] = item.total
    } else {
      acc.push({ date: item.date.slice(5), [item.type]: item.total })
    }
    return acc
  }, []) || []

  const levelColor = LEVEL_COLOR[health?.level] || 'emerald'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-sm"
        />
      </div>

      {/* Today strip */}
      {today && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex gap-6 flex-wrap">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-widest">Hari Ini — Masuk</div>
            <div className="text-emerald-400 font-bold text-lg">{fmt(today.total_income)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-widest">Hari Ini — Keluar</div>
            <div className="text-red-400 font-bold text-lg">{fmt(today.total_expense)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-widest">Net Hari Ini</div>
            <div className={`font-bold text-lg ${today.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {fmt(today.net)}
            </div>
          </div>
          <div className="ml-auto text-xs text-gray-600 self-end">{today.transaction_count || today.transactions?.length} transaksi</div>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card title="Total Pemasukan" value={fmt(summary.summary.total_income)} color="emerald" />
          <Card title="Total Pengeluaran" value={fmt(summary.summary.total_expense)} color="red" />
          <Card title="Net Cashflow" value={fmt(summary.summary.net_cashflow)} color={summary.summary.net_cashflow >= 0 ? 'emerald' : 'red'} />
          <Card title="Saving Rate" value={`${summary.summary.saving_rate_pct}%`} color="blue" />
        </div>
      )}

      {/* Health Score */}
      {health && !health.error && (
        <div className={`bg-gray-900 border border-${levelColor}-500/30 rounded-xl p-5`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Health Score</div>
              <div className={`text-3xl font-black text-${levelColor}-400`}>{health.score}<span className="text-base text-gray-500">/100</span></div>
              <div className={`text-sm font-bold text-${levelColor}-400 mt-1`}>Level {health.level} — {health.label}</div>
            </div>
            <div className="text-right">
              <div className="text-gray-400 text-sm max-w-xs">{health.advice}</div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 mt-4">
            {Object.entries(health.breakdown).filter(([k]) => k.startsWith('score')).map(([k, v]) => (
              <div key={k} className="bg-gray-800 rounded-lg p-3 text-center">
                <div className={`text-${levelColor}-400 font-bold text-lg`}>{v}</div>
                <div className="text-gray-500 text-xs mt-1">{k.replace('score_', '').replace('_', ' ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="text-sm text-gray-400 mb-4 font-medium">Cashflow Harian</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
              <Legend />
              <Bar dataKey="income" name="Masuk" fill="#10b981" radius={[4,4,0,0]} />
              <Bar dataKey="expense" name="Keluar" fill="#ef4444" radius={[4,4,0,0]} />
              <Bar dataKey="invest_in" name="Invest" fill="#3b82f6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Expenses */}
      {summary?.top_expenses?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="text-sm text-gray-400 mb-3 font-medium">Top Pengeluaran</div>
          <div className="space-y-2">
            {summary.top_expenses.map((e, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                <span className="text-gray-300 text-sm">{e.note}</span>
                <span className="text-red-400 font-medium text-sm">{fmt(e.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

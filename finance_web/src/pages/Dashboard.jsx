import { useEffect, useState } from 'react'
import { getSummary, getHealthScore, getToday } from '../api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line, CartesianGrid, ReferenceLine } from 'recharts'

const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
const fmtShort = (n) => n >= 1000000 ? `${(n/1000000).toFixed(2)}M` : `${(n/1000).toFixed(0)}k`

const Card = ({ title, value, sub, color = 'emerald' }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
    <div className="text-gray-400 text-xs uppercase tracking-widest mb-1">{title}</div>
    <div className={`text-2xl font-bold text-${color}-400`}>{value}</div>
    {sub && <div className="text-gray-500 text-xs mt-1">{sub}</div>}
  </div>
)

const LEVEL_COLOR = { 1: 'red', 2: 'orange', 3: 'yellow', 4: 'blue', 5: 'emerald' }

const CustomDot = (props) => {
  const { cx, cy, payload } = props
  if (!payload.notes) return null
  return <circle cx={cx} cy={cy} r={5} fill="#f59e0b" stroke="#111827" strokeWidth={2} />
}

export default function Dashboard() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [summary, setSummary] = useState(null)
  const [health, setHealth] = useState(null)
  const [today, setToday] = useState(null)
  const [networth, setNetworth] = useState(null)
  const [snapshots, setSnapshots] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getSummary(month).then(r => setSummary(r.data)),
      getHealthScore(month).then(r => setHealth(r.data)),
      getToday().then(r => setToday(r.data)),
      fetch('http://100.110.240.44:8001/api/v1/networth')
        .then(r => r.json()).then(d => setNetworth(d)).catch(() => {}),
      fetch('http://100.110.240.44:8001/api/v1/networth/snapshots')
        .then(r => r.json()).then(d => setSnapshots(d.snapshots || [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [month])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-emerald-400 text-lg animate-pulse">
      Memuat data...
    </div>
  )

  const chartData = summary?.daily_chart?.reduce((acc, item) => {
    const existing = acc.find(d => d.date === item.date)
    if (existing) { existing[item.type] = item.total }
    else { acc.push({ date: item.date.slice(5), [item.type]: item.total }) }
    return acc
  }, []) || []

  const levelColor = LEVEL_COLOR[health?.level] || 'emerald'

  // Hitung growth dari baseline
  const firstSnapshot = snapshots[0]
  const lastSnapshot = snapshots[snapshots.length - 1]
  const growth = firstSnapshot && lastSnapshot
    ? lastSnapshot.total - firstSnapshot.total
    : 0
  const growthPct = firstSnapshot ? ((growth / firstSnapshot.total) * 100).toFixed(1) : 0

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const snap = snapshots.find(s => s.date === label)
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs">
        <div className="text-gray-400 mb-1">{label}</div>
        <div className="text-emerald-400 font-bold">{fmt(payload[0]?.value)}</div>
        {snap?.notes && <div className="text-yellow-400 mt-1">📌 {snap.notes}</div>}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-sm" />
      </div>

      {/* Networth Card */}
      {networth && (
        <div className="bg-gray-900 border border-emerald-500/40 rounded-xl p-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">Total Networth</div>
              <div className="text-4xl font-black text-emerald-400">{fmt(networth.total_networth_idr)}</div>
              <div className="flex gap-6 mt-3">
                <div>
                  <div className="text-xs text-gray-600 mb-0.5">Crypto</div>
                  <div className="text-blue-400 font-semibold text-sm">{fmt(networth.breakdown.crypto)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-0.5">Cash</div>
                  <div className="text-gray-400 font-semibold text-sm">{fmt(networth.breakdown.cash)}</div>
                </div>
                {growth !== 0 && (
                  <div>
                    <div className="text-xs text-gray-600 mb-0.5">Growth (Jan–Now)</div>
                    <div className={`font-semibold text-sm ${growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {growth >= 0 ? '+' : ''}{fmt(growth)} ({growthPct}%)
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              {networth.holdings?.map(h => (
                <div key={h.asset} className="mb-1">
                  <span className="text-gray-500 text-xs">{h.asset}: </span>
                  <span className="text-white text-xs font-medium">{h.qty.toFixed(5)} → {fmt(h.value_idr)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
            <div className={`font-bold text-lg ${today.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(today.net)}</div>
          </div>
          <div className="ml-auto text-xs text-gray-600 self-end">{today.transactions?.length} transaksi</div>
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
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Health Score</div>
              <div className={`text-3xl font-black text-${levelColor}-400`}>
                {health.score}<span className="text-base text-gray-500">/100</span>
              </div>
              <div className={`text-sm font-bold text-${levelColor}-400 mt-1`}>
                Level {health.level} — {health.label}
              </div>
            </div>
            <div className="text-right max-w-xs">
              <div className="text-gray-400 text-sm leading-relaxed">{health.advice}</div>
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

      {/* Networth Snapshot Chart */}
      {snapshots.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-400 font-medium">📈 Pertumbuhan Networth (Weekly)</div>
            <div className="text-xs text-gray-600 flex gap-3">
              <span className="text-yellow-400">● Event penting</span>
              <span className="text-emerald-400">● Networth</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={snapshots} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }}
                tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={fmtShort} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="total"
                name="Networth"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={<CustomDot />}
                activeDot={{ r: 6, fill: '#10b981' }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 text-xs text-gray-600 text-center">
            Titik kuning = event penting (hover untuk detail)
          </div>
        </div>
      )}

      {/* Cashflow Chart */}
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

import { useEffect, useState } from 'react'
import { getTransactions, deleteTransaction } from '../api'

const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

const TYPE_COLOR = {
  income: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  expense: 'bg-red-500/10 text-red-400 border-red-500/30',
  invest_in: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  invest_out: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
}

const TYPE_LABEL = {
  income: 'Pemasukan',
  expense: 'Pengeluaran',
  invest_in: 'Investasi',
  invest_out: 'Tarik Invest',
}

export default function Transactions() {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ type: '', keyword: '' })
  const [offset, setOffset] = useState(0)
  const LIMIT = 20

  const load = async () => {
    setLoading(true)
    try {
      const res = await getTransactions({
        type: filter.type || undefined,
        keyword: filter.keyword || undefined,
        limit: LIMIT,
        offset,
      })
      setData(res.data.data)
      setTotal(res.data.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter, offset])

  const handleDelete = async (id) => {
    if (!confirm('Hapus transaksi ini?')) return
    await deleteTransaction(id)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">📋 Transaksi</h1>
        <span className="text-gray-500 text-sm">{total} total</span>
      </div>

      {/* Filter */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={filter.type}
          onChange={e => { setFilter(f => ({ ...f, type: e.target.value })); setOffset(0) }}
          className="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Semua Tipe</option>
          <option value="income">Pemasukan</option>
          <option value="expense">Pengeluaran</option>
          <option value="invest_in">Investasi</option>
          <option value="invest_out">Tarik Invest</option>
        </select>
        <input
          value={filter.keyword}
          onChange={e => { setFilter(f => ({ ...f, keyword: e.target.value })); setOffset(0) }}
          placeholder="Cari catatan..."
          className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm flex-1 min-w-48"
        />
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-emerald-400 animate-pulse">Memuat...</div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-gray-600">Tidak ada transaksi</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Tanggal</th>
                <th className="text-left px-4 py-3">Tipe</th>
                <th className="text-left px-4 py-3">Catatan</th>
                <th className="text-right px-4 py-3">Jumlah</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((t, i) => (
                <tr key={t.id} className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-900/50'}`}>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{t.date}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${TYPE_COLOR[t.type]}`}>
                      {TYPE_LABEL[t.type] || t.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 max-w-xs truncate">
                    {t.note || '-'}
                    {t.asset && <span className="ml-2 text-blue-400 text-xs">{t.asset} {t.asset_qty && `(${t.asset_qty})`}</span>}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${
                    t.type === 'income' ? 'text-emerald-400' : t.type === 'invest_in' ? 'text-blue-400' : 'text-red-400'
                  }`}>
                    {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-gray-600 hover:text-red-400 transition-colors text-xs"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setOffset(o => Math.max(0, o - LIMIT))}
          disabled={offset === 0}
          className="px-4 py-2 bg-gray-800 text-gray-400 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-700"
        >
          ← Prev
        </button>
        <span className="text-gray-500 text-sm">
          {offset + 1}–{Math.min(offset + LIMIT, total)} dari {total}
        </span>
        <button
          onClick={() => setOffset(o => o + LIMIT)}
          disabled={offset + LIMIT >= total}
          className="px-4 py-2 bg-gray-800 text-gray-400 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-700"
        >
          Next →
        </button>
      </div>
    </div>
  )
}

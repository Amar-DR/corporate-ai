import { useEffect, useState } from 'react'
import { getCryptoPortfolio, getPortfolioPrices } from '../api'

const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function Portfolio() {
  const [portfolio, setPortfolio] = useState(null)
  const [prices, setPrices] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [p, pr] = await Promise.all([
        getCryptoPortfolio(),
        getPortfolioPrices(),
      ])
      setPortfolio(p.data)
      setPrices(pr.data)
      setLastUpdate(new Date().toLocaleTimeString('id-ID'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">₿ Portfolio Crypto</h1>
        <div className="flex items-center gap-3">
          {lastUpdate && <span className="text-gray-600 text-xs">Update: {lastUpdate}</span>}
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs transition-all disabled:opacity-40"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Harga Realtime */}
      {prices && (
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(prices.prices).map(([asset, price]) => (
            <div key={asset} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{asset === 'BTC' ? '₿' : '💵'}</span>
                <span className="text-gray-400 text-xs uppercase tracking-widest">{asset} / IDR</span>
              </div>
              <div className="text-white font-bold text-xl">{fmt(price)}</div>
              <div className="text-gray-600 text-xs mt-1">via CoinGecko</div>
            </div>
          ))}
        </div>
      )}

      {/* Holdings */}
      {loading ? (
        <div className="text-center py-12 text-emerald-400 animate-pulse">Memuat portfolio...</div>
      ) : portfolio?.holdings?.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <div className="text-gray-600 text-4xl mb-3">₿</div>
          <div className="text-gray-500">Belum ada holdings crypto.</div>
          <div className="text-gray-600 text-sm mt-1">Catat transaksi crypto via Chat.</div>
        </div>
      ) : (
        <>
          {/* Summary */}
          {portfolio?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Market Value</div>
                <div className="text-white font-bold text-lg">{fmt(portfolio.summary.total_market_value_idr)}</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Total Invested</div>
                <div className="text-white font-bold text-lg">{fmt(portfolio.summary.total_invested_idr)}</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">P&L</div>
                <div className={`font-bold text-lg ${portfolio.summary.total_pnl_idr >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {portfolio.summary.total_pnl_idr >= 0 ? '+' : ''}{fmt(portfolio.summary.total_pnl_idr)}
                </div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Return</div>
                <div className={`font-bold text-lg ${portfolio.summary.total_pnl_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {portfolio.summary.total_pnl_pct >= 0 ? '+' : ''}{portfolio.summary.total_pnl_pct}%
                </div>
              </div>
            </div>
          )}

          {/* Holdings detail */}
          <div className="space-y-3">
            {portfolio.holdings.map((h) => (
              <div key={h.asset} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-lg">
                      {h.asset === 'BTC' ? '₿' : '💵'}
                    </div>
                    <div>
                      <div className="font-bold text-white">{h.asset}</div>
                      <div className="text-gray-500 text-xs">{h.qty} {h.asset}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white text-lg">{fmt(h.market_value_idr)}</div>
                    <div className={`text-sm font-medium ${h.pnl_idr >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {h.pnl_idr >= 0 ? '+' : ''}{fmt(h.pnl_idr)} ({h.pnl_pct >= 0 ? '+' : ''}{h.pnl_pct}%)
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Harga Sekarang</div>
                    <div className="text-white text-sm font-medium">{fmt(h.price_idr)}</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Total Invested</div>
                    <div className="text-white text-sm font-medium">{fmt(h.total_invested_idr)}</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Avg Buy Price</div>
                    <div className="text-white text-sm font-medium">
                      {h.qty > 0 ? fmt(h.total_invested_idr / h.qty) : '-'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

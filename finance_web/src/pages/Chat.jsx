import { useState, useRef, useEffect } from 'react'
import { sendChat } from '../api'

const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

const TYPE_COLOR = {
  income: 'text-emerald-400',
  expense: 'text-red-400',
  invest_in: 'text-blue-400',
  invest_out: 'text-orange-400',
}

const TYPE_LABEL = {
  income: '↑ Pemasukan',
  expense: '↓ Pengeluaran',
  invest_in: '→ Investasi',
  invest_out: '← Tarik Invest',
}

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Halo! Ceritakan transaksi kamu hari ini. Contoh: "tadi beli ayam geprek 15k dan dapat uang saku 100k"',
      transactions: [],
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)

    try {
      const res = await sendChat(userMsg)
      const data = res.data
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: data.saved > 0
          ? `✅ Berhasil mencatat ${data.saved} transaksi!`
          : '⚠️ Tidak ada transaksi yang terdeteksi. Coba sebutkan nominal dan jenis transaksinya.',
        transactions: data.transactions || [],
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: '❌ Gagal terhubung ke server. Pastikan backend jalan.',
        transactions: [],
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[80vh]">
      <h1 className="text-xl font-bold text-white mb-4">💬 Chat Transaksi</h1>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-sm rounded-2xl px-4 py-3 text-sm ${
              msg.role === 'user'
                ? 'bg-emerald-600 text-white rounded-br-sm'
                : 'bg-gray-800 text-gray-200 rounded-bl-sm'
            }`}>
              <p>{msg.text}</p>

              {/* Transaksi hasil parse */}
              {msg.transactions?.length > 0 && (
                <div className="mt-3 space-y-2">
                  {msg.transactions.map((t, j) => (
                    <div key={j} className="bg-gray-900 rounded-lg px-3 py-2 border border-gray-700">
                      <div className="flex justify-between items-center">
                        <span className={`text-xs font-bold ${TYPE_COLOR[t.type]}`}>
                          {TYPE_LABEL[t.type]}
                        </span>
                        <span className={`font-bold text-sm ${TYPE_COLOR[t.type]}`}>
                          {fmt(t.amount)}
                        </span>
                      </div>
                      <div className="text-gray-400 text-xs mt-1">{t.category} · {t.date}</div>
                      {t.asset && (
                        <div className="text-blue-400 text-xs mt-1">
                          {t.asset} {t.asset_qty && `· ${t.asset_qty} unit`}
                          {t.platform && ` · ${t.platform}`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ceritakan transaksi kamu..."
          className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-xl px-5 py-3 text-sm font-bold transition-all"
        >
          Kirim
        </button>
      </div>
    </div>
  )
}

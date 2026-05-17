import { useState } from 'react'

const API = 'http://100.110.240.44:8001/api/v1/ai'

export default function Advisor() {
  const [activeTab, setActiveTab] = useState('chat')
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Halo! Tanya apa saja tentang keuanganmu. Contoh: "Bulan April aku boros di mana?" atau "Prediksi keuanganku bulan depan?"' }
  ])
  const [report, setReport] = useState(null)
  const [anomaly, setAnomaly] = useState(null)
  const [loading, setLoading] = useState(false)

  const sendChat = async () => {
    if (!question.trim() || loading) return
    const q = question.trim()
    setQuestion('')
    setMessages(prev => [...prev, { role: 'user', text: q }])
    setLoading(true)
    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, month })
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', text: data.answer }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: '❌ Gagal terhubung ke AI.' }])
    } finally {
      setLoading(false)
    }
  }

  const fetchReport = async () => {
    setLoading(true)
    setReport(null)
    try {
      const res = await fetch(`${API}/report?month=${month}`)
      const data = await res.json()
      setReport(data.report)
    } finally {
      setLoading(false)
    }
  }

  const fetchAnomaly = async () => {
    setLoading(true)
    setAnomaly(null)
    try {
      const res = await fetch(`${API}/anomaly?month=${month}`)
      const data = await res.json()
      setAnomaly(data.anomaly_analysis)
    } finally {
      setLoading(false)
    }
  }

  const formatMarkdown = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/### (.*?)$/gm, '<h3 class="text-emerald-400 font-bold mt-4 mb-2">$1</h3>')
      .replace(/## (.*?)$/gm, '<h2 class="text-white font-bold text-lg mt-4 mb-2">$1</h2>')
      .replace(/\n/g, '<br/>')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">🤖 AI Advisor</h1>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-sm"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'chat', label: '💬 Chat' },
          { id: 'report', label: '📄 Laporan Bulanan' },
          { id: 'anomaly', label: '⚠️ Anomaly Detection' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-gray-400 hover:text-white bg-gray-800'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className="flex flex-col h-[65vh]">
          <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-2xl rounded-2xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-sm'
                    : 'bg-gray-800 text-gray-200 rounded-bl-sm'
                }`}>
                  <div dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.text) }} />
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 rounded-2xl px-4 py-3 flex gap-1">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendChat()}
              placeholder="Tanya tentang keuanganmu..."
              className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500"
            />
            <button onClick={sendChat} disabled={loading || !question.trim()}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-xl px-5 py-3 text-sm font-bold">
              Kirim
            </button>
          </div>
        </div>
      )}

      {/* Report Tab */}
      {activeTab === 'report' && (
        <div>
          <button onClick={fetchReport} disabled={loading}
            className="mb-4 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-xl text-sm font-bold">
            {loading ? '⏳ Generating...' : `📄 Generate Laporan ${month}`}
          </button>
          {report && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-sm text-gray-300 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: formatMarkdown(report) }} />
          )}
        </div>
      )}

      {/* Anomaly Tab */}
      {activeTab === 'anomaly' && (
        <div>
          <button onClick={fetchAnomaly} disabled={loading}
            className="mb-4 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl text-sm font-bold">
            {loading ? '⏳ Menganalisis...' : `⚠️ Deteksi Anomali ${month}`}
          </button>
          {anomaly && (
            <div className="bg-gray-900 border border-orange-500/20 rounded-xl p-6 text-sm text-gray-300 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: formatMarkdown(anomaly) }} />
          )}
        </div>
      )}
    </div>
  )
}

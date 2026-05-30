import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

const QUICK_REPLIES = [
  'Allergenen info',
  'Mijn bestelling',
  'Klacht indienen',
  'Duurzaamheid',
  'Nieuwe smaken',
]

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(201,169,97,0.15)', border: '1px solid rgba(201,169,97,0.3)' }}>
        <span className="text-[10px]" style={{ color: '#c9a961' }}>✦</span>
      </div>
      <div className="px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '0 12px 12px 12px' }}>
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: 'rgba(201,169,97,0.6)',
                animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Chat() {
  const { user, authHeaders } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const messagesEndRef = useRef(null)
  const toastTimer = useRef(null)

  const firstName = user?.name?.split(' ')[0] || 'daar'

  useEffect(() => {
    setMessages([
      {
        id: 1,
        role: 'bot',
        text: `Hallo ${firstName}! Ik ben Nova, uw persoonlijke Noirra-assistent. Waarmee kan ik u helpen?`,
        time: new Date().toISOString(),
      }
    ])
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return
    const userMsg = { id: Date.now(), role: 'user', text: text.trim(), time: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim() }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'bot',
        text: data.reply || 'Er is iets misgegaan. Probeer het opnieuw.',
        time: new Date().toISOString(),
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'bot',
        text: 'Sorry, ik kan momenteel niet reageren. Probeer het later opnieuw.',
        time: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = () => {
    showToast('Een medewerker neemt contact met u op binnen 5 minuten')
  }

  function timeStr(iso) {
    return new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
        @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }
      `}</style>

      {/* Header */}
      <div className="pt-12 px-4 pb-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(201,169,97,0.2) 0%, rgba(201,169,97,0.08) 100%)', border: '1px solid rgba(201,169,97,0.3)' }}>
            <span style={{ color: '#c9a961' }}>✦</span>
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ fontFamily: '"Playfair Display", serif', color: 'white' }}>Nova</p>
            <p className="text-[10px]" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.35)' }}>Noirra Assistent · Online</p>
          </div>
        </div>
        <button
          onClick={handleConnect}
          className="text-[10px] px-3 py-1.5 tracking-wider transition-all duration-200"
          style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter, sans-serif' }}
        >
          Live support
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end gap-2 mb-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {msg.role === 'bot' && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(201,169,97,0.15)', border: '1px solid rgba(201,169,97,0.3)' }}>
                <span className="text-[10px]" style={{ color: '#c9a961' }}>✦</span>
              </div>
            )}
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-black flex-shrink-0" style={{ background: '#c9a961' }}>
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
            <div className={`max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              <div
                className="px-4 py-2.5 text-sm leading-relaxed"
                style={{
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, rgba(201,169,97,0.2) 0%, rgba(201,169,97,0.12) 100%)'
                    : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${msg.role === 'user' ? 'rgba(201,169,97,0.35)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: msg.role === 'user' ? '12px 0 12px 12px' : '0 12px 12px 12px',
                  color: msg.role === 'user' ? '#e8d5a3' : 'rgba(255,255,255,0.85)',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 13,
                }}
              >
                {msg.text}
              </div>
              <p className="text-[9px]" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.2)' }}>
                {timeStr(msg.time)}
              </p>
            </div>
          </div>
        ))}

        {loading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick replies */}
      {messages.length <= 2 && !loading && (
        <div className="px-4 pb-2">
          <p className="text-[9px] tracking-wider uppercase mb-2" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.2)' }}>
            Snelle vragen
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_REPLIES.map(qr => (
              <button
                key={qr}
                onClick={() => sendMessage(qr)}
                className="text-[10px] px-3 py-1.5 transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.6)',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {qr}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Connect to employee button */}
      <div className="px-4 pb-2">
        <button
          onClick={handleConnect}
          className="w-full py-2.5 text-[10px] tracking-wider uppercase transition-all duration-200"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.07)',
            color: 'rgba(255,255,255,0.25)',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Verbinding maken met medewerker
        </button>
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <form
          className="flex gap-2"
          onSubmit={e => { e.preventDefault(); sendMessage(input) }}
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Stel een vraag..."
            disabled={loading}
            className="flex-1 px-4 py-3 text-sm outline-none disabled:opacity-50"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.9)',
              fontFamily: 'Inter, sans-serif',
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-12 flex items-center justify-center transition-all duration-200 disabled:opacity-30"
            style={{
              background: 'linear-gradient(135deg, rgba(201,169,97,0.2) 0%, rgba(201,169,97,0.1) 100%)',
              border: '1px solid rgba(201,169,97,0.35)',
              color: '#c9a961',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>

      {/* Toast */}
      <div
        className="fixed bottom-24 left-1/2 z-50 pointer-events-none"
        style={{
          transform: toast ? 'translate(-50%, 0)' : 'translate(-50%, 12px)',
          opacity: toast ? 1 : 0,
          transition: 'all 0.35s ease',
        }}
      >
        {toast && (
          <div
            className="flex items-center gap-3 px-5 py-3 text-xs"
            style={{
              background: 'rgba(14,10,6,0.97)',
              backdropFilter: 'blur(16px)',
              border: `1px solid ${toast.type === 'error' ? 'rgba(220,50,50,0.4)' : 'rgba(201,169,97,0.35)'}`,
              color: toast.type === 'error' ? '#f08080' : '#e8d5a3',
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '0.12em',
            }}
          >
            {toast.type === 'error' ? '⚠' : '✦'} {toast.msg}
          </div>
        )}
      </div>
    </div>
  )
}

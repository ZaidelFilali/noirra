import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'

const EVENT_TYPE_CONFIG = {
  proeverij: { emoji: '🍫', label: 'Proeverij' },
  rondleiding: { emoji: '🏭', label: 'Rondleiding' },
  workshop: { emoji: '🔬', label: 'Workshop' },
}

function Toast({ toast }) {
  return (
    <div className="fixed bottom-24 left-1/2 z-50 pointer-events-none" style={{ transform: toast ? 'translate(-50%, 0)' : 'translate(-50%, 12px)', opacity: toast ? 1 : 0, transition: 'all 0.35s ease' }}>
      {toast && (
        <div className="flex items-center gap-3 px-5 py-3 text-xs whitespace-nowrap" style={{ background: 'rgba(14,10,6,0.97)', backdropFilter: 'blur(16px)', border: `1px solid ${toast.type === 'error' ? 'rgba(220,50,50,0.4)' : 'rgba(201,169,97,0.35)'}`, color: toast.type === 'error' ? '#f08080' : '#e8d5a3', fontFamily: 'Inter, sans-serif', letterSpacing: '0.15em' }}>
          {toast.type === 'error' ? '⚠' : '✦'} {toast.msg}
        </div>
      )}
    </div>
  )
}

export default function StoreFinder() {
  const { authHeaders } = useAuth()
  const [stores, setStores] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [registeredEvents, setRegisteredEvents] = useState(new Set())
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const theme = localStorage.getItem('noirra_theme') || 'dark'
  const isLight = theme === 'light'
  const bg = isLight ? '#f5f0eb' : '#0a0a0a'
  const cardBg = isLight ? 'white' : 'rgba(255,255,255,0.04)'
  const cardBorder = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)'
  const textPrimary = isLight ? '#1a1a1a' : 'rgba(255,255,255,0.9)'
  const textSecondary = isLight ? 'rgba(26,26,26,0.5)' : 'rgba(255,255,255,0.35)'

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/stores').then(r => r.json()),
      fetch('/api/events').then(r => r.json()),
    ]).then(([s, e]) => {
      setStores(Array.isArray(s) ? s : [])
      setEvents(Array.isArray(e) ? e : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleRegister = async (eventId) => {
    if (registeredEvents.has(eventId)) return
    try {
      const res = await fetch(`/api/events/${eventId}/register`, { method: 'POST', headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Inschrijving mislukt', 'error')
        return
      }
      setRegisteredEvents(prev => new Set([...prev, eventId]))
      setEvents(prev => prev.map(e => e.id === eventId ? data.event : e))
      showToast('U bent ingeschreven! ✦')
    } catch {
      showToast('Verbinding mislukt', 'error')
    }
  }

  const handleRoute = (store) => {
    alert(`Navigeren naar ${store.name}\n${store.address}, ${store.city}`)
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: bg }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');`}</style>

      {/* Header */}
      <div className="pt-12 px-4 pb-4" style={{ borderBottom: `1px solid ${cardBorder}` }}>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: '"Playfair Display", serif', color: textPrimary }}>
          Winkels & Evenementen
        </h1>
      </div>

      {/* Stores section */}
      <div className="px-4 pt-5">
        <p className="text-[10px] tracking-[0.35em] uppercase mb-3" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
          Noirra Winkels
        </p>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded" style={{ background: cardBg }} />)}</div>
        ) : (
          <div className="space-y-2.5">
            {stores.map((store) => (
              <div key={store.id} className="p-4" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: textPrimary }}>{store.name}</p>
                    <p className="text-[11px] mt-0.5" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>{store.address}, {store.city}</p>
                  </div>
                  <span
                    className="text-[9px] px-2 py-0.5 flex-shrink-0"
                    style={{
                      background: store.openNow ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
                      border: `1px solid ${store.openNow ? 'rgba(74,222,128,0.25)' : 'rgba(239,68,68,0.25)'}`,
                      color: store.openNow ? '#4ade80' : '#f87171',
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    {store.openNow ? '● Open Nu' : '● Gesloten'}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <p className="text-[10px]" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>{store.hours}</p>
                    <p className="text-[10px] mt-0.5" style={{ fontFamily: 'Inter, sans-serif', color: '#c9a961', opacity: 0.7 }}>{store.distance}</p>
                  </div>
                  <button
                    onClick={() => handleRoute(store)}
                    className="px-3 py-1.5 text-[10px] tracking-wider transition-all duration-200"
                    style={{ background: 'rgba(201,169,97,0.08)', border: '1px solid rgba(201,169,97,0.25)', color: '#c9a961', fontFamily: 'Inter, sans-serif' }}
                  >
                    Route →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Events section */}
      <div className="px-4 pt-6">
        <p className="text-[10px] tracking-[0.35em] uppercase mb-3" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
          Evenementen & Workshops
        </p>

        {loading ? (
          <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-28 animate-pulse rounded" style={{ background: cardBg }} />)}</div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-3">
            <span style={{ color: textSecondary, fontSize: 36 }}>📅</span>
            <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>Geen aankomende evenementen</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const typeConfig = EVENT_TYPE_CONFIG[event.type] || { emoji: '🍫', label: event.type }
              const isRegistered = registeredEvents.has(event.id)
              return (
                <div key={event.id} className="p-4" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                  <div className="flex items-start gap-3 mb-2">
                    <span className="text-2xl flex-shrink-0">{typeConfig.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-tight" style={{ fontFamily: '"Playfair Display", serif', color: textPrimary }}>
                          {event.title}
                        </p>
                        <span
                          className="text-[10px] px-2 py-0.5 flex-shrink-0 font-semibold"
                          style={{ fontFamily: 'Inter, sans-serif', color: '#c9a961' }}
                        >
                          {event.price === 0 ? 'Gratis' : `€${event.price}`}
                        </span>
                      </div>
                      <p className="text-[10px] mt-0.5" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
                        {new Date(event.date).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'long' })} · {event.location}
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] leading-relaxed mb-3" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
                    {event.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px]"
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        color: event.spotsLeft <= 5 ? '#f87171' : textSecondary,
                      }}
                    >
                      {event.spotsLeft === 0 ? 'Uitverkocht' : `${event.spotsLeft} plaatsen beschikbaar`}
                    </span>
                    <button
                      onClick={() => handleRegister(event.id)}
                      disabled={isRegistered || event.spotsLeft === 0}
                      className="px-4 py-2 text-[10px] tracking-wider uppercase font-medium disabled:opacity-40 transition-all duration-200"
                      style={{
                        background: isRegistered ? 'rgba(74,222,128,0.1)' : 'rgba(201,169,97,0.1)',
                        border: `1px solid ${isRegistered ? 'rgba(74,222,128,0.3)' : 'rgba(201,169,97,0.3)'}`,
                        color: isRegistered ? '#4ade80' : '#c9a961',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      {isRegistered ? '✓ Ingeschreven' : 'Inschrijven'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Toast toast={toast} />
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

const TYPE_CONFIG = {
  product: { icon: '🍫', label: 'Product' },
  promo: { icon: '🎁', label: 'Promotie' },
  sustainability: { icon: '🌱', label: 'Duurzaamheid' },
  system: { icon: '⚙️', label: 'Systeem' },
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'zojuist'
  if (m < 60) return `${m} min geleden`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}u geleden`
  const d = Math.floor(h / 24)
  return `${d}d geleden`
}

export default function Notifications() {
  const { authHeaders } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const theme = localStorage.getItem('noirra_theme') || 'dark'
  const isLight = theme === 'light'
  const bg = isLight ? '#f5f0eb' : '#0a0a0a'
  const cardBg = isLight ? 'white' : 'rgba(255,255,255,0.04)'
  const cardBorder = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)'
  const textPrimary = isLight ? '#1a1a1a' : 'rgba(255,255,255,0.9)'
  const textSecondary = isLight ? 'rgba(26,26,26,0.5)' : 'rgba(255,255,255,0.35)'

  useEffect(() => {
    fetch('/api/notifications', { headers: authHeaders() })
      .then(r => r.json())
      .then(data => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const markAsRead = async (id) => {
    const notif = notifications.find(n => n.id === id)
    if (!notif || notif.read) return
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', headers: authHeaders() })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    } catch {}
  }

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read)
    for (const n of unread) {
      try {
        await fetch(`/api/notifications/${n.id}/read`, { method: 'PATCH', headers: authHeaders() })
      } catch {}
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const FILTERS = [
    { id: 'all', label: 'Alle' },
    { id: 'product', label: 'Producten' },
    { id: 'promo', label: 'Promoties' },
    { id: 'sustainability', label: 'Duurzaamheid' },
    { id: 'system', label: 'Systeem' },
  ]

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.type === filter)
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="min-h-screen" style={{ background: bg }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');`}</style>

      {/* Header */}
      <div className="pt-12 px-4 pb-4" style={{ borderBottom: `1px solid ${cardBorder}` }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold" style={{ fontFamily: '"Playfair Display", serif', color: textPrimary }}>
              Notificaties
            </h1>
            {unreadCount > 0 && (
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-black" style={{ background: '#c9a961', fontFamily: 'Inter, sans-serif' }}>
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-[10px] tracking-wider"
              style={{ fontFamily: 'Inter, sans-serif', color: '#c9a961' }}
            >
              Alles gelezen
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="flex-shrink-0 px-3 py-1.5 text-[10px] tracking-wider uppercase transition-all duration-200"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: filter === f.id ? 500 : 400,
                background: filter === f.id ? 'rgba(201,169,97,0.12)' : cardBg,
                border: `1px solid ${filter === f.id ? 'rgba(201,169,97,0.4)' : cardBorder}`,
                color: filter === f.id ? '#c9a961' : textSecondary,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications list */}
      <div className="px-4 pt-4 pb-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-20 animate-pulse rounded" style={{ background: cardBg }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <span style={{ color: textSecondary, fontSize: 40 }}>🔔</span>
            <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
              {filter === 'all' ? 'Geen notificaties' : `Geen ${FILTERS.find(f => f.id === filter)?.label.toLowerCase()} notificaties`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((notif) => {
              const typeConf = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system
              return (
                <button
                  key={notif.id}
                  onClick={() => markAsRead(notif.id)}
                  className="w-full p-4 text-left transition-all duration-200 relative"
                  style={{
                    background: notif.read ? cardBg : isLight ? 'rgba(201,169,97,0.06)' : 'rgba(201,169,97,0.05)',
                    border: `1px solid ${notif.read ? cardBorder : 'rgba(201,169,97,0.2)'}`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">{typeConf.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-medium leading-tight" style={{ fontFamily: 'Inter, sans-serif', color: textPrimary }}>
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: '#60a5fa' }} />
                        )}
                      </div>
                      <p className="text-[11px] leading-relaxed mb-1.5" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
                        {notif.message}
                      </p>
                      <p className="text-[9px]" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
                        {timeAgo(notif.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

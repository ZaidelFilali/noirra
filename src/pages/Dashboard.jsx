import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function useTheme() {
  const t = localStorage.getItem('noirra_theme') || 'dark'
  return t === 'light'
}

function getDaysRemaining(expiresAt) {
  return Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
}

function ExpiryBadge({ days }) {
  if (days > 60) return <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', fontFamily: 'Inter, sans-serif' }}>{days}d</span>
  if (days > 30) return <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(234,179,8,0.15)', color: '#facc15', fontFamily: 'Inter, sans-serif' }}>{days}d</span>
  if (days > 0) return <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', fontFamily: 'Inter, sans-serif' }}>{days}d</span>
  return <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171', fontFamily: 'Inter, sans-serif' }}>Verlopen</span>
}

export default function Dashboard() {
  const { user, authHeaders } = useAuth()
  const navigate = useNavigate()
  const isLight = useTheme()
  const [userProducts, setUserProducts] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [notifications, setNotifications] = useState([])
  const [events, setEvents] = useState([])
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)

  const bg = isLight ? '#f5f0eb' : '#0a0a0a'
  const cardBg = isLight ? 'white' : 'rgba(255,255,255,0.04)'
  const cardBorder = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)'
  const textPrimary = isLight ? '#1a1a1a' : 'rgba(255,255,255,0.9)'
  const textSecondary = isLight ? 'rgba(26,26,26,0.5)' : 'rgba(255,255,255,0.35)'

  useEffect(() => {
    const h = authHeaders()
    Promise.all([
      fetch('/api/user/products', { headers: h }).then(r => r.json()),
      fetch('/api/products').then(r => r.json()),
      fetch('/api/notifications', { headers: h }).then(r => r.json()),
      fetch('/api/events').then(r => r.json()),
      fetch('/api/complaints', { headers: h }).then(r => r.json()),
    ]).then(([up, ap, notifs, evs, comp]) => {
      setUserProducts(Array.isArray(up) ? up : [])
      setAllProducts(Array.isArray(ap) ? ap : [])
      setNotifications(Array.isArray(notifs) ? notifs : [])
      setEvents(Array.isArray(evs) ? evs : [])
      setComplaints(Array.isArray(comp) ? comp : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length
  const openComplaints = complaints.filter(c => c.status !== 'opgelost').length

  const registeredIds = new Set(userProducts.map(rp => rp.productId))
  const recommendations = allProducts.filter(p => !registeredIds.has(p.id) && p.inStock).slice(0, 3)
  const nextEvent = events[0]

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Goedemorgen' : hour < 18 ? 'Goedemiddag' : 'Goedenavond'
  const firstName = user?.name?.split(' ')[0] || 'daar'

  return (
    <div className="min-h-screen px-4 pt-12 pb-4" style={{ background: bg }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');`}</style>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] tracking-[0.35em] uppercase mb-1" style={{ fontFamily: 'Inter, sans-serif', color: '#c9a961', opacity: 0.8 }}>
            NOIRRA
          </p>
          <h1 className="text-2xl font-semibold leading-tight" style={{ fontFamily: '"Playfair Display", serif', color: textPrimary }}>
            {greeting},<br />{firstName}
          </h1>
          {user?.role === 'b2b' && (
            <span className="inline-block mt-2 text-[9px] tracking-widest uppercase px-2.5 py-1" style={{ background: 'rgba(201,169,97,0.15)', border: '1px solid rgba(201,169,97,0.35)', color: '#c9a961', fontFamily: 'Inter, sans-serif' }}>
              B2B Zakelijk Account
            </span>
          )}
        </div>
        <Link to="/notifications" className="relative mt-1">
          <div className="w-10 h-10 flex items-center justify-center" style={{ border: `1px solid ${cardBorder}`, background: cardBg }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={unreadCount > 0 ? '#c9a961' : textSecondary} strokeWidth="1.8">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4.5 h-4.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-black" style={{ background: '#c9a961', fontFamily: 'Inter, sans-serif' }}>
              {unreadCount}
            </span>
          )}
        </Link>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[
          { label: 'Producten', value: userProducts.length, to: '/products' },
          { label: 'Punten', value: user?.points || 0, to: '/community' },
          { label: 'Meldingen', value: openComplaints, to: '/complaints' },
        ].map((stat) => (
          <Link key={stat.label} to={stat.to} className="flex flex-col items-center justify-center py-3 transition-all duration-200" style={{ background: cardBg, border: `1px solid ${cardBorder}`, textDecoration: 'none' }}>
            <span className="text-2xl font-bold" style={{ fontFamily: '"Playfair Display", serif', color: '#c9a961' }}>
              {stat.value}
            </span>
            <span className="text-[9px] mt-0.5 tracking-wider uppercase" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
              {stat.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Registered products */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ fontFamily: '"Playfair Display", serif', color: textPrimary }}>
            Mijn Geregistreerde Producten
          </h2>
          <Link to="/products" className="text-[10px] tracking-wider" style={{ color: '#c9a961', fontFamily: 'Inter, sans-serif' }}>
            Alle →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-14 animate-pulse rounded" style={{ background: cardBg }} />
            ))}
          </div>
        ) : userProducts.length === 0 ? (
          <div className="py-8 flex flex-col items-center" style={{ border: `1px dashed ${cardBorder}` }}>
            <span style={{ color: textSecondary, fontSize: 28 }}>✦</span>
            <p className="mt-2 text-xs" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
              Nog geen producten geregistreerd
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {userProducts.slice(0, 3).map((rp) => (
              <Link
                key={rp.id}
                to={`/products/${rp.productId}`}
                className="flex items-center gap-3 p-3 transition-all duration-200"
                style={{ background: cardBg, border: `1px solid ${cardBorder}`, textDecoration: 'none' }}
              >
                <div className="w-8 h-8 rounded flex-shrink-0" style={{ background: rp.product?.color || '#5C2810' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ fontFamily: 'Inter, sans-serif', color: textPrimary }}>
                    {rp.product?.name}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ fontFamily: 'monospace', color: textSecondary }}>
                    {rp.product?.batch}
                  </p>
                </div>
                <ExpiryBadge days={getDaysRemaining(rp.expiresAt)} />
              </Link>
            ))}
          </div>
        )}

        <button
          onClick={() => navigate('/products/register')}
          className="w-full mt-3 py-3 text-[10px] tracking-[0.3em] uppercase font-medium transition-all duration-200"
          style={{ border: `1px dashed ${isLight ? 'rgba(201,169,97,0.4)' : 'rgba(201,169,97,0.25)'}`, color: '#c9a961', fontFamily: 'Inter, sans-serif', background: 'transparent' }}
        >
          + Product Registreren
        </button>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-3" style={{ fontFamily: '"Playfair Display", serif', color: textPrimary }}>
            Aanbevelingen voor jou
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {recommendations.map((prod) => (
              <Link
                key={prod.id}
                to={`/products/${prod.id}`}
                className="flex-shrink-0 w-36 p-3 transition-all duration-200"
                style={{ background: cardBg, border: `1px solid ${cardBorder}`, textDecoration: 'none' }}
              >
                <div className="w-full h-16 rounded mb-2" style={{ background: prod.color }} />
                <p className="text-[11px] font-medium leading-tight mb-1" style={{ fontFamily: 'Inter, sans-serif', color: textPrimary }}>
                  {prod.name}
                </p>
                <p className="text-[10px]" style={{ fontFamily: 'Inter, sans-serif', color: '#c9a961' }}>
                  €{prod.price.toFixed(2)}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* B2B stock section */}
      {user?.role === 'b2b' && (
        <div className="mb-6 p-4" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
          <h2 className="text-sm font-semibold mb-3" style={{ fontFamily: '"Playfair Display", serif', color: textPrimary }}>
            Voorraad & Levering
          </h2>
          <div className="space-y-2">
            {allProducts.map((prod) => (
              <div key={prod.id} className="flex items-center justify-between gap-2">
                <span className="text-[11px] flex-1 truncate" style={{ fontFamily: 'Inter, sans-serif', color: textPrimary }}>
                  {prod.name}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (prod.stockLevel / 250) * 100)}%`,
                        background: prod.stockLevel > 100 ? '#4ade80' : prod.stockLevel > 30 ? '#facc15' : '#f87171'
                      }}
                    />
                  </div>
                  <span className="text-[10px] w-8 text-right" style={{ fontFamily: 'monospace', color: textSecondary }}>
                    {prod.stockLevel}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <Link to="/orders" className="block mt-3 text-center text-[10px] tracking-wider py-2" style={{ border: `1px solid rgba(201,169,97,0.3)`, color: '#c9a961', fontFamily: 'Inter, sans-serif' }}>
            Bestelling plaatsen →
          </Link>
        </div>
      )}

      {/* Community preview */}
      <div className="mb-4" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold" style={{ fontFamily: '"Playfair Display", serif', color: textPrimary }}>
              Community
            </h2>
            <Link to="/community" className="text-[10px] tracking-wider" style={{ color: '#c9a961', fontFamily: 'Inter, sans-serif' }}>
              Bekijken →
            </Link>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-black" style={{ background: '#c9a961' }}>
              S
            </div>
            <p className="text-[11px] leading-relaxed line-clamp-2" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
              Zojuist de Ruby Rose geprobeerd — absoluut verbluffend! De bessen-tonen zijn zo uniek...
            </p>
          </div>
        </div>
      </div>

      {/* Next event */}
      {nextEvent && (
        <div className="mb-4 p-4" style={{ background: 'linear-gradient(135deg, rgba(201,169,97,0.08) 0%, rgba(201,169,97,0.03) 100%)', border: '1px solid rgba(201,169,97,0.2)' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] tracking-[0.3em] uppercase" style={{ fontFamily: 'Inter, sans-serif', color: '#c9a961', opacity: 0.7 }}>
              Aankomend Evenement
            </span>
            <Link to="/storefinder" className="text-[10px]" style={{ color: '#c9a961', fontFamily: 'Inter, sans-serif' }}>
              Meer →
            </Link>
          </div>
          <p className="text-sm font-semibold mb-1" style={{ fontFamily: '"Playfair Display", serif', color: textPrimary }}>
            {nextEvent.title}
          </p>
          <p className="text-[10px]" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
            {new Date(nextEvent.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })} · {nextEvent.location}
          </p>
          <p className="text-[10px] mt-1" style={{ fontFamily: 'Inter, sans-serif', color: nextEvent.spotsLeft <= 5 ? '#f87171' : textSecondary }}>
            {nextEvent.spotsLeft} plaatsen beschikbaar
          </p>
        </div>
      )}
    </div>
  )
}

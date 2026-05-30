import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function getDaysRemaining(expiresAt) {
  return Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
}

function ExpiryBar({ days }) {
  const color = days > 60 ? '#4ade80' : days > 30 ? '#facc15' : '#f87171'
  const label = days > 60 ? `${days} dagen` : days > 30 ? `${days} dagen` : days > 0 ? `${days} dagen` : 'Verlopen'
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-[9px]" style={{ fontFamily: 'Inter, sans-serif', color }}>{label}</span>
    </div>
  )
}

function originFlagEmoji(origin) {
  const flags = {
    'Ecuador': '🇪🇨', 'Madagascar': '🇲🇬', 'België': '🇧🇪',
    'Brazilië': '🇧🇷', 'Italië': '🇮🇹'
  }
  return flags[origin] || '🌍'
}

export default function Products() {
  const { authHeaders } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('mine')
  const [userProducts, setUserProducts] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const theme = localStorage.getItem('noirra_theme') || 'dark'
  const isLight = theme === 'light'
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
    ]).then(([up, ap]) => {
      setUserProducts(Array.isArray(up) ? up : [])
      setAllProducts(Array.isArray(ap) ? ap : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filteredProducts = allProducts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen" style={{ background: bg }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');`}</style>

      {/* Header */}
      <div className="pt-12 px-4 pb-4" style={{ borderBottom: `1px solid ${cardBorder}` }}>
        <h1 className="text-2xl font-semibold mb-4" style={{ fontFamily: '"Playfair Display", serif', color: textPrimary }}>
          Producten
        </h1>
        {/* Tabs */}
        <div className="flex gap-0">
          {[
            { id: 'mine', label: 'Mijn Producten' },
            { id: 'catalog', label: 'Catalogus' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-2.5 text-[11px] tracking-wider uppercase transition-all duration-200"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: tab === t.id ? 500 : 400,
                color: tab === t.id ? '#c9a961' : textSecondary,
                borderBottom: `2px solid ${tab === t.id ? '#c9a961' : 'transparent'}`,
                background: 'transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'mine' ? (
        <div className="px-4 pt-4 relative pb-20">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 animate-pulse rounded" style={{ background: cardBg }} />
              ))}
            </div>
          ) : userProducts.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <span style={{ color: '#c9a961', fontSize: 40, opacity: 0.3 }}>✦</span>
              <p className="text-sm text-center" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
                Nog geen producten geregistreerd
              </p>
              <button
                onClick={() => navigate('/products/register')}
                className="mt-2 px-6 py-2.5 text-[10px] tracking-[0.3em] uppercase"
                style={{ border: '1px solid rgba(201,169,97,0.4)', color: '#c9a961', fontFamily: 'Inter, sans-serif' }}
              >
                + Product registreren
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {userProducts.map((rp) => {
                const days = getDaysRemaining(rp.expiresAt)
                const prod = rp.product
                return (
                  <Link
                    key={rp.id}
                    to={`/products/${rp.productId}`}
                    className="flex gap-3 p-3 transition-all duration-200"
                    style={{ background: cardBg, border: `1px solid ${cardBorder}`, textDecoration: 'none', display: 'flex' }}
                  >
                    {/* Color swatch */}
                    <div className="w-14 h-14 rounded flex-shrink-0" style={{ background: prod?.color || '#5C2810' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-medium leading-tight" style={{ fontFamily: 'Inter, sans-serif', color: textPrimary }}>
                          {prod?.name}
                        </p>
                        <span className="text-base flex-shrink-0">{originFlagEmoji(prod?.origin)}</span>
                      </div>
                      <p className="text-[10px] mb-2" style={{ fontFamily: 'monospace', color: textSecondary }}>
                        {prod?.batch}
                      </p>
                      <ExpiryBar days={days} />
                      {/* Allergens */}
                      {prod?.allergens?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {prod.allergens.slice(0, 3).map(a => (
                            <span key={a} className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', fontFamily: 'Inter, sans-serif' }}>
                              {a}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Certifications */}
                      {prod?.certifications?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {prod.certifications.map(c => (
                            <span key={c} className="text-[8px] px-1.5 py-0.5" style={{ background: 'rgba(201,169,97,0.1)', border: '1px solid rgba(201,169,97,0.25)', color: '#c9a961', fontFamily: 'Inter, sans-serif' }}>
                              ✓ {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* FAB */}
          <button
            onClick={() => navigate('/products/register')}
            className="fixed bottom-24 right-4 w-14 h-14 rounded-full flex items-center justify-center text-xl font-light shadow-lg transition-all duration-200"
            style={{ background: 'linear-gradient(135deg, #c9a961 0%, #a88542 100%)', color: '#0a0a0a', zIndex: 40 }}
          >
            +
          </button>
        </div>
      ) : (
        <div className="px-4 pt-4">
          {/* Search */}
          <div className="mb-4 relative">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={textSecondary} strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Zoek producten..."
              className="w-full pl-9 pr-4 py-3 text-sm outline-none"
              style={{
                background: cardBg,
                border: `1px solid ${cardBorder}`,
                color: textPrimary,
                fontFamily: 'Inter, sans-serif',
              }}
            />
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-40 animate-pulse rounded" style={{ background: cardBg }} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pb-4">
              {filteredProducts.map((prod) => (
                <Link
                  key={prod.id}
                  to={`/products/${prod.id}`}
                  className="p-3 transition-all duration-200"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}`, textDecoration: 'none', display: 'block' }}
                >
                  <div className="w-full h-20 rounded mb-2.5" style={{ background: prod.color }} />
                  <p className="text-[11px] font-medium leading-tight mb-1" style={{ fontFamily: 'Inter, sans-serif', color: textPrimary }}>
                    {prod.name}
                  </p>
                  <p className="text-[10px] mb-2" style={{ fontFamily: 'Inter, sans-serif', color: '#c9a961' }}>
                    {prod.cacaoPercentage > 0 ? `${prod.cacaoPercentage}% cacao` : 'Wit chocolade'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: textPrimary }}>
                      €{prod.price.toFixed(2)}
                    </span>
                    <span
                      className="text-[8px] px-1.5 py-0.5"
                      style={{
                        background: prod.inStock ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                        color: prod.inStock ? '#4ade80' : '#f87171',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      {prod.inStock ? 'Op voorraad' : 'Uitverkocht'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

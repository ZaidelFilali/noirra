import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'

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

const STATUS_CONFIG = {
  'Verwerkt': { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.25)' },
  'Onderweg': { color: '#facc15', bg: 'rgba(250,204,21,0.1)', border: 'rgba(250,204,21,0.25)' },
  'Bezorgd': { color: '#4ade80', bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.25)' },
}

export default function Orders() {
  const { user, authHeaders } = useAuth()
  const [tab, setTab] = useState('order')
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [quantities, setQuantities] = useState({})
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [orderSuccess, setOrderSuccess] = useState(false)
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
    const h = authHeaders()
    Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/orders', { headers: h }).then(r => r.json()),
    ]).then(([prods, ords]) => {
      setProducts(Array.isArray(prods) ? prods : [])
      setOrders(Array.isArray(ords) ? ords : [])
    }).catch(() => {}).finally(() => setDataLoading(false))
  }, [])

  const updateQty = (id, delta) => {
    setQuantities(prev => {
      const current = prev[id] || 0
      const next = Math.max(0, current + delta)
      return { ...prev, [id]: next }
    })
  }

  const cartItems = Object.entries(quantities)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => {
      const prod = products.find(p => p.id === parseInt(id))
      return { productId: parseInt(id), quantity: qty, product: prod }
    })

  const total = cartItems.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0)

  const handleOrder = async () => {
    if (cartItems.length === 0) {
      showToast('Voeg minimaal één product toe', 'error')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ items: cartItems.map(i => ({ productId: i.productId, quantity: i.quantity })) }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Bestelling mislukt', 'error')
        return
      }
      setOrders(prev => [data, ...prev])
      setQuantities({})
      setOrderSuccess(true)
      showToast('Bestelling geplaatst! ✦')
      setTimeout(() => { setOrderSuccess(false); setTab('history') }, 2500)
    } catch {
      showToast('Verbinding mislukt', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: bg }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');`}</style>

      {/* Header */}
      <div className="pt-12 px-4 pb-4" style={{ borderBottom: `1px solid ${cardBorder}` }}>
        {user?.role === 'b2b' && (
          <div className="mb-4 p-3" style={{ background: 'rgba(201,169,97,0.06)', border: '1px solid rgba(201,169,97,0.2)' }}>
            <p className="text-[10px] tracking-wider uppercase mb-2" style={{ fontFamily: 'Inter, sans-serif', color: '#c9a961', opacity: 0.8 }}>
              Levertijden & Voorraad
            </p>
            <div className="space-y-1.5">
              {products.slice(0, 3).map(p => (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="text-[10px] flex-1 truncate" style={{ fontFamily: 'Inter, sans-serif', color: textPrimary }}>{p.name}</span>
                  <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (p.stockLevel / 250) * 100)}%`, background: p.stockLevel > 100 ? '#4ade80' : p.stockLevel > 30 ? '#facc15' : '#f87171' }} />
                  </div>
                  <span className="text-[9px] w-8 text-right" style={{ fontFamily: 'monospace', color: textSecondary }}>{p.stockLevel}</span>
                </div>
              ))}
            </div>
            <p className="text-[9px] mt-2" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>Standaard levertijd: 1–3 werkdagen</p>
          </div>
        )}
        <h1 className="text-2xl font-semibold mb-4" style={{ fontFamily: '"Playfair Display", serif', color: textPrimary }}>
          Bestellen
        </h1>
        <div className="flex gap-0">
          {[{ id: 'order', label: 'Bestellen' }, { id: 'history', label: 'Mijn Bestellingen' }].map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setOrderSuccess(false) }}
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

      {/* Order tab */}
      {tab === 'order' && (
        <div className="px-4 pt-4">
          {orderSuccess ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(74,222,128,0.15)', border: '2px solid rgba(74,222,128,0.4)' }}>
                <span className="text-2xl" style={{ color: '#4ade80' }}>✓</span>
              </div>
              <p className="text-base font-semibold" style={{ fontFamily: '"Playfair Display", serif', color: textPrimary }}>Bestelling Geplaatst!</p>
              <p className="text-[11px] text-center" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>Verwacht levering binnen 1–3 werkdagen.</p>
            </div>
          ) : (
            <>
              {dataLoading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded" style={{ background: cardBg }} />)}</div>
              ) : (
                <div className="space-y-3 pb-32">
                  {products.map((prod) => (
                    <div key={prod.id} className="p-3 flex gap-3" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                      <div className="w-14 h-14 rounded flex-shrink-0" style={{ background: prod.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight mb-0.5" style={{ fontFamily: 'Inter, sans-serif', color: textPrimary }}>{prod.name}</p>
                        <p className="text-[10px] mb-1" style={{ fontFamily: 'Inter, sans-serif', color: '#c9a961' }}>€{prod.price.toFixed(2)}</p>
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: prod.inStock ? '#4ade80' : '#f87171' }} />
                          <span className="text-[9px]" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
                            {prod.inStock ? `Op voorraad (${prod.stockLevel})` : 'Uitverkocht'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => updateQty(prod.id, -1)}
                          disabled={!quantities[prod.id]}
                          className="w-7 h-7 flex items-center justify-center text-lg disabled:opacity-30 transition-all duration-150"
                          style={{ border: `1px solid ${cardBorder}`, background: cardBg, color: textPrimary }}
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif', color: textPrimary }}>
                          {quantities[prod.id] || 0}
                        </span>
                        <button
                          onClick={() => updateQty(prod.id, 1)}
                          disabled={!prod.inStock}
                          className="w-7 h-7 flex items-center justify-center text-lg disabled:opacity-30 transition-all duration-150"
                          style={{ border: '1px solid rgba(201,169,97,0.35)', background: 'rgba(201,169,97,0.08)', color: '#c9a961' }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Cart total fixed at bottom */}
              {cartItems.length > 0 && (
                <div className="fixed bottom-20 left-0 right-0 px-4 z-30 flex justify-center">
                  <div className="w-full max-w-[430px] p-4" style={{ background: isLight ? 'rgba(245,240,235,0.97)' : 'rgba(10,10,8,0.97)', backdropFilter: 'blur(16px)', border: `1px solid ${cardBorder}` }}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
                          {cartItems.length} {cartItems.length === 1 ? 'product' : 'producten'} · {cartItems.reduce((s, i) => s + i.quantity, 0)} stuks
                        </p>
                        <p className="text-xl font-bold" style={{ fontFamily: '"Playfair Display", serif', color: '#c9a961' }}>
                          €{total.toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={handleOrder}
                        disabled={loading}
                        className="px-6 py-3 text-[10px] tracking-[0.3em] uppercase font-medium disabled:opacity-50 transition-all duration-200"
                        style={{ background: 'linear-gradient(135deg, rgba(201,169,97,0.2) 0%, rgba(201,169,97,0.1) 100%)', border: '1px solid rgba(201,169,97,0.4)', color: '#c9a961', fontFamily: 'Inter, sans-serif' }}
                      >
                        {loading ? '◌' : 'Bestelling Plaatsen →'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Order history tab */}
      {tab === 'history' && (
        <div className="px-4 pt-4 pb-6">
          {dataLoading ? (
            <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-24 animate-pulse rounded" style={{ background: cardBg }} />)}</div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <span style={{ color: textSecondary, fontSize: 40 }}>📦</span>
              <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>Nog geen bestellingen</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const s = STATUS_CONFIG[order.status] || STATUS_CONFIG['Verwerkt']
                return (
                  <div key={order.id} className="p-4" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-[10px] font-medium" style={{ fontFamily: 'monospace', color: textSecondary }}>
                          Bestelling #{String(order.id).padStart(6, '0')}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
                          {new Date(order.createdAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <span className="text-[9px] px-2 py-0.5" style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontFamily: 'Inter, sans-serif' }}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-[11px] mb-2" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
                      {order.items.length} {order.items.length === 1 ? 'product' : 'producten'}
                    </p>
                    <div className="flex items-center justify-between pt-2" style={{ borderTop: `1px solid ${cardBorder}` }}>
                      <span className="text-base font-bold" style={{ fontFamily: '"Playfair Display", serif', color: '#c9a961' }}>
                        €{order.totalPrice?.toFixed(2)}
                      </span>
                      {order.deliveryDate && (
                        <span className="text-[9px]" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
                          Verwacht: {new Date(order.deliveryDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <Toast toast={toast} />
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const RECIPES = [
  {
    name: 'Chocolade Fondant',
    desc: 'Een klassieke warme chocoladecake met een vloeibaar hart. Perfect voor een speciale gelegenheid. Bereidingstijd: 25 minuten.',
    emoji: '🍫'
  },
  {
    name: 'Warme Chocolademelk',
    desc: 'Romige warme chocolademelk gemaakt met 30g geraspte Noirra chocolade per kop melk. Verwarm zachtjes en klop schuimig.',
    emoji: '☕'
  }
]

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { authHeaders } = useAuth()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('info')

  const theme = localStorage.getItem('noirra_theme') || 'dark'
  const isLight = theme === 'light'
  const bg = isLight ? '#f5f0eb' : '#0a0a0a'
  const cardBg = isLight ? 'white' : 'rgba(255,255,255,0.04)'
  const cardBorder = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)'
  const textPrimary = isLight ? '#1a1a1a' : 'rgba(255,255,255,0.9)'
  const textSecondary = isLight ? 'rgba(26,26,26,0.5)' : 'rgba(255,255,255,0.35)'

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then(r => r.json())
      .then(data => setProduct(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
        <span className="text-3xl text-[#c9a961] animate-pulse">✦</span>
      </div>
    )
  }

  if (!product || product.error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: bg }}>
        <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>Product niet gevonden</p>
        <button onClick={() => navigate('/products')} className="text-[11px] tracking-wider" style={{ color: '#c9a961', fontFamily: 'Inter, sans-serif' }}>← Terug</button>
      </div>
    )
  }

  const flagMap = { 'Ecuador': '🇪🇨', 'Madagascar': '🇲🇬', 'België': '🇧🇪', 'Brazilië': '🇧🇷', 'Italië': '🇮🇹' }
  const flag = flagMap[product.origin] || '🌍'

  return (
    <div className="min-h-screen" style={{ background: bg }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');`}</style>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4" style={{ borderBottom: `1px solid ${cardBorder}` }}>
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center flex-shrink-0" style={{ border: `1px solid ${cardBorder}`, background: cardBg }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={textSecondary} strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-base font-semibold truncate flex-1" style={{ fontFamily: '"Playfair Display", serif', color: textPrimary }}>
          {product.name}
        </h1>
      </div>

      {/* Product visual */}
      <div className="px-4 pt-4">
        <div
          className="w-full h-48 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${product.color} 0%, ${product.color}bb 100%)` }}
        >
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 60%)' }} />
          <div className="text-center relative z-10">
            <p className="text-4xl font-bold text-white/20" style={{ fontFamily: '"Playfair Display", serif' }}>
              {product.cacaoPercentage > 0 ? `${product.cacaoPercentage}%` : '✦'}
            </p>
            <p className="text-white/40 text-xs mt-1 tracking-widest uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
              {product.type}
            </p>
          </div>
        </div>

        {/* Info row */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-xl font-semibold mb-1" style={{ fontFamily: '"Playfair Display", serif', color: textPrimary }}>
              {product.name}
            </h2>
            <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
              {flag} {product.origin} · {product.weight}g
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold" style={{ fontFamily: '"Playfair Display", serif', color: '#c9a961' }}>
              €{product.price.toFixed(2)}
            </p>
            {product.cacaoPercentage > 0 && (
              <p className="text-[10px]" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
                {product.cacaoPercentage}% cacao
              </p>
            )}
          </div>
        </div>

        {/* Certifications */}
        <div className="flex flex-wrap gap-2 mb-4">
          {product.certifications?.map(c => (
            <span key={c} className="flex items-center gap-1 text-[10px] px-2.5 py-1" style={{ background: 'rgba(201,169,97,0.1)', border: '1px solid rgba(201,169,97,0.3)', color: '#c9a961', fontFamily: 'Inter, sans-serif' }}>
              ✓ {c}
            </span>
          ))}
          <span
            className="text-[10px] px-2.5 py-1"
            style={{
              background: product.inStock ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${product.inStock ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: product.inStock ? '#4ade80' : '#f87171',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {product.inStock ? '● Op voorraad' : '● Uitverkocht'}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-4" style={{ borderBottom: `1px solid ${cardBorder}` }}>
          {['info', 'ingredienten', 'recepten'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-[10px] tracking-wider uppercase transition-all duration-200 capitalize"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: tab === t ? 500 : 400,
                color: tab === t ? '#c9a961' : textSecondary,
                borderBottom: `2px solid ${tab === t ? '#c9a961' : 'transparent'}`,
                background: 'transparent',
              }}
            >
              {t === 'ingredienten' ? 'Ingrediënten' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'info' && (
          <div className="space-y-4 pb-6">
            <p className="text-sm leading-relaxed" style={{ fontFamily: '"Playfair Display", serif', fontStyle: 'italic', color: textPrimary, opacity: 0.85 }}>
              {product.description}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                <p className="text-[9px] tracking-wider uppercase mb-1" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>Houdbaarheid</p>
                <p className="text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif', color: textPrimary }}>{product.expiryMonths} maanden</p>
              </div>
              <div className="p-3" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                <p className="text-[9px] tracking-wider uppercase mb-1" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>Batch</p>
                <p className="text-[10px] font-medium" style={{ fontFamily: 'monospace', color: textPrimary }}>{product.batch}</p>
              </div>
            </div>
            {product.allergens?.length > 0 && (
              <div>
                <p className="text-[10px] tracking-wider uppercase mb-2" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>Allergenen</p>
                <div className="flex flex-wrap gap-1.5">
                  {product.allergens.map(a => (
                    <span key={a} className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontFamily: 'Inter, sans-serif' }}>
                      ⚠ {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'ingredienten' && (
          <div className="space-y-4 pb-6">
            <div className="p-4" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
              <p className="text-[9px] tracking-wider uppercase mb-2" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>Ingrediëntenlijst</p>
              <p className="text-xs leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: textPrimary }}>
                {product.ingredients}
              </p>
            </div>
            {product.allergens?.length > 0 && (
              <div className="p-4" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <p className="text-[10px] font-medium mb-2 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', color: '#f87171' }}>
                  <span>⚠</span> Allergeneninformatie
                </p>
                <p className="text-[11px] leading-relaxed mb-2" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(248,113,113,0.8)' }}>
                  Dit product bevat:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {product.allergens.map(a => (
                    <span key={a} className="text-[10px] px-2.5 py-1 rounded-full font-medium" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', fontFamily: 'Inter, sans-serif' }}>
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'recepten' && (
          <div className="space-y-3 pb-6">
            {RECIPES.map((recipe) => (
              <div key={recipe.name} className="p-4" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{recipe.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold mb-1.5" style={{ fontFamily: '"Playfair Display", serif', color: textPrimary }}>
                      {recipe.name}
                    </p>
                    <p className="text-[11px] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
                      {recipe.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <p className="text-[10px] text-center pt-2" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
              Meer recepten? Deel ze in de community!
            </p>
          </div>
        )}
      </div>

      {/* Order button */}
      <div className="fixed bottom-20 left-0 right-0 px-4 flex justify-center" style={{ zIndex: 30 }}>
        <div className="w-full max-w-[430px]">
          <button
            onClick={() => navigate('/orders')}
            className="w-full py-4 text-[11px] tracking-[0.35em] uppercase font-medium transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, rgba(201,169,97,0.18) 0%, rgba(201,169,97,0.10) 100%)',
              border: '1px solid rgba(201,169,97,0.45)',
              color: '#c9a961',
              fontFamily: 'Inter, sans-serif',
              backdropFilter: 'blur(12px)',
            }}
          >
            <span className="inline-flex items-center gap-3">
              <span style={{ opacity: 0.5 }}>✦</span>
              Bestellen
              <span style={{ opacity: 0.5 }}>→</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

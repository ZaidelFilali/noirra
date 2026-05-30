import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'

const PROBLEM_TYPES = ['Smeltschade', 'Breukschade', 'Smaakafwijking', 'Verpakkingsfout', 'Anders']

const STATUS_CONFIG = {
  open: { label: 'Ingediend', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.25)' },
  in_behandeling: { label: 'In behandeling', color: '#facc15', bg: 'rgba(250,204,21,0.1)', border: 'rgba(250,204,21,0.25)' },
  opgelost: { label: 'Opgelost', color: '#4ade80', bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.25)' },
}

function Toast({ toast }) {
  return (
    <div
      className="fixed bottom-24 left-1/2 z-50 pointer-events-none"
      style={{ transform: toast ? 'translate(-50%, 0)' : 'translate(-50%, 12px)', opacity: toast ? 1 : 0, transition: 'all 0.35s ease' }}
    >
      {toast && (
        <div className="flex items-center gap-3 px-5 py-3 text-xs whitespace-nowrap" style={{ background: 'rgba(14,10,6,0.97)', backdropFilter: 'blur(16px)', border: `1px solid ${toast.type === 'error' ? 'rgba(220,50,50,0.4)' : 'rgba(201,169,97,0.35)'}`, color: toast.type === 'error' ? '#f08080' : '#e8d5a3', fontFamily: 'Inter, sans-serif', letterSpacing: '0.15em' }}>
          {toast.type === 'error' ? '⚠' : '✦'} {toast.msg}
        </div>
      )}
    </div>
  )
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'Vandaag'
  if (d === 1) return 'Gisteren'
  return `${d} dagen geleden`
}

export default function Complaints() {
  const { authHeaders } = useAuth()
  const [tab, setTab] = useState('new')
  const [userProducts, setUserProducts] = useState([])
  const [complaints, setComplaints] = useState([])
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingList, setLoadingList] = useState(true)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  // Form state
  const [selectedProduct, setSelectedProduct] = useState('')
  const [problemType, setProblemType] = useState('')
  const [description, setDescription] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [success, setSuccess] = useState(false)

  const theme = localStorage.getItem('noirra_theme') || 'dark'
  const isLight = theme === 'light'
  const bg = isLight ? '#f5f0eb' : '#0a0a0a'
  const cardBg = isLight ? 'white' : 'rgba(255,255,255,0.04)'
  const cardBorder = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)'
  const textPrimary = isLight ? '#1a1a1a' : 'rgba(255,255,255,0.9)'
  const textSecondary = isLight ? 'rgba(26,26,26,0.5)' : 'rgba(255,255,255,0.35)'
  const inputBg = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const h = authHeaders()
    Promise.all([
      fetch('/api/user/products', { headers: h }).then(r => r.json()),
      fetch('/api/complaints', { headers: h }).then(r => r.json()),
    ]).then(([up, comp]) => {
      setUserProducts(Array.isArray(up) ? up : [])
      setComplaints(Array.isArray(comp) ? comp : [])
    }).catch(() => {}).finally(() => setLoadingList(false))
  }, [])

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedProduct || !problemType || !description.trim()) {
      showToast('Vul alle verplichte velden in', 'error')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ productId: selectedProduct, type: problemType, description }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Indienen mislukt', 'error')
        return
      }
      setComplaints(prev => [data, ...prev])
      setSuccess(true)
      setSelectedProduct('')
      setProblemType('')
      setDescription('')
      setPhotoFile(null)
      setPhotoPreview(null)
      showToast('Klacht succesvol ingediend')
      setTimeout(() => { setSuccess(false); setTab('mine') }, 2000)
    } catch {
      showToast('Verbinding mislukt', 'error')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    background: inputBg,
    border: `1px solid ${cardBorder}`,
    color: textPrimary,
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    outline: 'none',
    width: '100%',
  }

  return (
    <div className="min-h-screen" style={{ background: bg }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');`}</style>

      {/* Header */}
      <div className="pt-12 px-4 pb-4" style={{ borderBottom: `1px solid ${cardBorder}` }}>
        <h1 className="text-2xl font-semibold mb-4" style={{ fontFamily: '"Playfair Display", serif', color: textPrimary }}>
          Meldingen
        </h1>
        <div className="flex gap-0">
          {[{ id: 'new', label: 'Nieuw Melden' }, { id: 'mine', label: 'Mijn Meldingen' }].map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSelectedComplaint(null) }}
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

      {/* New complaint tab */}
      {tab === 'new' && (
        <div className="px-4 pt-5 pb-6">
          {success ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(74,222,128,0.15)', border: '2px solid rgba(74,222,128,0.4)' }}>
                <span className="text-2xl" style={{ color: '#4ade80' }}>✓</span>
              </div>
              <p className="text-base font-semibold" style={{ fontFamily: '"Playfair Display", serif', color: textPrimary }}>Klacht ingediend!</p>
              <p className="text-[11px] text-center" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>U ontvangt een bevestiging per e-mail.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Product select */}
              <div>
                <label className="block text-[10px] tracking-[0.3em] uppercase mb-1.5" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
                  Product *
                </label>
                <select
                  value={selectedProduct}
                  onChange={e => setSelectedProduct(e.target.value)}
                  style={{ ...inputStyle, padding: '10px 12px' }}
                >
                  <option value="">Selecteer een product</option>
                  {userProducts.map(rp => (
                    <option key={rp.id} value={rp.productId}>{rp.product?.name}</option>
                  ))}
                </select>
              </div>

              {/* Problem type */}
              <div>
                <label className="block text-[10px] tracking-[0.3em] uppercase mb-1.5" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
                  Type probleem *
                </label>
                <select
                  value={problemType}
                  onChange={e => setProblemType(e.target.value)}
                  style={{ ...inputStyle, padding: '10px 12px' }}
                >
                  <option value="">Selecteer type</option>
                  {PROBLEM_TYPES.map(pt => (
                    <option key={pt} value={pt}>{pt}</option>
                  ))}
                </select>
              </div>

              {/* Auto-detection hint for Smeltschade */}
              {problemType === 'Smeltschade' && (
                <div className="px-4 py-3" style={{ background: 'rgba(201,169,97,0.08)', border: '1px solid rgba(201,169,97,0.25)' }}>
                  <p className="text-[11px] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: '#c9a961' }}>
                    ✦ Wij herkennen dit probleem. Wilt u een vervangend product ontvangen?
                  </p>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-[10px] tracking-[0.3em] uppercase mb-1.5" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
                  Beschrijving *
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Beschrijf het probleem zo nauwkeurig mogelijk..."
                  rows={4}
                  style={{ ...inputStyle, padding: '10px 12px', resize: 'none' }}
                />
              </div>

              {/* Photo upload */}
              <div>
                <label className="block text-[10px] tracking-[0.3em] uppercase mb-1.5" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
                  Foto toevoegen (optioneel)
                </label>
                {photoPreview ? (
                  <div className="relative">
                    <img src={photoPreview} alt="Preview" className="w-full h-32 object-cover" style={{ border: `1px solid ${cardBorder}` }} />
                    <button
                      type="button"
                      onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
                      className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full text-xs"
                      style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label
                    className="flex items-center justify-center gap-3 py-5 cursor-pointer transition-all duration-200"
                    style={{ border: `1px dashed ${cardBorder}`, background: cardBg }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={textSecondary} strokeWidth="1.8">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span className="text-xs" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>Foto toevoegen</span>
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  </label>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 text-[11px] tracking-[0.35em] uppercase font-medium transition-all duration-200 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, rgba(201,169,97,0.15) 0%, rgba(201,169,97,0.08) 100%)', border: '1px solid rgba(201,169,97,0.4)', color: '#c9a961', fontFamily: 'Inter, sans-serif' }}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2"><span className="animate-spin">◌</span> Indienen...</span>
                ) : (
                  <span className="inline-flex items-center gap-3"><span style={{ opacity: 0.5 }}>✦</span> Klacht Indienen</span>
                )}
              </button>
            </form>
          )}
        </div>
      )}

      {/* My complaints tab */}
      {tab === 'mine' && (
        <div className="px-4 pt-4 pb-6">
          {selectedComplaint ? (
            <div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="flex items-center gap-2 mb-4 text-[11px] tracking-wider"
                style={{ fontFamily: 'Inter, sans-serif', color: '#c9a961' }}
              >
                ← Terug naar overzicht
              </button>

              <div className="p-4 mb-4" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold" style={{ fontFamily: '"Playfair Display", serif', color: textPrimary }}>
                      {selectedComplaint.type}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ fontFamily: 'monospace', color: textSecondary }}>
                      #{String(selectedComplaint.id).padStart(6, '0')}
                    </p>
                  </div>
                  {(() => {
                    const s = STATUS_CONFIG[selectedComplaint.status] || STATUS_CONFIG.open
                    return (
                      <span className="text-[9px] px-2 py-1 font-medium" style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontFamily: 'Inter, sans-serif' }}>
                        {s.label}
                      </span>
                    )
                  })()}
                </div>
                <p className="text-xs leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
                  {selectedComplaint.description}
                </p>
                {selectedComplaint.status === 'opgelost' && (
                  <p className="mt-2 text-[10px]" style={{ fontFamily: 'Inter, sans-serif', color: '#4ade80' }}>
                    ✓ Vergoeding aangevraagd
                  </p>
                )}
              </div>

              {/* Timeline */}
              <p className="text-[10px] tracking-[0.3em] uppercase mb-3" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
                Tijdlijn
              </p>
              <div className="relative pl-5">
                <div className="absolute left-2 top-0 bottom-0 w-px" style={{ background: cardBorder }} />
                {selectedComplaint.timeline?.map((entry, idx) => {
                  const s = STATUS_CONFIG[entry.status] || STATUS_CONFIG.open
                  return (
                    <div key={idx} className="relative mb-4 pl-4">
                      <div className="absolute -left-1 top-1.5 w-2.5 h-2.5 rounded-full" style={{ background: s.color, border: `2px solid ${bg}` }} />
                      <p className="text-[11px] font-medium mb-0.5" style={{ fontFamily: 'Inter, sans-serif', color: textPrimary }}>
                        {entry.message}
                      </p>
                      <p className="text-[9px]" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
                        {new Date(entry.timestamp).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : loadingList ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-20 animate-pulse rounded" style={{ background: cardBg }} />)}
            </div>
          ) : complaints.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <span style={{ color: textSecondary, fontSize: 40 }}>📋</span>
              <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>Geen meldingen gevonden</p>
            </div>
          ) : (
            <div className="space-y-3">
              {complaints.map((c) => {
                const s = STATUS_CONFIG[c.status] || STATUS_CONFIG.open
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedComplaint(c)}
                    className="w-full p-4 text-left transition-all duration-200"
                    style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif', color: textPrimary }}>{c.type}</p>
                      <span className="text-[9px] px-2 py-0.5 flex-shrink-0" style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontFamily: 'Inter, sans-serif' }}>
                        {s.label}
                      </span>
                    </div>
                    <p className="text-[11px] line-clamp-2 mb-2" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>{c.description}</p>
                    <p className="text-[9px]" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>{timeAgo(c.createdAt)} · #{String(c.id).padStart(6, '0')}</p>
                  </button>
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

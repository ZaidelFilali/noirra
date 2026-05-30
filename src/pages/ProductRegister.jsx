import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function Toast({ toast }) {
  return (
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
          className="flex items-center gap-3 px-5 py-3 text-xs whitespace-nowrap"
          style={{
            background: 'rgba(14,10,6,0.97)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${toast.type === 'error' ? 'rgba(220,50,50,0.4)' : 'rgba(201,169,97,0.35)'}`,
            color: toast.type === 'error' ? '#f08080' : '#e8d5a3',
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '0.15em',
          }}
        >
          {toast.type === 'error' ? '⚠' : '✦'} {toast.msg}
        </div>
      )}
    </div>
  )
}

export default function ProductRegister() {
  const navigate = useNavigate()
  const { authHeaders } = useAuth()
  const [step, setStep] = useState(1)
  const [method, setMethod] = useState(null)
  const [inputValue, setInputValue] = useState('')
  const [scanning, setScanning] = useState(false)
  const [foundProduct, setFoundProduct] = useState(null)
  const [registeredResult, setRegisteredResult] = useState(null)
  const [loading, setLoading] = useState(false)
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

  const sampleBatches = ['NR-2024-DRK-001', 'NR-2024-DRK-002', 'NR-2024-MLK-001', 'NR-2024-RBY-001', 'NR-2024-WHT-001']

  const lookupProduct = async (batchOrCode) => {
    try {
      const res = await fetch('/api/user/products', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ batchOrCode }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409) {
          showToast('Dit product is al geregistreerd', 'error')
          return null
        }
        showToast(data.error || 'Product niet gevonden', 'error')
        return null
      }
      return data
    } catch {
      showToast('Verbinding mislukt', 'error')
      return null
    }
  }

  const handleScan = async () => {
    setScanning(true)
    await new Promise(r => setTimeout(r, 2000))
    setScanning(false)
    const randomBatch = sampleBatches[Math.floor(Math.random() * sampleBatches.length)]
    const result = await lookupProduct(randomBatch)
    if (result) {
      setFoundProduct(result)
      setRegisteredResult(result)
      setStep(3)
    }
  }

  const handleManualSubmit = async (e) => {
    e.preventDefault()
    if (!inputValue.trim()) {
      showToast('Voer een batch nummer of productcode in', 'error')
      return
    }
    setLoading(true)
    const result = await lookupProduct(inputValue.trim())
    setLoading(false)
    if (result) {
      setFoundProduct(result)
      setStep(2)
    }
  }

  const handleConfirm = async () => {
    setRegisteredResult(foundProduct)
    setStep(3)
  }

  return (
    <div className="min-h-screen px-4 pt-12 pb-4" style={{ background: bg }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');`}</style>

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => step > 1 && step < 3 ? setStep(s => s - 1) : navigate('/products')} className="w-9 h-9 flex items-center justify-center" style={{ border: `1px solid ${cardBorder}`, background: cardBg }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={textSecondary} strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-semibold" style={{ fontFamily: '"Playfair Display", serif', color: textPrimary }}>
            Product Registreren
          </h1>
          <p className="text-[10px] tracking-wider" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
            Stap {step} van 3
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-1.5 mb-8">
        {[1, 2, 3].map(s => (
          <div
            key={s}
            className="flex-1 h-1 rounded-full transition-all duration-400"
            style={{ background: s <= step ? '#c9a961' : isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)' }}
          />
        ))}
      </div>

      {/* Step 1: Choose method */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm mb-6 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
            Hoe wilt u uw product registreren?
          </p>

          {/* QR Scan option */}
          <button
            onClick={() => { setMethod('qr'); handleScan() }}
            disabled={scanning}
            className="w-full p-6 text-left transition-all duration-200"
            style={{ background: cardBg, border: `1px solid ${scanning ? 'rgba(201,169,97,0.4)' : cardBorder}` }}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(201,169,97,0.1)', border: '1px solid rgba(201,169,97,0.2)' }}>
                {scanning ? (
                  <span className="text-xl animate-spin" style={{ color: '#c9a961' }}>◌</span>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c9a961" strokeWidth="1.8">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <path d="M14 14h3v3M17 14h3M17 17h3M14 17v3" strokeLinecap="round" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-medium mb-1" style={{ fontFamily: 'Inter, sans-serif', color: textPrimary }}>
                  QR-code scannen
                </p>
                <p className="text-[11px] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
                  {scanning ? 'Scannen... Een ogenblik geduld.' : 'Scan de QR-code op uw verpakking voor snelle registratie.'}
                </p>
                {!scanning && (
                  <span className="inline-block mt-2 text-[10px] px-3 py-1 tracking-wider" style={{ background: 'rgba(201,169,97,0.1)', border: '1px solid rgba(201,169,97,0.25)', color: '#c9a961', fontFamily: 'Inter, sans-serif' }}>
                    Open Camera
                  </span>
                )}
              </div>
            </div>
            {scanning && (
              <div className="mt-4 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(201,169,97,0.1)' }}>
                <div className="h-full rounded-full animate-pulse" style={{ width: '60%', background: '#c9a961' }} />
              </div>
            )}
          </button>

          {/* Manual input option */}
          <div className="p-6" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${cardBorder}` }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={textSecondary} strokeWidth="1.8">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium mb-1" style={{ fontFamily: 'Inter, sans-serif', color: textPrimary }}>
                  Handmatig invoeren
                </p>
                <p className="text-[11px]" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
                  Voer het batch nummer of de productcode in van uw verpakking.
                </p>
              </div>
            </div>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="bv. NR-2024-DRK-001"
                className="flex-1 px-3 py-2.5 text-sm outline-none"
                style={{
                  background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${cardBorder}`,
                  color: textPrimary,
                  fontFamily: 'monospace',
                  fontSize: 12,
                }}
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2.5 text-[10px] tracking-wider font-medium transition-all duration-200 disabled:opacity-50"
                style={{ background: 'rgba(201,169,97,0.12)', border: '1px solid rgba(201,169,97,0.35)', color: '#c9a961', fontFamily: 'Inter, sans-serif' }}
              >
                {loading ? '◌' : 'Zoeken'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Step 2: Confirm product */}
      {step === 2 && foundProduct && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.2)' }}>
              <span className="text-[10px]" style={{ color: '#4ade80' }}>✓</span>
            </div>
            <p className="text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif', color: '#4ade80' }}>
              Product gevonden!
            </p>
          </div>

          <div className="p-5" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded flex-shrink-0" style={{ background: foundProduct.product?.color || '#5C2810' }} />
              <div>
                <p className="text-base font-semibold mb-1" style={{ fontFamily: '"Playfair Display", serif', color: textPrimary }}>
                  {foundProduct.product?.name}
                </p>
                <p className="text-[10px] mb-2" style={{ fontFamily: 'monospace', color: textSecondary }}>
                  {foundProduct.product?.batch}
                </p>
                <div className="flex flex-wrap gap-1">
                  {foundProduct.product?.certifications?.map(c => (
                    <span key={c} className="text-[9px] px-2 py-0.5" style={{ background: 'rgba(201,169,97,0.1)', border: '1px solid rgba(201,169,97,0.25)', color: '#c9a961', fontFamily: 'Inter, sans-serif' }}>
                      ✓ {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 grid grid-cols-2 gap-3" style={{ borderTop: `1px solid ${cardBorder}` }}>
              <div>
                <p className="text-[9px] tracking-wider uppercase mb-0.5" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>Herkomst</p>
                <p className="text-xs" style={{ fontFamily: 'Inter, sans-serif', color: textPrimary }}>{foundProduct.product?.origin}</p>
              </div>
              <div>
                <p className="text-[9px] tracking-wider uppercase mb-0.5" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>Gewicht</p>
                <p className="text-xs" style={{ fontFamily: 'Inter, sans-serif', color: textPrimary }}>{foundProduct.product?.weight}g</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleConfirm}
            className="w-full py-4 text-[11px] tracking-[0.35em] uppercase font-medium transition-all duration-200"
            style={{ background: 'linear-gradient(135deg, rgba(201,169,97,0.15) 0%, rgba(201,169,97,0.08) 100%)', border: '1px solid rgba(201,169,97,0.4)', color: '#c9a961', fontFamily: 'Inter, sans-serif' }}
          >
            <span className="inline-flex items-center gap-3">
              <span style={{ opacity: 0.5 }}>✦</span>
              Product Registreren
            </span>
          </button>
        </div>
      )}

      {/* Step 3: Success */}
      {step === 3 && registeredResult && (
        <div className="space-y-4">
          <div className="text-center py-8">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.4)' }}
            >
              <span className="text-3xl" style={{ color: '#4ade80' }}>✓</span>
            </div>
            <h2 className="text-xl font-semibold mb-1" style={{ fontFamily: '"Playfair Display", serif', color: textPrimary }}>
              Geregistreerd!
            </h2>
            <p className="text-[11px]" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
              Uw product is succesvol gekoppeld aan uw account.
            </p>
          </div>

          <div className="p-5" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded flex-shrink-0" style={{ background: registeredResult.product?.color || '#5C2810' }} />
              <div>
                <p className="text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif', color: textPrimary }}>
                  {registeredResult.product?.name}
                </p>
                <p className="text-[10px] mt-0.5" style={{ fontFamily: 'monospace', color: textSecondary }}>
                  {registeredResult.product?.batch}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3" style={{ borderTop: `1px solid ${cardBorder}` }}>
              <div>
                <p className="text-[9px] tracking-wider uppercase mb-0.5" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>Geregistreerd op</p>
                <p className="text-[10px]" style={{ fontFamily: 'Inter, sans-serif', color: textPrimary }}>
                  {new Date(registeredResult.registeredAt).toLocaleDateString('nl-NL')}
                </p>
              </div>
              <div>
                <p className="text-[9px] tracking-wider uppercase mb-0.5" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>Verloopt op</p>
                <p className="text-[10px]" style={{ fontFamily: 'Inter, sans-serif', color: textPrimary }}>
                  {new Date(registeredResult.expiresAt).toLocaleDateString('nl-NL')}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/products')}
            className="w-full py-4 text-[11px] tracking-[0.35em] uppercase font-medium transition-all duration-200"
            style={{ background: 'linear-gradient(135deg, rgba(201,169,97,0.15) 0%, rgba(201,169,97,0.08) 100%)', border: '1px solid rgba(201,169,97,0.4)', color: '#c9a961', fontFamily: 'Inter, sans-serif' }}
          >
            Terug naar producten
          </button>

          <button
            onClick={() => { setStep(1); setMethod(null); setInputValue(''); setFoundProduct(null); setRegisteredResult(null) }}
            className="w-full py-3 text-[10px] tracking-wider"
            style={{ fontFamily: 'Inter, sans-serif', color: textSecondary, background: 'transparent', border: 'none' }}
          >
            Nog een product registreren
          </button>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  )
}

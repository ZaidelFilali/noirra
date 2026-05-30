import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function Toast({ toast }) {
  return (
    <div
      className="fixed bottom-8 left-1/2 z-50 pointer-events-none"
      style={{
        transform: toast ? 'translate(-50%, 0)' : 'translate(-50%, 16px)',
        opacity: toast ? 1 : 0,
        transition: 'all 0.35s ease',
      }}
    >
      {toast && (
        <div
          className="flex items-center gap-3 px-6 py-3.5 text-xs whitespace-nowrap"
          style={{
            background: 'rgba(14,10,6,0.97)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${toast.type === 'error' ? 'rgba(220,50,50,0.4)' : 'rgba(201,169,97,0.35)'}`,
            color: toast.type === 'error' ? '#f08080' : '#e8d5a3',
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '0.15em',
          }}
        >
          <span style={{ opacity: 0.6 }}>{toast.type === 'error' ? '⚠' : '✦'}</span>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [step, setStep] = useState('login') // 'login' | '2fa'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [pendingToken, setPendingToken] = useState(null)
  const [pendingUser, setPendingUser] = useState(null)
  const codeRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()]
  const toastTimer = useRef(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      showToast('Vul uw e-mailadres en wachtwoord in', 'error')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Inloggen mislukt', 'error')
        return
      }
      if (data.requires2FA) {
        setPendingToken(data.token)
        setPendingUser(data.user)
        setStep('2fa')
      } else {
        login(data.token, data.user)
        navigate('/dashboard')
      }
    } catch {
      showToast('Verbinding mislukt. Controleer of de server actief is.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCodeChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return
    const newCode = [...code]
    newCode[idx] = val.slice(-1)
    setCode(newCode)
    if (val && idx < 5) {
      codeRefs[idx + 1].current?.focus()
    }
  }

  const handleCodeKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      codeRefs[idx - 1].current?.focus()
    }
  }

  const handle2FA = async (e) => {
    e.preventDefault()
    const fullCode = code.join('')
    if (fullCode.length !== 6) {
      showToast('Voer alle 6 cijfers in', 'error')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: fullCode }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Verificatie mislukt', 'error')
        return
      }
      login(pendingToken, pendingUser)
      showToast('Welkom bij Noirra ✦')
      setTimeout(() => navigate('/dashboard'), 600)
    } catch {
      showToast('Verificatie mislukt. Probeer opnieuw.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (type) => {
    if (type === 'b2c') {
      setEmail('demo@noirra.nl')
      setPassword('demo123')
    } else {
      setEmail('b2b@noirra.nl')
      setPassword('b2b123')
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0d0905 0%, #0a0a0a 50%, #060810 100%)' }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');`}</style>

      {/* Background decoration */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, rgba(201,169,97,0.06) 0%, transparent 65%)',
        }}
      />
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(to right, transparent, rgba(201,169,97,0.3), transparent)' }}
      />

      <div className="w-full max-w-sm relative z-10">

        {/* Logo */}
        <div className="text-center mb-10">
          <h1
            className="text-6xl tracking-[0.35em] text-white leading-none mb-3"
            style={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700 }}
          >
            NOIRRA
          </h1>
          <p
            className="text-[11px] tracking-[0.4em] uppercase"
            style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300, color: '#c9a961', opacity: 0.8 }}
          >
            Crafted by Code.&nbsp;&nbsp;Designed by You.
          </p>
          <div
            className="mt-4 h-px mx-auto w-24"
            style={{ background: 'linear-gradient(to right, transparent, rgba(201,169,97,0.4), transparent)' }}
          />
        </div>

        {step === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                className="block text-[10px] tracking-[0.35em] uppercase mb-2"
                style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.35)' }}
              >
                E-mailadres
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="uw@email.nl"
                autoComplete="email"
                className="w-full px-4 py-3.5 text-sm outline-none transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.9)',
                  fontFamily: 'Inter, sans-serif',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(201,169,97,0.5)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
              />
            </div>
            <div>
              <label
                className="block text-[10px] tracking-[0.35em] uppercase mb-2"
                style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.35)' }}
              >
                Wachtwoord
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full px-4 py-3.5 text-sm outline-none transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.9)',
                  fontFamily: 'Inter, sans-serif',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(201,169,97,0.5)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 text-[11px] tracking-[0.4em] uppercase font-medium transition-all duration-300 mt-2 disabled:opacity-50"
              style={{
                background: loading ? 'rgba(201,169,97,0.1)' : 'linear-gradient(135deg, rgba(201,169,97,0.15) 0%, rgba(201,169,97,0.08) 100%)',
                border: '1px solid rgba(201,169,97,0.4)',
                color: '#c9a961',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="animate-spin opacity-60">◌</span>
                  Inloggen...
                </span>
              ) : (
                <span className="inline-flex items-center gap-3">
                  <span style={{ opacity: 0.5 }}>✦</span>
                  Inloggen
                  <span style={{ opacity: 0.5 }}>→</span>
                </span>
              )}
            </button>

            {/* Demo accounts */}
            <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p
                className="text-center text-[10px] tracking-[0.3em] uppercase mb-3"
                style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.2)' }}
              >
                Demo Accounts
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fillDemo('b2c')}
                  className="py-2.5 px-3 text-[10px] tracking-wider text-center transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.4)',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <div className="font-medium mb-0.5" style={{ color: 'rgba(201,169,97,0.7)' }}>Demo B2C</div>
                  <div>demo@noirra.nl</div>
                  <div style={{ color: 'rgba(255,255,255,0.25)' }}>demo123</div>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('b2b')}
                  className="py-2.5 px-3 text-[10px] tracking-wider text-center transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.4)',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <div className="font-medium mb-0.5" style={{ color: 'rgba(201,169,97,0.7)' }}>Demo B2B</div>
                  <div>b2b@noirra.nl</div>
                  <div style={{ color: 'rgba(255,255,255,0.25)' }}>b2b123</div>
                </button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handle2FA} className="space-y-6">
            <div className="text-center mb-2">
              <div
                className="text-2xl mb-1"
                style={{ fontFamily: '"Playfair Display", serif', color: '#c9a961' }}
              >
                ✦
              </div>
              <h2
                className="text-base font-semibold mb-1"
                style={{ fontFamily: '"Playfair Display", serif', color: 'white' }}
              >
                Verificatiecode invoeren
              </h2>
              <p
                className="text-[11px] leading-relaxed"
                style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.35)' }}
              >
                Voer de 6-cijferige code in uit uw authenticator-app
              </p>
            </div>

            <div className="flex gap-2 justify-center">
              {code.map((digit, idx) => (
                <input
                  key={idx}
                  ref={codeRefs[idx]}
                  type="text"
                  inputMode="numeric"
                  value={digit}
                  onChange={e => handleCodeChange(idx, e.target.value)}
                  onKeyDown={e => handleCodeKeyDown(idx, e)}
                  maxLength={1}
                  className="w-12 h-14 text-center text-xl font-semibold outline-none transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${digit ? 'rgba(201,169,97,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    color: 'white',
                    fontFamily: 'Inter, sans-serif',
                  }}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 text-[11px] tracking-[0.4em] uppercase font-medium transition-all duration-300 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, rgba(201,169,97,0.15) 0%, rgba(201,169,97,0.08) 100%)',
                border: '1px solid rgba(201,169,97,0.4)',
                color: '#c9a961',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="animate-spin opacity-60">◌</span>
                  Verifiëren...
                </span>
              ) : (
                <span className="inline-flex items-center gap-3">
                  <span style={{ opacity: 0.5 }}>✦</span>
                  Verifiëren
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setStep('login'); setCode(['', '', '', '', '', '']) }}
              className="w-full text-center text-[10px] tracking-wider"
              style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.2)' }}
            >
              ← Terug naar inloggen
            </button>
          </form>
        )}
      </div>

      <Toast toast={toast} />
    </div>
  )
}

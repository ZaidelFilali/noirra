import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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

const FAQ = [
  {
    q: 'Hoe registreer ik een product?',
    a: 'Ga naar Producten → Product Registreren. Scan de QR-code op uw verpakking of voer handmatig het batch nummer in (te vinden op de achterkant van uw chocolade).'
  },
  {
    q: 'Wat zijn de levertijden?',
    a: 'Standaard levering duurt 1–3 werkdagen. B2B-klanten kunnen speciale leveringsafspraken maken. Bestellingen geplaatst voor 14:00 worden dezelfde dag verwerkt.'
  },
  {
    q: 'Hoe dien ik een klacht in?',
    a: 'Navigeer naar de Meldingen-pagina. U kunt het type probleem selecteren, een beschrijving geven en een foto toevoegen. Wij behandelen uw klacht binnen 3 werkdagen.'
  },
]

export default function Profile() {
  const { user, authHeaders, updateUser, logout } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [language, setLanguage] = useState(user?.language || 'nl')
  const [theme, setTheme] = useState(localStorage.getItem('noirra_theme') || user?.theme || 'dark')
  const [notifPrefs, setNotifPrefs] = useState(user?.notificationPrefs || {
    productupdates: true, promoties: true, duurzaamheid: true, community: true, evenementen: true
  })
  const [twoFA, setTwoFA] = useState(user?.twoFAEnabled || false)
  const [saving, setSaving] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

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

  const handleSave = async (updates) => {
    setSaving(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Opslaan mislukt', 'error')
        return
      }
      updateUser(data)
      showToast('Instellingen opgeslagen')
    } catch {
      showToast('Verbinding mislukt', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme)
    localStorage.setItem('noirra_theme', newTheme)
    handleSave({ theme: newTheme })
    // Force reload to apply theme
    window.location.reload()
  }

  const handleNotifChange = (key) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] }
    setNotifPrefs(updated)
    handleSave({ notificationPrefs: updated })
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const inputStyle = {
    background: inputBg,
    border: `1px solid ${cardBorder}`,
    color: textPrimary,
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    outline: 'none',
    width: '100%',
    padding: '10px 12px',
  }

  return (
    <div className="min-h-screen pb-8" style={{ background: bg }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');`}</style>

      {/* Header */}
      <div className="pt-12 px-4 pb-4" style={{ borderBottom: `1px solid ${cardBorder}` }}>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: '"Playfair Display", serif', color: textPrimary }}>
          Profiel
        </h1>
      </div>

      {/* User info card */}
      <div className="mx-4 mt-4 p-4" style={{ background: 'linear-gradient(135deg, rgba(201,169,97,0.08) 0%, rgba(201,169,97,0.03) 100%)', border: '1px solid rgba(201,169,97,0.2)' }}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-black flex-shrink-0" style={{ background: 'linear-gradient(135deg, #c9a961 0%, #a88542 100%)' }}>
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <p className="text-base font-semibold" style={{ fontFamily: '"Playfair Display", serif', color: textPrimary }}>{user?.name}</p>
            <p className="text-[11px]" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] px-2 py-0.5" style={{ background: 'rgba(201,169,97,0.12)', border: '1px solid rgba(201,169,97,0.25)', color: '#c9a961', fontFamily: 'Inter, sans-serif' }}>
                {user?.role === 'b2b' ? 'B2B' : 'B2C'}
              </span>
              <span className="text-[9px] px-2 py-0.5" style={{ background: 'rgba(201,169,97,0.12)', border: '1px solid rgba(201,169,97,0.25)', color: '#c9a961', fontFamily: 'Inter, sans-serif' }}>
                {user?.loyaltyLevel} · {user?.points} pts
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 mt-5 space-y-5">

        {/* Account section */}
        <section>
          <p className="text-[10px] tracking-[0.35em] uppercase mb-3" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
            Account
          </p>
          <div className="p-4 space-y-3" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
            <div>
              <label className="block text-[10px] tracking-[0.25em] uppercase mb-1.5" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>Naam</label>
              <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.25em] uppercase mb-1.5" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>E-mailadres</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" style={inputStyle} />
            </div>
            <button
              onClick={() => handleSave({ name, email })}
              disabled={saving}
              className="w-full py-2.5 text-[10px] tracking-wider uppercase disabled:opacity-50 transition-all duration-200"
              style={{ border: '1px solid rgba(201,169,97,0.35)', color: '#c9a961', fontFamily: 'Inter, sans-serif', background: 'transparent' }}
            >
              {saving ? 'Opslaan...' : 'Wijzigingen Opslaan'}
            </button>
          </div>
        </section>

        {/* Language section */}
        <section>
          <p className="text-[10px] tracking-[0.35em] uppercase mb-3" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
            Taal
          </p>
          <div className="p-4" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
            <div className="grid grid-cols-4 gap-2">
              {['nl', 'en', 'fr', 'de'].map(lang => (
                <button
                  key={lang}
                  onClick={() => { setLanguage(lang); handleSave({ language: lang }) }}
                  className="py-2 text-[11px] uppercase font-medium transition-all duration-200"
                  style={{
                    background: language === lang ? 'rgba(201,169,97,0.12)' : 'transparent',
                    border: `1px solid ${language === lang ? 'rgba(201,169,97,0.4)' : cardBorder}`,
                    color: language === lang ? '#c9a961' : textSecondary,
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Theme section */}
        <section>
          <p className="text-[10px] tracking-[0.35em] uppercase mb-3" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
            Weergave
          </p>
          <div className="p-4" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
            <div className="flex gap-3">
              {[
                { id: 'dark', label: 'Donker', icon: '🌙' },
                { id: 'light', label: 'Licht', icon: '☀️' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => handleThemeChange(t.id)}
                  className="flex-1 py-3 flex flex-col items-center gap-1 transition-all duration-200"
                  style={{
                    background: theme === t.id ? 'rgba(201,169,97,0.1)' : 'transparent',
                    border: `1px solid ${theme === t.id ? 'rgba(201,169,97,0.4)' : cardBorder}`,
                    color: theme === t.id ? '#c9a961' : textSecondary,
                  }}
                >
                  <span className="text-lg">{t.icon}</span>
                  <span className="text-[10px] font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Notifications section */}
        <section>
          <p className="text-[10px] tracking-[0.35em] uppercase mb-3" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
            Notificaties
          </p>
          <div className="p-4 space-y-3" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
            {[
              { key: 'productupdates', label: 'Productupdates' },
              { key: 'promoties', label: 'Promoties' },
              { key: 'duurzaamheid', label: 'Duurzaamheid' },
              { key: 'community', label: 'Community' },
              { key: 'evenementen', label: 'Evenementen' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: textPrimary }}>{label}</span>
                <button
                  onClick={() => handleNotifChange(key)}
                  className="relative transition-all duration-300"
                  style={{ width: 44, height: 24 }}
                >
                  <div
                    className="absolute inset-0 rounded-full transition-all duration-300"
                    style={{ background: notifPrefs[key] ? '#c9a961' : isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)' }}
                  />
                  <div
                    className="absolute top-1 transition-all duration-300 rounded-full"
                    style={{
                      left: notifPrefs[key] ? 22 : 4,
                      width: 16, height: 16,
                      background: 'white',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }}
                  />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Privacy & Security section */}
        <section>
          <p className="text-[10px] tracking-[0.35em] uppercase mb-3" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
            Privacy & Beveiliging
          </p>
          <div className="p-4 space-y-3" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif', color: textPrimary }}>Twee-factor authenticatie</p>
                <p className="text-[10px] mt-0.5" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>Bescherm uw account met extra verificatie</p>
              </div>
              <button
                onClick={() => { setTwoFA(!twoFA); handleSave({ twoFAEnabled: !twoFA }) }}
                className="relative transition-all duration-300"
                style={{ width: 44, height: 24, flexShrink: 0 }}
              >
                <div className="absolute inset-0 rounded-full transition-all duration-300" style={{ background: twoFA ? '#c9a961' : isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)' }} />
                <div className="absolute top-1 transition-all duration-300 rounded-full" style={{ left: twoFA ? 22 : 4, width: 16, height: 16, background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
              </button>
            </div>
            <div className="pt-2 space-y-2" style={{ borderTop: `1px solid ${cardBorder}` }}>
              <button className="w-full text-left text-[11px] py-1" style={{ fontFamily: 'Inter, sans-serif', color: '#c9a961' }}>
                Privacybeleid bekijken →
              </button>
              <button className="w-full text-left text-[11px] py-1" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
                Gegevensinzage aanvragen →
              </button>
              <p className="text-[10px] leading-relaxed pt-1" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
                Conform AVG/GDPR. Uw gegevens worden alleen gebruikt voor het beheer van uw account en het verbeteren van onze diensten.
              </p>
            </div>
          </div>
        </section>

        {/* Help & Support section */}
        <section>
          <p className="text-[10px] tracking-[0.35em] uppercase mb-3" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
            Hulp & Ondersteuning
          </p>
          <div className="space-y-1.5">
            {FAQ.map((item, idx) => (
              <div key={idx} style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                <button
                  className="w-full p-4 text-left flex items-center justify-between gap-2"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                >
                  <span className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: textPrimary }}>{item.q}</span>
                  <span className="text-sm flex-shrink-0 transition-transform duration-200" style={{ color: textSecondary, transform: openFaq === idx ? 'rotate(180deg)' : 'none' }}>
                    ↓
                  </span>
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-4">
                    <p className="text-[11px] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate('/chat')}
            className="w-full mt-3 py-3 text-[10px] tracking-wider uppercase transition-all duration-200"
            style={{ background: 'rgba(201,169,97,0.08)', border: '1px solid rgba(201,169,97,0.25)', color: '#c9a961', fontFamily: 'Inter, sans-serif' }}
          >
            ✦ Contact opnemen via Chat
          </button>
        </section>

        {/* Logout */}
        <section className="pb-4">
          <button
            onClick={handleLogout}
            className="w-full py-4 text-[11px] tracking-[0.35em] uppercase font-medium transition-all duration-200"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontFamily: 'Inter, sans-serif' }}
          >
            Uitloggen
          </button>
        </section>
      </div>

      <Toast toast={toast} />
    </div>
  )
}

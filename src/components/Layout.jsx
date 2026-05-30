import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

function IconHome() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.55 5.45 21 6 21H9M19 10L21 12M19 10V20C19 20.55 18.55 21 18 21H15M9 21V15C9 14.45 9.45 14 10 14H14C14.55 14 15 14.45 15 15V21M9 21H15" />
    </svg>
  )
}

function IconGrid() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function IconMessage() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15C21 15.53 20.79 16.04 20.41 16.41C20.04 16.79 19.53 17 19 17H7L3 21V5C3 4.47 3.21 3.96 3.59 3.59C3.96 3.21 4.47 3 5 3H19C19.53 3 20.04 3.21 20.41 3.59C20.79 3.96 21 4.47 21 5V15Z" />
    </svg>
  )
}

function IconUser() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21V19C20 17.93 19.58 16.9 18.83 16.17C18.1 15.42 17.07 15 16 15H8C6.93 15 5.9 15.42 5.17 16.17C4.42 16.9 4 17.93 4 19V21" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function IconSparkle() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" />
      <path d="M19 2L19.7 4.3L22 5L19.7 5.7L19 8L18.3 5.7L16 5L18.3 4.3L19 2Z" opacity="0.6" />
      <path d="M5 16L5.5 17.5L7 18L5.5 18.5L5 20L4.5 18.5L3 18L4.5 17.5L5 16Z" opacity="0.6" />
    </svg>
  )
}

export default function Layout() {
  const location = useLocation()
  const { authHeaders } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetch('/api/notifications', { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUnreadCount(data.filter(n => !n.read).length)
        }
      })
      .catch(() => {})
  }, [location.pathname])

  const theme = localStorage.getItem('noirra_theme') || 'dark'
  const isDark = theme !== 'light'

  const bg = isDark ? '#0a0a0a' : '#f5f0eb'
  const navBg = isDark ? 'rgba(10,10,10,0.96)' : 'rgba(245,240,235,0.96)'
  const navBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.1)'
  const inactiveColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(26,26,26,0.4)'
  const activeColor = '#c9a961'

  const tabs = [
    { to: '/dashboard', label: 'Dashboard', icon: <IconHome /> },
    { to: '/products', label: 'Producten', icon: <IconGrid /> },
    { to: '/configurator', label: 'Noirra', icon: null, center: true },
    { to: '/chat', label: 'Chat', icon: <IconMessage />, badge: unreadCount },
    { to: '/profile', label: 'Profiel', icon: <IconUser /> },
  ]

  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{ background: bg, fontFamily: 'Inter, sans-serif' }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');`}</style>

      {/* Main content */}
      <div
        className="w-full pb-20 overflow-y-auto"
        style={{ maxWidth: '430px', minHeight: '100vh' }}
      >
        <Outlet />
      </div>

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
        style={{ background: 'transparent' }}
      >
        <div
          className="w-full flex items-center justify-around"
          style={{
            maxWidth: '430px',
            background: navBg,
            borderTop: `1px solid ${navBorder}`,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.to ||
              (tab.to === '/products' && location.pathname.startsWith('/products'))
            const color = isActive ? activeColor : inactiveColor

            if (tab.center) {
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className="flex flex-col items-center justify-center py-2 flex-1"
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    className="flex items-center justify-center mb-1 transition-all duration-300"
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: location.pathname === tab.to
                        ? 'linear-gradient(135deg, #c9a961 0%, #a88542 100%)'
                        : 'linear-gradient(135deg, rgba(201,169,97,0.15) 0%, rgba(201,169,97,0.08) 100%)',
                      border: `1.5px solid ${location.pathname === tab.to ? '#c9a961' : 'rgba(201,169,97,0.3)'}`,
                      color: location.pathname === tab.to ? '#0a0a0a' : '#c9a961',
                      boxShadow: location.pathname === tab.to ? '0 0 20px rgba(201,169,97,0.4)' : 'none',
                    }}
                  >
                    <IconSparkle />
                  </div>
                  <span
                    className="text-[9px] tracking-wider uppercase transition-colors duration-200"
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 500,
                      color: location.pathname === tab.to ? activeColor : inactiveColor
                    }}
                  >
                    {tab.label}
                  </span>
                </NavLink>
              )
            }

            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className="flex flex-col items-center justify-center py-3 flex-1 relative transition-colors duration-200"
                style={{ textDecoration: 'none', color }}
              >
                <div className="relative">
                  <div style={{ color }} className="transition-colors duration-200">
                    {tab.icon}
                  </div>
                  {tab.badge > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-black"
                      style={{ background: '#c9a961', fontFamily: 'Inter, sans-serif' }}
                    >
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </div>
                <span
                  className="text-[9px] mt-1 tracking-wider uppercase transition-colors duration-200"
                  style={{ fontFamily: 'Inter, sans-serif', fontWeight: isActive ? 500 : 400, color }}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                    style={{ background: activeColor }}
                  />
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

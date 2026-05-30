import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'zojuist'
  if (m < 60) return `${m}m geleden`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}u geleden`
  return `${Math.floor(h / 24)}d geleden`
}

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

export default function Community() {
  const { user, authHeaders } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewPost, setShowNewPost] = useState(false)
  const [newPostContent, setNewPostContent] = useState('')
  const [postLoading, setPostLoading] = useState(false)
  const [expandedComment, setExpandedComment] = useState(null)
  const [commentInput, setCommentInput] = useState('')
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

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
    fetch('/api/community/posts')
      .then(r => r.json())
      .then(data => setPosts(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleLike = async (postId) => {
    try {
      const res = await fetch(`/api/community/posts/${postId}/like`, { method: 'POST', headers: authHeaders() })
      const data = await res.json()
      if (res.ok) {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: data.likes } : p))
      }
    } catch {}
  }

  const handleNewPost = async (e) => {
    e.preventDefault()
    if (!newPostContent.trim()) {
      showToast('Schrijf eerst een bericht', 'error')
      return
    }
    setPostLoading(true)
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ content: newPostContent }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Plaatsen mislukt', 'error')
        return
      }
      setPosts(prev => [data, ...prev])
      setNewPostContent('')
      setShowNewPost(false)
      showToast('Bericht geplaatst ✦')
    } catch {
      showToast('Verbinding mislukt', 'error')
    } finally {
      setPostLoading(false)
    }
  }

  const handleComment = async (postId) => {
    if (!commentInput.trim()) return
    try {
      const res = await fetch(`/api/community/posts/${postId}/comment`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ content: commentInput }),
      })
      const data = await res.json()
      if (res.ok) {
        setPosts(prev => prev.map(p => p.id === postId ? data : p))
        setCommentInput('')
        setExpandedComment(null)
        showToast('Reactie geplaatst')
      }
    } catch {}
  }

  const BADGE_COLORS = {
    'Chocoladeliefhebber': '#c9a961',
    'Vroege Vogel': '#60a5fa',
    'Trouwe Klant': '#4ade80',
    'Zakelijke Partner': '#a78bfa',
    'Platinum Member': '#e2e8f0',
    'Bulk Buyer': '#fb923c',
  }

  return (
    <div className="min-h-screen" style={{ background: bg }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');`}</style>

      {/* Header */}
      <div className="pt-12 px-4 pb-4" style={{ borderBottom: `1px solid ${cardBorder}` }}>
        <h1 className="text-2xl font-semibold mb-1" style={{ fontFamily: '"Playfair Display", serif', color: textPrimary }}>
          Community
        </h1>

        {/* User badges */}
        {user?.badges?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {user.badges.map(b => (
              <span key={b} className="text-[9px] px-2 py-0.5 font-medium" style={{ fontFamily: 'Inter, sans-serif', color: BADGE_COLORS[b] || '#c9a961', background: `${(BADGE_COLORS[b] || '#c9a961')}18`, border: `1px solid ${(BADGE_COLORS[b] || '#c9a961')}33` }}>
                {b}
              </span>
            ))}
          </div>
        )}

        {/* Loyalty */}
        <p className="text-sm font-semibold" style={{ fontFamily: '"Playfair Display", serif', color: '#c9a961' }}>
          {user?.points} punten · {user?.loyaltyLevel} Member
        </p>
      </div>

      {/* Challenge banner */}
      <div className="mx-4 mt-4 p-4" style={{ background: 'linear-gradient(135deg, rgba(201,169,97,0.1) 0%, rgba(201,169,97,0.04) 100%)', border: '1px solid rgba(201,169,97,0.25)' }}>
        <p className="text-[10px] tracking-[0.3em] uppercase mb-1" style={{ fontFamily: 'Inter, sans-serif', color: '#c9a961', opacity: 0.7 }}>
          Actieve Challenge
        </p>
        <p className="text-sm font-semibold" style={{ fontFamily: '"Playfair Display", serif', color: textPrimary }}>
          Receptchallenge: Deel je favoriete Noirra-recept en win punten!
        </p>
        <p className="text-[10px] mt-1" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>
          De beste 3 recepten winnen 100 bonuspunten en een luxe proefpakket.
        </p>
      </div>

      {/* Posts */}
      <div className="px-4 pt-4 pb-24 space-y-4">
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-32 animate-pulse rounded" style={{ background: cardBg }} />)}</div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <span style={{ color: textSecondary, fontSize: 40 }}>💬</span>
            <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>Nog geen berichten</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="p-4" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
              {/* Post header */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-black" style={{ background: '#c9a961' }}>
                  {post.userName?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif', color: textPrimary }}>{post.userName}</span>
                    {post.badge && (
                      <span className="text-[8px] px-1.5 py-0.5" style={{ fontFamily: 'Inter, sans-serif', color: BADGE_COLORS[post.badge] || '#c9a961', background: `${(BADGE_COLORS[post.badge] || '#c9a961')}18`, border: `1px solid ${(BADGE_COLORS[post.badge] || '#c9a961')}30` }}>
                        {post.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px]" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>{timeAgo(post.createdAt)}</p>
                </div>
              </div>

              {/* Post content */}
              <p className="text-sm leading-relaxed mb-3" style={{ fontFamily: 'Inter, sans-serif', color: textPrimary }}>
                {post.content}
              </p>

              {/* Post actions */}
              <div className="flex items-center gap-4 pt-2" style={{ borderTop: `1px solid ${cardBorder}` }}>
                <button
                  onClick={() => handleLike(post.id)}
                  className="flex items-center gap-1.5 text-[11px] transition-all duration-150"
                  style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  {post.likes}
                </button>
                <button
                  onClick={() => setExpandedComment(expandedComment === post.id ? null : post.id)}
                  className="flex items-center gap-1.5 text-[11px] transition-all duration-150"
                  style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Reageren {post.comments?.length > 0 && `(${post.comments.length})`}
                </button>
              </div>

              {/* Comments */}
              {post.comments?.length > 0 && (
                <div className="mt-3 space-y-2 pt-2" style={{ borderTop: `1px solid ${cardBorder}` }}>
                  {post.comments.map((c, idx) => (
                    <div key={idx} className="flex gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-black" style={{ background: 'rgba(201,169,97,0.7)' }}>
                        {c.userName?.charAt(0)}
                      </div>
                      <div>
                        <span className="text-[10px] font-medium mr-1.5" style={{ fontFamily: 'Inter, sans-serif', color: textPrimary }}>{c.userName}</span>
                        <span className="text-[11px]" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>{c.content}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Comment form */}
              {expandedComment === post.id && (
                <div className="mt-3 flex gap-2 pt-2" style={{ borderTop: `1px solid ${cardBorder}` }}>
                  <input
                    value={commentInput}
                    onChange={e => setCommentInput(e.target.value)}
                    placeholder="Schrijf een reactie..."
                    className="flex-1 px-3 py-2 text-xs outline-none"
                    style={{ background: inputBg, border: `1px solid ${cardBorder}`, color: textPrimary, fontFamily: 'Inter, sans-serif' }}
                    onKeyDown={e => { if (e.key === 'Enter') handleComment(post.id) }}
                  />
                  <button
                    onClick={() => handleComment(post.id)}
                    className="px-3 py-2 text-[10px] transition-all duration-150"
                    style={{ background: 'rgba(201,169,97,0.1)', border: '1px solid rgba(201,169,97,0.3)', color: '#c9a961', fontFamily: 'Inter, sans-serif' }}
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        {/* Badges section */}
        {user?.badges?.length > 0 && (
          <div>
            <p className="text-[10px] tracking-[0.35em] uppercase mb-3" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>Jouw Badges</p>
            <div className="grid grid-cols-2 gap-2">
              {user.badges.map(b => (
                <div key={b} className="p-3 flex items-center gap-2" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                  <span className="text-lg flex-shrink-0">🏆</span>
                  <div>
                    <p className="text-[11px] font-medium" style={{ fontFamily: 'Inter, sans-serif', color: BADGE_COLORS[b] || '#c9a961' }}>{b}</p>
                    <p className="text-[9px]" style={{ fontFamily: 'Inter, sans-serif', color: textSecondary }}>Verdiend</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowNewPost(true)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full flex items-center justify-center text-xl shadow-lg transition-all duration-200 z-30"
        style={{ background: 'linear-gradient(135deg, #c9a961 0%, #a88542 100%)', color: '#0a0a0a' }}
      >
        +
      </button>

      {/* New post modal */}
      {showNewPost && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-[430px] p-5 pb-8" style={{ background: isLight ? '#f5f0eb' : '#111009', borderTop: `1px solid ${cardBorder}` }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold" style={{ fontFamily: '"Playfair Display", serif', color: textPrimary }}>Nieuw Bericht</h3>
              <button onClick={() => setShowNewPost(false)} className="w-8 h-8 flex items-center justify-center" style={{ border: `1px solid ${cardBorder}`, color: textSecondary }}>✕</button>
            </div>
            <form onSubmit={handleNewPost}>
              <textarea
                value={newPostContent}
                onChange={e => setNewPostContent(e.target.value)}
                placeholder="Deel uw ervaring, recept of vraag met de community..."
                rows={5}
                className="w-full p-3 text-sm outline-none mb-4 resize-none"
                style={{ background: inputBg, border: `1px solid ${cardBorder}`, color: textPrimary, fontFamily: 'Inter, sans-serif' }}
              />
              <button
                type="submit"
                disabled={postLoading}
                className="w-full py-3.5 text-[11px] tracking-[0.35em] uppercase disabled:opacity-50 transition-all duration-200"
                style={{ background: 'linear-gradient(135deg, rgba(201,169,97,0.18) 0%, rgba(201,169,97,0.10) 100%)', border: '1px solid rgba(201,169,97,0.4)', color: '#c9a961', fontFamily: 'Inter, sans-serif' }}
              >
                {postLoading ? '◌ Plaatsen...' : '✦ Bericht Plaatsen'}
              </button>
            </form>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  )
}

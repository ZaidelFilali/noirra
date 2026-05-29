import { useState, useRef, useMemo, useEffect, Suspense, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, ContactShadows, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

// ─── Brand Config ────────────────────────────────────────────────────────────

const BASES = {
  'Dark 70%': {
    color: '#5C2810', emissive: '#1A0804',
    label: 'Intense & Bold',
    desc: 'Intense roasted cacao with smoky depth, dried fruit undertones, and a clean, lingering finish.',
    rarityBase: 5.2,
  },
  'Dark 85%': {
    color: '#2E1206', emissive: '#0C0402',
    label: 'Extreme Dark',
    desc: 'Pure cocoa intensity. Austere, complex, and uncompromising — crafted for the devoted.',
    rarityBase: 7.8,
  },
  'Milk': {
    color: '#9A6038', emissive: '#2A1008',
    label: 'Creamy Classic',
    desc: 'Velvety smooth with warm golden caramel, gentle sweetness, and a toasted hazelnut aftertaste.',
    rarityBase: 3.1,
  },
  'Ruby': {
    color: '#822038', emissive: '#200508',
    label: 'Berry Forward',
    desc: 'Naturally pink, tangy berry complexity with a delicate floral finish — unlike any other cacao.',
    rarityBase: 9.2,
  },
}

const TOPPINGS_CFG = {
  'Sea Salt': {
    color: '#F0EDE8', roughness: 0.55, metalness: 0.05,
    type: 'box', dims: [0.022, 0.007, 0.022], yOffset: 0.0035, count: 20, rarityBonus: 1.0,
  },
  'Hazelnuts': {
    color: '#7D5A25', roughness: 0.72, metalness: 0.0,
    type: 'sphere', dims: [0.055, 12, 12], yOffset: 0.055, count: 9, rarityBonus: 1.5,
  },
  'Freeze-dried Raspberry': {
    color: '#C21030', roughness: 0.85, metalness: 0.0,
    type: 'icosahedron', dims: [0.032, 0], yOffset: 0.032, count: 12, rarityBonus: 2.2,
  },
  'Gold Flakes': {
    color: '#C9A961', roughness: 0.06, metalness: 0.92,
    type: 'box', dims: [0.03, 0.003, 0.018], yOffset: 0.0015, count: 24, rarityBonus: 3.5,
  },
}

const FINISHES = {
  'Matte':    { roughness: 0.88, metalness: 0.0,  rarityBonus: 0.0 },
  'Glossy':   { roughness: 0.04, metalness: 0.08, rarityBonus: 0.5 },
  'Metallic': { roughness: 0.12, metalness: 0.85, rarityBonus: 1.2 },
}

// ─── Bar geometry constants ───────────────────────────────────────────────────

const BAR_W = 3.6, BAR_D = 2.2, BAR_H = 0.14
const COLS = 6, ROWS = 4, GAP = 0.055, SEG_H = 0.09
const SEG_W = (BAR_W - GAP * (COLS + 1)) / COLS
const SEG_D = (BAR_D - GAP * (ROWS + 1)) / ROWS
const BAR_TOP_Y = BAR_H / 2 + SEG_H

// ─── Pre-computed positions ───────────────────────────────────────────────────

const SEGMENT_POS = (() => {
  const list = []
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r < ROWS; r++)
      list.push([
        -BAR_W / 2 + GAP + SEG_W / 2 + c * (SEG_W + GAP),
        BAR_H / 2 + SEG_H / 2,
        -BAR_D / 2 + GAP + SEG_D / 2 + r * (SEG_D + GAP),
      ])
  return list
})()

function makeRng(seed) {
  let s = (seed * 1664525 + 1013904223) >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0x100000000 }
}

const TOPPING_POS = Object.fromEntries(
  Object.entries(TOPPINGS_CFG).map(([name, cfg]) => {
    const seed = name.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 7), 0)
    const rng = makeRng(seed)
    return [name, Array.from({ length: cfg.count }, () => [
      (rng() - 0.5) * BAR_W * 0.82,
      BAR_TOP_Y + cfg.yOffset,
      (rng() - 0.5) * BAR_D * 0.82,
    ])]
  })
)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcRarity(base, toppings, finish) {
  let s = BASES[base].rarityBase + FINISHES[finish].rarityBonus
  toppings.forEach(t => { s += TOPPINGS_CFG[t]?.rarityBonus ?? 0 })
  return Math.min(10, s).toFixed(1)
}

function makeBatch(base, toppings, finish) {
  const n = Math.abs(
    base.charCodeAt(0) * 31 +
    toppings.length * 17 +
    finish.charCodeAt(0) * 7 +
    Date.now() % 999
  )
  return n.toString(16).toUpperCase().slice(0, 6).padStart(6, '0')
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'zojuist'
  if (m < 60) return `${m}m geleden`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}u geleden`
  return `${Math.floor(h / 24)}d geleden`
}

// ─── 3D: Topping layer ───────────────────────────────────────────────────────

function ToppingLayer({ name, visible }) {
  const cfg = TOPPINGS_CFG[name]
  const positions = TOPPING_POS[name]

  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: cfg.color, roughness: cfg.roughness, metalness: cfg.metalness,
  }), [name])

  const geo = useMemo(() => {
    if (cfg.type === 'sphere')       return new THREE.SphereGeometry(...cfg.dims)
    if (cfg.type === 'icosahedron')  return new THREE.IcosahedronGeometry(...cfg.dims)
    return new THREE.BoxGeometry(...cfg.dims)
  }, [name])

  if (!visible) return null

  return (
    <group>
      {positions.map((pos, i) => (
        <mesh key={i} geometry={geo} material={mat} position={pos} castShadow />
      ))}
    </group>
  )
}

// ─── 3D: Chocolate bar ───────────────────────────────────────────────────────

function ChocolateBar({ base, toppings, finish, pulse }) {
  const groupRef = useRef()
  const scaleSpring = useRef(1)
  const pulseEnergy = useRef(0)

  useEffect(() => { pulseEnergy.current = 1 }, [pulse])

  useFrame((_, dt) => {
    if (!groupRef.current) return
    if (pulseEnergy.current > 0) {
      pulseEnergy.current = Math.max(0, pulseEnergy.current - dt * 3.5)
      scaleSpring.current = 1 + Math.sin(pulseEnergy.current * Math.PI) * 0.038
    } else {
      scaleSpring.current += (1 - scaleSpring.current) * dt * 12
    }
    groupRef.current.scale.setScalar(scaleSpring.current)
  })

  const bc = BASES[base]
  const fc = FINISHES[finish]

  const barMat = useMemo(() => new THREE.MeshStandardMaterial({
    color:             new THREE.Color(bc.color),
    emissive:          new THREE.Color(bc.emissive),
    emissiveIntensity: 0.07,
    roughness:         fc.roughness,
    metalness:         fc.metalness,
  }), [bc.color, bc.emissive, fc.roughness, fc.metalness])

  return (
    <group ref={groupRef}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[BAR_W, BAR_H, BAR_D]} />
        <primitive object={barMat} attach="material" />
      </mesh>
      {SEGMENT_POS.map(([x, y, z], i) => (
        <RoundedBox key={i} args={[SEG_W, SEG_H, SEG_D]} radius={0.024} smoothness={3}
          position={[x, y, z]} castShadow receiveShadow>
          <primitive object={barMat} attach="material" />
        </RoundedBox>
      ))}
      {Object.keys(TOPPINGS_CFG).map(name => (
        <ToppingLayer key={name} name={name} visible={toppings.includes(name)} />
      ))}
    </group>
  )
}

// ─── 3D: Scene ───────────────────────────────────────────────────────────────

function Scene({ base, toppings, finish, pulse }) {
  return (
    <>
      <color attach="background" args={['#0a0a0a']} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[4, 8, 4]} intensity={2.8} color="#fff8f0"
        castShadow shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5} shadow-camera-far={20}
        shadow-camera-left={-5} shadow-camera-right={5}
        shadow-camera-top={5}   shadow-camera-bottom={-5}
      />
      <directionalLight position={[-3.5, 1.5, -4]} intensity={0.9} color="#c9a961" />
      <pointLight position={[-4, -0.5, 3]} intensity={0.4} color="#6080c0" />
      <pointLight position={[0, 5, -4]} intensity={0.6} color="#ffffff" />
      <ChocolateBar base={base} toppings={toppings} finish={finish} pulse={pulse} />
      <ContactShadows position={[0, -0.82, 0]} opacity={0.6} scale={9} blur={3.2} far={3} />
      <OrbitControls autoRotate autoRotateSpeed={0.65} enableZoom={false} enablePan={false}
        maxPolarAngle={Math.PI * 0.56} minPolarAngle={Math.PI * 0.18}
        dampingFactor={0.06} enableDamping />
    </>
  )
}

// ─── UI: Configurator atoms ───────────────────────────────────────────────────

function BaseBtn({ id, active, onClick }) {
  const c = BASES[id]
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-2.5 text-xs tracking-wider border transition-all duration-300 text-left w-full ${
        active ? 'border-[#c9a961]/70 bg-[#c9a961]/8 text-[#e8d5a3]'
               : 'border-white/10 text-white/45 hover:border-white/22 hover:text-white/75 hover:bg-white/3'
      }`}>
      <span className="w-3 h-3 rounded-full border border-white/15 flex-shrink-0" style={{ background: c.color }} />
      <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500 }}>{id}</span>
    </button>
  )
}

function ToppingBtn({ id, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 text-xs tracking-wider border transition-all duration-300 w-full ${
        active ? 'border-[#c9a961]/55 bg-[#c9a961]/8 text-[#e8d5a3]'
               : 'border-white/10 text-white/40 hover:border-white/22 hover:text-white/70 hover:bg-white/3'
      }`}>
      <span className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${active ? 'bg-[#c9a961]' : 'bg-white/18'}`} />
      <span style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{id}</span>
    </button>
  )
}

function FinishBtn({ id, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-2.5 text-[11px] tracking-wider border transition-all duration-300 ${
        active ? 'border-[#c9a961]/70 bg-[#c9a961]/8 text-[#e8d5a3]'
               : 'border-white/10 text-white/45 hover:border-white/22 hover:text-white/75 hover:bg-white/3'
      }`}
      style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500 }}>
      {id}
    </button>
  )
}

function PanelSection({ num, title, children }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[10px] text-[#c9a961]/35" style={{ fontFamily: 'monospace' }}>
          {String(num).padStart(2, '0')}
        </span>
        <span className="text-[10px] tracking-[0.38em] text-white/35 uppercase"
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
          {title}
        </span>
        <div className="flex-1 h-px bg-white/5" />
      </div>
      {children}
    </div>
  )
}

// ─── UI: Cart drawer ─────────────────────────────────────────────────────────

function CartDrawer({ open, onClose, items, onRemove, onClear, onCheckout }) {
  const rarityColor = r =>
    r >= 9 ? '#f0c040' : r >= 7 ? '#c9a961' : r >= 5 ? '#a08050' : '#706050'

  const rarityLabel = r =>
    r >= 9 ? 'Legendary' : r >= 7 ? 'Rare' : r >= 5 ? 'Refined' : 'Classic'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-all duration-400"
        style={{
          background: open ? 'rgba(0,0,0,0.55)' : 'transparent',
          pointerEvents: open ? 'all' : 'none',
          backdropFilter: open ? 'blur(2px)' : 'none',
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full w-full max-w-sm flex flex-col z-50"
        style={{
          background: 'linear-gradient(160deg, #111008 0%, #0a0a0a 100%)',
          borderLeft: '1px solid rgba(201,169,97,0.12)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.38s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: open ? '-20px 0 60px rgba(0,0,0,0.6)' : 'none',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-white/[0.06]">
          <div>
            <h2 className="text-[11px] tracking-[0.45em] text-white/80 uppercase"
              style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500 }}>
              Jouw Collectie
            </h2>
            <p className="mt-1 text-[10px] text-white/25" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              {items.length === 0 ? 'Nog geen items' :
               items.length === 1 ? '1 item opgeslagen' :
               `${items.length} items opgeslagen`}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-white/30 hover:text-white/70 border border-white/10 hover:border-white/25 transition-all duration-200">
            ✕
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 gap-4">
              <span className="text-5xl opacity-10">✦</span>
              <p className="text-[11px] text-white/25 tracking-wider text-center leading-relaxed"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                Configureer je reep<br />en voeg hem toe aan je collectie
              </p>
            </div>
          )}
          {items.map(item => (
            <div key={item.id}
              className="border border-white/[0.07] p-4 relative group hover:border-[#c9a961]/25 transition-all duration-300"
              style={{ background: 'rgba(255,255,255,0.02)' }}>

              {/* Top row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-4 h-4 rounded-full border border-white/15 flex-shrink-0"
                    style={{ background: BASES[item.base]?.color ?? '#333' }} />
                  <span className="text-[12px] text-white/80 font-medium truncate"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    {item.base}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[13px] font-semibold"
                    style={{ fontFamily: '"Playfair Display", Georgia, serif', color: rarityColor(item.rarity) }}>
                    {item.rarity.toFixed(1)}
                  </span>
                  <button onClick={() => onRemove(item.id)}
                    className="w-5 h-5 flex items-center justify-center text-white/20 hover:text-red-400 transition-colors duration-200 opacity-0 group-hover:opacity-100">
                    ✕
                  </button>
                </div>
              </div>

              {/* Toppings */}
              {item.toppings.length > 0 && (
                <p className="mt-2 text-[10px] text-white/35 leading-relaxed"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  {item.toppings.join(' · ')}
                </p>
              )}

              {/* Footer row */}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 text-[9px] tracking-wider uppercase border"
                    style={{
                      fontFamily: 'Inter, system-ui, sans-serif',
                      color: 'rgba(201,169,97,0.6)',
                      borderColor: 'rgba(201,169,97,0.2)',
                    }}>
                    {item.finish}
                  </span>
                  <span className="text-[9px] tracking-wider"
                    style={{ color: rarityColor(item.rarity), opacity: 0.7 }}>
                    {rarityLabel(item.rarity)}
                  </span>
                </div>
                <span className="text-[9px] text-white/20" style={{ fontFamily: 'monospace' }}>
                  #{item.batch} · {timeAgo(item.created_at)}
                </span>
              </div>

              {/* Quantity row */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[9px] text-white/25 tracking-wider uppercase"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Aantal</span>
                <span className="text-[11px] text-white/50 w-6 text-center"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  {item.quantity}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 pb-6 pt-4 border-t border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between text-[10px] text-white/30"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              <span>{items.length} {items.length === 1 ? 'reep' : 'repen'}</span>
              <button onClick={onClear}
                className="hover:text-red-400/70 transition-colors duration-200 tracking-wider uppercase">
                Alles wissen
              </button>
            </div>

            <button onClick={onCheckout}
              className="w-full py-4 border border-[#c9a961]/38 text-[#c9a961] text-[11px] tracking-[0.42em] uppercase hover:bg-[#c9a961]/10 hover:border-[#c9a961]/80 hover:text-[#e8d5a3] transition-all duration-300 active:scale-[0.98]"
              style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500 }}>
              <span className="inline-flex items-center gap-3">
                <span className="opacity-50">✦</span>
                Afrekenen
                <span className="opacity-50">→</span>
              </span>
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [base,       setBase]       = useState('Dark 70%')
  const [toppings,   setToppings]   = useState([])
  const [finish,     setFinish]     = useState('Glossy')
  const [pulse,      setPulse]      = useState(0)
  const [toast,      setToast]      = useState(null)  // { msg, type }
  const [cartItems,  setCartItems]  = useState([])
  const [cartOpen,   setCartOpen]   = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const toastTimer = useRef(null)

  // ── API helpers ────────────────────────────────────────────────────────────

  const fetchCart = useCallback(async () => {
    try {
      const res = await fetch('/api/cart')
      if (res.ok) setCartItems(await res.json())
    } catch { /* api not ready yet */ }
  }, [])

  useEffect(() => { fetchCart() }, [fetchCart])

  // ── Config interactions ────────────────────────────────────────────────────

  const trigger = fn => (...args) => { fn(...args); setPulse(p => p + 1) }
  const handleBase    = trigger(b => setBase(b))
  const handleFinish  = trigger(f => setFinish(f))
  const handleTopping = trigger(t =>
    setToppings(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  )

  // ── Cart actions ───────────────────────────────────────────────────────────

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2800)
  }

  const handleAdd = async () => {
    setAddLoading(true)
    const rarity = parseFloat(calcRarity(base, toppings, finish))
    const batch  = makeBatch(base, toppings, finish)
    try {
      const res = await fetch('/api/cart', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ base, toppings, finish, rarity, batch }),
      })
      if (!res.ok) throw new Error(await res.text())
      await fetchCart()
      setCartOpen(true)
      showToast('Toegevoegd aan je collectie')
    } catch {
      showToast('Kon niet opslaan — is de API actief?', 'error')
    } finally {
      setAddLoading(false)
    }
  }

  const handleRemove = async id => {
    await fetch(`/api/cart/${id}`, { method: 'DELETE' })
    await fetchCart()
  }

  const handleClear = async () => {
    await fetch('/api/cart', { method: 'DELETE' })
    setCartItems([])
    showToast('Collectie gewist')
  }

  const handleCheckout = () => {
    showToast('Bedankt voor je bestelling! ✦')
    setCartOpen(false)
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const rarity    = calcRarity(base, toppings, finish)
  const rarityPct = (parseFloat(rarity) / 10) * 100
  const rarityGrade =
    rarity >= 9 ? 'Legendary' : rarity >= 7 ? 'Rare' : rarity >= 5 ? 'Refined' : 'Classic'
  const rarityColor =
    rarity >= 9 ? '#f0c040' : rarity >= 7 ? '#c9a961' : rarity >= 5 ? '#a08050' : '#706050'
  const summary = [base, ...toppings, `${finish} Finish`].join(' • ')

  return (
    <div className="h-screen bg-[#0a0a0a] text-white flex flex-col overflow-hidden"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');`}</style>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 pt-7 pb-5 flex flex-col items-center border-b border-white/[0.06] relative">
        <h1 className="text-[clamp(2.8rem,8vw,5rem)] tracking-[0.3em] text-white leading-none"
          style={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700 }}>
          NOIRRA
        </h1>
        <p className="mt-2 text-[10px] tracking-[0.45em] text-[#c9a961]/70 uppercase"
          style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 300 }}>
          Crafted by Code.&nbsp;&nbsp;Designed by You.
        </p>

        {/* Cart button */}
        <button
          onClick={() => setCartOpen(true)}
          className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2.5 text-white/35 hover:text-[#c9a961]/80 transition-all duration-300 group"
        >
          <span className="text-[10px] tracking-[0.35em] uppercase hidden sm:block group-hover:text-[#c9a961]/80 transition-colors"
            style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 400 }}>
            Collectie
          </span>
          {/* Cart icon */}
          <span className="relative flex items-center justify-center w-8 h-8 border border-white/10 group-hover:border-[#c9a961]/40 transition-all duration-300">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M1 1h2l1.5 7h7l1-5H4.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="6" cy="12" r="0.7" fill="currentColor" />
              <circle cx="10" cy="12" r="0.7" fill="currentColor" />
            </svg>
            {cartItems.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#c9a961] text-black text-[9px] font-bold flex items-center justify-center leading-none"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                {cartItems.length > 9 ? '9+' : cartItems.length}
              </span>
            )}
          </span>
        </button>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="flex flex-col lg:flex-row flex-1 min-h-0">

        {/* Left: Product info */}
        <aside className="lg:w-72 flex-shrink-0 p-7 flex flex-col gap-7 border-r border-white/[0.06] overflow-y-auto">
          <div>
            <span className="text-[9px] tracking-[0.4em] text-[#c9a961]/55 uppercase">Huidige Selectie</span>
            <p className="mt-2.5 text-[12px] text-white/55 leading-relaxed" style={{ fontWeight: 300 }}>
              {summary}
            </p>
          </div>
          <div className="border-t border-white/[0.06] pt-6">
            <span className="text-[9px] tracking-[0.4em] text-white/25 uppercase">Smaakprofiel</span>
            <p className="mt-2.5 text-[12px] text-white/45 leading-relaxed"
              style={{ fontFamily: '"Playfair Display", Georgia, serif', fontStyle: 'italic', fontWeight: 400 }}>
              {BASES[base].desc}
            </p>
          </div>

          {/* Innovation Index */}
          <div className="border border-[#c9a961]/18 p-5 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(201,169,97,0.04) 0%, rgba(10,10,10,0) 100%)' }}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at top right, rgba(201,169,97,0.06) 0%, transparent 70%)' }} />
            <div className="flex items-start justify-between mb-1 relative">
              <span className="text-[9px] tracking-[0.35em] text-[#c9a961]/55 uppercase">Rarity Score</span>
              <span className="text-[9px] tracking-[0.2em] text-white/20 uppercase">{rarityGrade}</span>
            </div>
            <div className="flex items-end gap-1.5 mt-2 relative">
              <span className="text-5xl leading-none transition-all duration-500"
                style={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 600, color: rarityColor }}>
                {rarity}
              </span>
              <span className="text-white/25 text-sm mb-1">/10</span>
            </div>
            <div className="mt-4 h-px bg-white/8 overflow-hidden relative">
              <div className="h-full transition-all duration-700"
                style={{ width: `${rarityPct}%`, background: `linear-gradient(to right, ${rarityColor}55, ${rarityColor})` }} />
            </div>
            <p className="mt-2 text-[10px] text-white/20 relative" style={{ fontWeight: 300 }}>Innovation Index™</p>
          </div>

          <div className="hidden lg:block mt-auto">
            <p className="text-[9px] tracking-[0.3em] text-white/18 uppercase">↻ Drag to rotate</p>
          </div>
        </aside>

        {/* Center: 3D Canvas */}
        <div className="flex-1 relative min-h-[52vw] lg:min-h-0">
          <Canvas
            camera={{ position: [0, 2.2, 5.5], fov: 38 }}
            shadows
            gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
            style={{ width: '100%', height: '100%' }}
          >
            <Suspense fallback={null}>
              <Scene base={base} toppings={toppings} finish={finish} pulse={pulse} />
            </Suspense>
          </Canvas>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(10,10,10,0.55) 100%)' }} />
        </div>

        {/* Right: Configurator */}
        <aside className="lg:w-[19rem] flex-shrink-0 p-7 flex flex-col gap-8 border-l border-white/[0.06] overflow-y-auto">

          <PanelSection num={1} title="Base Type">
            <div className="grid grid-cols-2 gap-1.5">
              {Object.keys(BASES).map(b => (
                <BaseBtn key={b} id={b} active={base === b} onClick={() => handleBase(b)} />
              ))}
            </div>
          </PanelSection>

          <PanelSection num={2} title="Toppings">
            <div className="flex flex-col gap-1.5">
              {Object.keys(TOPPINGS_CFG).map(t => (
                <ToppingBtn key={t} id={t} active={toppings.includes(t)} onClick={() => handleTopping(t)} />
              ))}
            </div>
          </PanelSection>

          <PanelSection num={3} title="Finish">
            <div className="grid grid-cols-3 gap-1.5">
              {Object.keys(FINISHES).map(f => (
                <FinishBtn key={f} id={f} active={finish === f} onClick={() => handleFinish(f)} />
              ))}
            </div>
          </PanelSection>

          <button onClick={handleAdd} disabled={addLoading}
            className="mt-auto py-4 px-6 border border-[#c9a961]/38 text-[#c9a961] text-[11px] tracking-[0.42em] uppercase transition-all duration-350 hover:border-[#c9a961]/80 hover:bg-[#c9a961]/10 hover:text-[#e8d5a3] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
            style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500 }}>
            <span className="inline-flex items-center gap-3">
              <span className={`text-[#c9a961]/40 group-hover:text-[#c9a961]/70 transition-colors duration-350 ${addLoading ? 'animate-spin' : ''}`}>
                {addLoading ? '◌' : '✦'}
              </span>
              {addLoading ? 'Opslaan...' : 'Toevoegen aan Collectie'}
            </span>
          </button>

          <div className="text-[9px] text-white/18 tracking-wider leading-relaxed" style={{ fontWeight: 300 }}>
            100g · Single Origin · Handcrafted<br />
            Batch #{Math.abs(base.charCodeAt(0) * 31 + toppings.length * 17 + finish.charCodeAt(0)).toString(16).toUpperCase().slice(0, 6).padStart(6, '0')}
          </div>
        </aside>
      </main>

      {/* ── Cart drawer ──────────────────────────────────────────────────── */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        onRemove={handleRemove}
        onClear={handleClear}
        onCheckout={handleCheckout}
      />

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        style={{
          transition: 'opacity 0.45s ease, transform 0.45s ease',
          opacity: toast ? 1 : 0,
          transform: toast ? 'translate(-50%, 0)' : 'translate(-50%, 12px)',
        }}>
        <div className="flex items-center gap-3 px-6 py-3.5 border whitespace-nowrap"
          style={{
            background: 'rgba(18, 14, 8, 0.95)',
            backdropFilter: 'blur(12px)',
            borderColor: toast?.type === 'error' ? 'rgba(220,50,50,0.35)' : 'rgba(201,169,97,0.3)',
            color: toast?.type === 'error' ? '#f08080' : '#e8d5a3',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 400,
            fontSize: '11px',
            letterSpacing: '0.2em',
          }}>
          <span style={{ opacity: 0.6 }}>{toast?.type === 'error' ? '⚠' : '✦'}</span>
          {toast?.msg}
          <span style={{ opacity: 0.6 }}>{toast?.type === 'error' ? '' : '✦'}</span>
        </div>
      </div>
    </div>
  )
}

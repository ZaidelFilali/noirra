import { useState, useRef, useMemo, useEffect, Suspense, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, ContactShadows, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// ─── Brand Config ─────────────────────────────────────────────────────────────

const BASES = {
  'Dark 70%': {
    color: '#5C2810', emissive: '#1A0804',
    label: 'Intense & Bold',
    desc: 'Intense geroosterde cacao met rokerige diepte, gedroogd fruit ondertonen en een lange afdronk.',
    rarityBase: 5.2,
  },
  'Dark 85%': {
    color: '#2E1206', emissive: '#0C0402',
    label: 'Extreme Dark',
    desc: 'Pure cacaointensiteit. Auster, complex en oncompromiserend — voor de toegewijde kenner.',
    rarityBase: 7.8,
  },
  'Milk': {
    color: '#9A6038', emissive: '#2A1008',
    label: 'Creamy Classic',
    desc: 'Fluweelzacht met warme gouden karamel, zachte zoetheid en een geroosterde hazelnoot afdronk.',
    rarityBase: 3.1,
  },
  'Ruby': {
    color: '#822038', emissive: '#200508',
    label: 'Berry Forward',
    desc: 'Natuurlijk roze, pittige bessen-complexiteit met een delicate bloemige afdronk — anders dan elk ander.',
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

const BAR_W = 3.6, BAR_D = 2.2, BAR_H = 0.14
const COLS = 6, ROWS = 4, GAP = 0.055, SEG_H = 0.09
const SEG_W = (BAR_W - GAP * (COLS + 1)) / COLS
const SEG_D = (BAR_D - GAP * (ROWS + 1)) / ROWS
const BAR_TOP_Y = BAR_H / 2 + SEG_H

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

// ─── 3D Components ────────────────────────────────────────────────────────────

function ToppingLayer({ name, visible }) {
  const cfg = TOPPINGS_CFG[name]
  const positions = TOPPING_POS[name]
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: cfg.color, roughness: cfg.roughness, metalness: cfg.metalness,
  }), [name])
  const geo = useMemo(() => {
    if (cfg.type === 'sphere') return new THREE.SphereGeometry(...cfg.dims)
    if (cfg.type === 'icosahedron') return new THREE.IcosahedronGeometry(...cfg.dims)
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
    color: new THREE.Color(bc.color),
    emissive: new THREE.Color(bc.emissive),
    emissiveIntensity: 0.07,
    roughness: fc.roughness,
    metalness: fc.metalness,
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
        shadow-camera-top={5} shadow-camera-bottom={-5}
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Configurator() {
  const navigate = useNavigate()
  const { authHeaders } = useAuth()
  const [base, setBase] = useState('Dark 70%')
  const [toppings, setToppings] = useState([])
  const [finish, setFinish] = useState('Glossy')
  const [pulse, setPulse] = useState(0)
  const [toast, setToast] = useState(null)
  const [addLoading, setAddLoading] = useState(false)
  const toastTimer = useRef(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2800)
  }

  const trigger = fn => (...args) => { fn(...args); setPulse(p => p + 1) }
  const handleBase = trigger(b => setBase(b))
  const handleFinish = trigger(f => setFinish(f))
  const handleTopping = trigger(t =>
    setToppings(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  )

  const handleAdd = async () => {
    setAddLoading(true)
    const rarity = parseFloat(calcRarity(base, toppings, finish))
    const batch = makeBatch(base, toppings, finish)
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base, toppings, finish, rarity, batch }),
      })
      if (!res.ok) throw new Error()
      showToast('Toegevoegd aan je collectie ✦')
    } catch {
      showToast('Kon niet opslaan — is de API actief?', 'error')
    } finally {
      setAddLoading(false)
    }
  }

  const rarity = calcRarity(base, toppings, finish)
  const rarityPct = (parseFloat(rarity) / 10) * 100
  const rarityGrade = rarity >= 9 ? 'Legendary' : rarity >= 7 ? 'Rare' : rarity >= 5 ? 'Refined' : 'Classic'
  const rarityColor = rarity >= 9 ? '#f0c040' : rarity >= 7 ? '#c9a961' : rarity >= 5 ? '#a08050' : '#706050'

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');`}</style>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('/dashboard')} className="w-9 h-9 flex items-center justify-center" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg tracking-[0.3em]" style={{ fontFamily: '"Playfair Display", serif', color: 'white' }}>
          CONFIGURATOR
        </h1>
        <div className="w-9" />
      </div>

      {/* 3D Canvas */}
      <div className="relative" style={{ height: '45vw', maxHeight: 220, minHeight: 160 }}>
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
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(10,10,10,0.55) 100%)' }} />
        <p className="absolute bottom-2 right-3 text-[9px] tracking-widest" style={{ color: 'rgba(255,255,255,0.18)', fontFamily: 'Inter, sans-serif' }}>↻ Drag</p>
      </div>

      {/* Rarity indicator */}
      <div className="mx-4 my-3 px-4 py-3" style={{ background: 'linear-gradient(135deg, rgba(201,169,97,0.06) 0%, transparent 100%)', border: '1px solid rgba(201,169,97,0.18)' }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] tracking-[0.3em] uppercase" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(201,169,97,0.6)' }}>
            Innovation Index™ · {rarityGrade}
          </span>
          <span className="text-xl font-bold" style={{ fontFamily: '"Playfair Display", serif', color: rarityColor }}>
            {rarity}
            <span className="text-xs font-normal" style={{ color: 'rgba(255,255,255,0.25)' }}>/10</span>
          </span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${rarityPct}%`, background: `linear-gradient(to right, ${rarityColor}55, ${rarityColor})` }}
          />
        </div>
      </div>

      {/* Config panel - scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5">

        {/* Base */}
        <div>
          <p className="text-[9px] tracking-[0.38em] uppercase mb-2.5" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter, sans-serif' }}>
            01 · Base Type
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.keys(BASES).map(b => (
              <button
                key={b}
                onClick={() => handleBase(b)}
                className="flex items-center gap-2.5 px-3 py-2.5 text-xs transition-all duration-200 text-left"
                style={{
                  border: `1px solid ${base === b ? 'rgba(201,169,97,0.6)' : 'rgba(255,255,255,0.08)'}`,
                  background: base === b ? 'rgba(201,169,97,0.07)' : 'transparent',
                  color: base === b ? '#e8d5a3' : 'rgba(255,255,255,0.4)',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                }}
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: BASES[b].color }} />
                {b}
              </button>
            ))}
          </div>
          {base && (
            <p className="mt-2 text-[10px] leading-relaxed px-1" style={{ fontFamily: '"Playfair Display", serif', fontStyle: 'italic', color: 'rgba(255,255,255,0.3)' }}>
              {BASES[base].desc}
            </p>
          )}
        </div>

        {/* Toppings */}
        <div>
          <p className="text-[9px] tracking-[0.38em] uppercase mb-2.5" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter, sans-serif' }}>
            02 · Toppings
          </p>
          <div className="space-y-1.5">
            {Object.keys(TOPPINGS_CFG).map(t => (
              <button
                key={t}
                onClick={() => handleTopping(t)}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-xs transition-all duration-200"
                style={{
                  border: `1px solid ${toppings.includes(t) ? 'rgba(201,169,97,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  background: toppings.includes(t) ? 'rgba(201,169,97,0.07)' : 'transparent',
                  color: toppings.includes(t) ? '#e8d5a3' : 'rgba(255,255,255,0.38)',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-200" style={{ background: toppings.includes(t) ? '#c9a961' : 'rgba(255,255,255,0.15)' }} />
                {t}
                {toppings.includes(t) && <span className="ml-auto text-[10px]" style={{ color: 'rgba(201,169,97,0.6)' }}>+{TOPPINGS_CFG[t].rarityBonus}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Finish */}
        <div>
          <p className="text-[9px] tracking-[0.38em] uppercase mb-2.5" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter, sans-serif' }}>
            03 · Finish
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {Object.keys(FINISHES).map(f => (
              <button
                key={f}
                onClick={() => handleFinish(f)}
                className="py-2.5 text-[10px] font-medium tracking-wider transition-all duration-200"
                style={{
                  border: `1px solid ${finish === f ? 'rgba(201,169,97,0.6)' : 'rgba(255,255,255,0.08)'}`,
                  background: finish === f ? 'rgba(201,169,97,0.07)' : 'transparent',
                  color: finish === f ? '#e8d5a3' : 'rgba(255,255,255,0.4)',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Add button */}
        <button
          onClick={handleAdd}
          disabled={addLoading}
          className="w-full py-4 text-[11px] tracking-[0.4em] uppercase font-medium transition-all duration-300 disabled:opacity-50"
          style={{
            border: '1px solid rgba(201,169,97,0.4)',
            background: 'linear-gradient(135deg, rgba(201,169,97,0.12) 0%, rgba(201,169,97,0.06) 100%)',
            color: '#c9a961',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <span className="inline-flex items-center gap-3">
            <span className={`opacity-50 ${addLoading ? 'animate-spin' : ''}`}>{addLoading ? '◌' : '✦'}</span>
            {addLoading ? 'Opslaan...' : 'Toevoegen aan Collectie'}
          </span>
        </button>

        <p className="text-center text-[9px]" style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.15)' }}>
          100g · Single Origin · Batch #{makeBatch(base, toppings, finish)}
        </p>
      </div>

      {/* Toast */}
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
    </div>
  )
}

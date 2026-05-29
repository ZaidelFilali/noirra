import express from 'express'
import cors    from 'cors'
import { readDb, writeDb } from './db.js'

const app  = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

// ─── GET /api/cart ─────────────────────────────────────────────────────────
app.get('/api/cart', (_req, res) => {
  const { items } = readDb()
  res.json([...items].reverse())          // newest first
})

// ─── GET /api/cart/count ───────────────────────────────────────────────────
app.get('/api/cart/count', (_req, res) => {
  const { items } = readDb()
  res.json({ count: items.length })
})

// ─── POST /api/cart ────────────────────────────────────────────────────────
app.post('/api/cart', (req, res) => {
  const { base, toppings, finish, rarity, batch } = req.body
  if (!base || !finish || !batch)
    return res.status(400).json({ error: 'base, finish and batch are required' })

  const db   = readDb()
  const item = {
    id:         db.nextId++,
    base,
    toppings:   Array.isArray(toppings) ? toppings : [],
    finish,
    rarity:     Number(rarity) || 0,
    batch,
    quantity:   1,
    created_at: new Date().toISOString(),
  }
  db.items.push(item)
  writeDb(db)
  res.status(201).json(item)
})

// ─── PATCH /api/cart/:id/quantity ──────────────────────────────────────────
app.patch('/api/cart/:id/quantity', (req, res) => {
  const id  = Number(req.params.id)
  const qty = Number(req.body.quantity)
  if (!qty || qty < 1) return res.status(400).json({ error: 'quantity must be ≥ 1' })

  const db   = readDb()
  const item = db.items.find(i => i.id === id)
  if (!item) return res.status(404).json({ error: 'not found' })

  item.quantity = qty
  writeDb(db)
  res.json(item)
})

// ─── DELETE /api/cart/:id ──────────────────────────────────────────────────
app.delete('/api/cart/:id', (req, res) => {
  const id = Number(req.params.id)
  const db = readDb()
  const before = db.items.length
  db.items = db.items.filter(i => i.id !== id)
  if (db.items.length === before) return res.status(404).json({ error: 'not found' })
  writeDb(db)
  res.json({ success: true })
})

// ─── DELETE /api/cart ──────────────────────────────────────────────────────
app.delete('/api/cart', (_req, res) => {
  const db = readDb()
  const deleted = db.items.length
  db.items = []
  writeDb(db)
  res.json({ success: true, deleted })
})

// ─── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, () =>
  console.log(`✓ Noirra API  →  http://localhost:${PORT}`)
)

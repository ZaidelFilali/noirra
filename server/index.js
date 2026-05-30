import express from 'express'
import cors from 'cors'
import { readDb, writeDb, readCart, writeCart } from './db.js'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function getUserFromToken(req) {
  const auth = req.headers['authorization'] || ''
  const token = auth.replace('Bearer ', '').trim()
  if (!token.startsWith('demo-token-')) return null
  const userId = parseInt(token.replace('demo-token-', ''), 10)
  const db = readDb()
  return db.users.find(u => u.id === userId) || null
}

function requireAuth(req, res, next) {
  const user = getUserFromToken(req)
  if (!user) return res.status(401).json({ error: 'Niet geauthenticeerd' })
  req.user = user
  next()
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email en wachtwoord zijn verplicht' })
  const db = readDb()
  const user = db.users.find(u => u.email === email && u.password === password)
  if (!user) return res.status(401).json({ error: 'Onjuist e-mailadres of wachtwoord' })
  const { password: _pw, ...safeUser } = user
  res.json({ token: `demo-token-${user.id}`, user: safeUser, requires2FA: user.twoFAEnabled })
})

app.post('/api/auth/verify-2fa', (req, res) => {
  const { code } = req.body
  if (!code || String(code).length !== 6) {
    return res.status(400).json({ error: 'Voer een 6-cijferige code in' })
  }
  res.json({ success: true })
})

app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body
  if (!email || !password || !name) return res.status(400).json({ error: 'Naam, email en wachtwoord zijn verplicht' })
  const db = readDb()
  if (db.users.find(u => u.email === email)) {
    return res.status(409).json({ error: 'Dit e-mailadres is al in gebruik' })
  }
  const newUser = {
    id: db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1,
    email, password, name,
    role: 'b2c',
    language: 'nl',
    theme: 'dark',
    points: 0,
    badges: [],
    loyaltyLevel: 'Bronze',
    notificationPrefs: { productupdates: true, promoties: true, duurzaamheid: true, community: true, evenementen: true },
    twoFAEnabled: false
  }
  db.users.push(newUser)
  writeDb(db)
  const { password: _pw, ...safeUser } = newUser
  res.status(201).json({ token: `demo-token-${newUser.id}`, user: safeUser })
})

// ─── Users ────────────────────────────────────────────────────────────────────

app.get('/api/user/profile', requireAuth, (req, res) => {
  const { password: _pw, ...safeUser } = req.user
  res.json(safeUser)
})

app.patch('/api/user/profile', requireAuth, (req, res) => {
  const db = readDb()
  const idx = db.users.findIndex(u => u.id === req.user.id)
  if (idx === -1) return res.status(404).json({ error: 'Gebruiker niet gevonden' })
  const allowed = ['name', 'email', 'language', 'theme', 'notificationPrefs', 'twoFAEnabled']
  allowed.forEach(field => {
    if (req.body[field] !== undefined) db.users[idx][field] = req.body[field]
  })
  writeDb(db)
  const { password: _pw, ...safeUser } = db.users[idx]
  res.json(safeUser)
})

// ─── Products ─────────────────────────────────────────────────────────────────

app.get('/api/products', (_req, res) => {
  const db = readDb()
  res.json(db.products)
})

app.get('/api/products/:id', (req, res) => {
  const db = readDb()
  const product = db.products.find(p => p.id === parseInt(req.params.id))
  if (!product) return res.status(404).json({ error: 'Product niet gevonden' })
  res.json(product)
})

app.get('/api/user/products', requireAuth, (req, res) => {
  const db = readDb()
  const registered = db.registeredProducts.filter(rp => rp.userId === req.user.id)
  const result = registered.map(rp => {
    const product = db.products.find(p => p.id === rp.productId)
    return { ...rp, product }
  })
  res.json(result)
})

app.post('/api/user/products', requireAuth, (req, res) => {
  const { batchOrCode } = req.body
  if (!batchOrCode) return res.status(400).json({ error: 'Batch nummer of productcode is verplicht' })
  const db = readDb()
  const product = db.products.find(
    p => p.batch === batchOrCode || p.code === batchOrCode
  )
  if (!product) return res.status(404).json({ error: 'Product niet gevonden met dit batch nummer of code' })
  const alreadyRegistered = db.registeredProducts.find(
    rp => rp.userId === req.user.id && rp.productId === product.id
  )
  if (alreadyRegistered) return res.status(409).json({ error: 'Dit product is al geregistreerd' })
  const newReg = {
    id: db.registeredProducts.length > 0 ? Math.max(...db.registeredProducts.map(r => r.id)) + 1 : 1,
    userId: req.user.id,
    productId: product.id,
    registeredAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + product.expiryMonths * 30 * 24 * 60 * 60 * 1000).toISOString(),
    purchaseDate: new Date().toISOString()
  }
  db.registeredProducts.push(newReg)
  writeDb(db)
  res.status(201).json({ ...newReg, product })
})

// ─── Notifications ────────────────────────────────────────────────────────────

app.get('/api/notifications', requireAuth, (req, res) => {
  const db = readDb()
  const notifs = db.notifications.filter(n => n.userId === req.user.id)
  res.json(notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
})

app.patch('/api/notifications/:id/read', requireAuth, (req, res) => {
  const db = readDb()
  const notif = db.notifications.find(n => n.id === parseInt(req.params.id) && n.userId === req.user.id)
  if (!notif) return res.status(404).json({ error: 'Notificatie niet gevonden' })
  notif.read = true
  writeDb(db)
  res.json(notif)
})

app.patch('/api/notifications/read-all', requireAuth, (req, res) => {
  const db = readDb()
  db.notifications.forEach(n => { if (n.userId === req.user.id) n.read = true })
  writeDb(db)
  res.json({ success: true })
})

// ─── Complaints ───────────────────────────────────────────────────────────────

app.get('/api/complaints', requireAuth, (req, res) => {
  const db = readDb()
  const complaints = db.complaints.filter(c => c.userId === req.user.id)
  res.json(complaints.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
})

app.get('/api/complaints/:id', requireAuth, (req, res) => {
  const db = readDb()
  const complaint = db.complaints.find(c => c.id === parseInt(req.params.id) && c.userId === req.user.id)
  if (!complaint) return res.status(404).json({ error: 'Klacht niet gevonden' })
  const product = db.products.find(p => p.id === complaint.productId)
  res.json({ ...complaint, product })
})

app.post('/api/complaints', requireAuth, (req, res) => {
  const { productId, type, description } = req.body
  if (!productId || !type || !description) {
    return res.status(400).json({ error: 'Product, type en beschrijving zijn verplicht' })
  }
  const db = readDb()
  const product = db.products.find(p => p.id === parseInt(productId))
  if (!product) return res.status(404).json({ error: 'Product niet gevonden' })
  const newComplaint = {
    id: db.complaints.length > 0 ? Math.max(...db.complaints.map(c => c.id)) + 1 : 1,
    userId: req.user.id,
    productId: parseInt(productId),
    type,
    description,
    status: 'open',
    timeline: [
      {
        status: 'open',
        message: 'Klacht ingediend',
        timestamp: new Date().toISOString()
      }
    ],
    createdAt: new Date().toISOString()
  }
  db.complaints.push(newComplaint)
  writeDb(db)
  res.status(201).json({ ...newComplaint, product })
})

app.patch('/api/complaints/:id/status', requireAuth, (req, res) => {
  const { status, message } = req.body
  const validStatuses = ['open', 'in_behandeling', 'opgelost']
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Ongeldige status' })
  }
  const db = readDb()
  const complaint = db.complaints.find(c => c.id === parseInt(req.params.id))
  if (!complaint) return res.status(404).json({ error: 'Klacht niet gevonden' })
  complaint.status = status
  complaint.timeline.push({
    status,
    message: message || `Status gewijzigd naar ${status}`,
    timestamp: new Date().toISOString()
  })
  writeDb(db)
  res.json(complaint)
})

// ─── Orders ───────────────────────────────────────────────────────────────────

app.get('/api/orders', requireAuth, (req, res) => {
  const db = readDb()
  const orders = db.orders.filter(o => o.userId === req.user.id)
  res.json(orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
})

app.post('/api/orders', requireAuth, (req, res) => {
  const { items } = req.body
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Minimaal één product is verplicht' })
  }
  const db = readDb()
  let totalPrice = 0
  const orderItems = items.map(item => {
    const product = db.products.find(p => p.id === parseInt(item.productId))
    if (!product) throw new Error(`Product ${item.productId} niet gevonden`)
    const price = product.price
    totalPrice += price * item.quantity
    return { productId: product.id, quantity: item.quantity, price }
  })
  const deliveryDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
  const newOrder = {
    id: db.orders.length > 0 ? Math.max(...db.orders.map(o => o.id)) + 1 : 1,
    userId: req.user.id,
    items: orderItems,
    status: 'Verwerkt',
    totalPrice: Math.round(totalPrice * 100) / 100,
    createdAt: new Date().toISOString(),
    deliveryDate
  }
  db.orders.push(newOrder)
  writeDb(db)
  res.status(201).json(newOrder)
})

// ─── Community ────────────────────────────────────────────────────────────────

app.get('/api/community/posts', (_req, res) => {
  const db = readDb()
  res.json(db.communityPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
})

app.post('/api/community/posts', requireAuth, (req, res) => {
  const { content } = req.body
  if (!content || !content.trim()) return res.status(400).json({ error: 'Inhoud is verplicht' })
  const db = readDb()
  const user = db.users.find(u => u.id === req.user.id)
  const newPost = {
    id: db.communityPosts.length > 0 ? Math.max(...db.communityPosts.map(p => p.id)) + 1 : 1,
    userId: req.user.id,
    userName: user.name,
    content: content.trim(),
    likes: 0,
    likedBy: [],
    comments: [],
    badge: user.badges[0] || null,
    createdAt: new Date().toISOString()
  }
  db.communityPosts.push(newPost)
  writeDb(db)
  res.status(201).json(newPost)
})

app.post('/api/community/posts/:id/like', requireAuth, (req, res) => {
  const db = readDb()
  const post = db.communityPosts.find(p => p.id === parseInt(req.params.id))
  if (!post) return res.status(404).json({ error: 'Bericht niet gevonden' })
  if (!post.likedBy) post.likedBy = []
  const likedIdx = post.likedBy.indexOf(req.user.id)
  if (likedIdx > -1) {
    post.likedBy.splice(likedIdx, 1)
    post.likes = Math.max(0, post.likes - 1)
  } else {
    post.likedBy.push(req.user.id)
    post.likes += 1
  }
  writeDb(db)
  res.json({ likes: post.likes, liked: likedIdx === -1 })
})

app.post('/api/community/posts/:id/comment', requireAuth, (req, res) => {
  const { content } = req.body
  if (!content) return res.status(400).json({ error: 'Reactie is verplicht' })
  const db = readDb()
  const post = db.communityPosts.find(p => p.id === parseInt(req.params.id))
  if (!post) return res.status(404).json({ error: 'Bericht niet gevonden' })
  const user = db.users.find(u => u.id === req.user.id)
  post.comments.push({
    userId: req.user.id,
    userName: user.name,
    content,
    createdAt: new Date().toISOString()
  })
  writeDb(db)
  res.json(post)
})

// ─── Events ───────────────────────────────────────────────────────────────────

app.get('/api/events', (_req, res) => {
  const db = readDb()
  res.json(db.events.sort((a, b) => new Date(a.date) - new Date(b.date)))
})

app.post('/api/events/:id/register', requireAuth, (req, res) => {
  const db = readDb()
  const event = db.events.find(e => e.id === parseInt(req.params.id))
  if (!event) return res.status(404).json({ error: 'Evenement niet gevonden' })
  if (event.spotsLeft <= 0) return res.status(400).json({ error: 'Geen plaatsen meer beschikbaar' })
  if (!event.registered) event.registered = []
  if (event.registered.includes(req.user.id)) {
    return res.status(409).json({ error: 'U bent al ingeschreven voor dit evenement' })
  }
  event.registered.push(req.user.id)
  event.spotsLeft = Math.max(0, event.spotsLeft - 1)
  writeDb(db)
  res.json({ success: true, event })
})

// ─── Stores ───────────────────────────────────────────────────────────────────

app.get('/api/stores', (_req, res) => {
  const db = readDb()
  res.json(db.stores)
})

// ─── Chat ─────────────────────────────────────────────────────────────────────

app.post('/api/chat', (req, res) => {
  const { message } = req.body
  if (!message) return res.status(400).json({ error: 'Bericht is verplicht' })

  const msg = message.toLowerCase()
  let reply = ''

  if (msg.includes('allergen') || msg.includes('allergie') || msg.includes('ingredient')) {
    reply = 'Onze allergeneninformatie is altijd te vinden op de verpakking en in de productdetails in de app. Noirra-producten kunnen melk, soja, noten en gluten bevatten. Personen met een ernstige allergie raden wij aan contact op te nemen met onze klantenservice voordat zij een product aanschaffen. U kunt alle allergeneninformatie ook vinden bij elk product onder het tabblad "Info".'
  } else if (msg.includes('bestelling') || msg.includes('order') || msg.includes('bezorg') || msg.includes('levering')) {
    reply = 'Bestellingen kunt u plaatsen via de Bestellen-pagina in de app. Wij leveren binnen 1-3 werkdagen in Nederland en België. Voor zakelijke bestellingen (B2B) bieden wij speciale leveringsafspraken. U kunt uw bestelling volgen via "Mijn Bestellingen". Heeft u een vraag over een specifieke bestelling?'
  } else if (msg.includes('klacht') || msg.includes('probleem') || msg.includes('schade') || msg.includes('kapot')) {
    reply = 'Het spijt ons te horen dat u een probleem heeft met uw product. U kunt eenvoudig een klacht indienen via de Meldingen-pagina in de app. Wij hebben een snelle doorlooptijd van maximaal 3 werkdagen. U kunt foto\'s bijvoegen en de status van uw klacht realtime volgen. Wilt u nu naar de klachtenformulier?'
  } else if (msg.includes('track') || msg.includes('volg') || msg.includes('status')) {
    reply = 'U kunt uw klacht of bestelling eenvoudig volgen in de app. Voor klachten: ga naar Meldingen → Mijn Meldingen. U ziet de actuele status en een tijdlijn van alle acties. Voor bestellingen: ga naar Bestellen → Mijn Bestellingen. Hier ziet u de verwachte leveringsdatum en status.'
  } else if (msg.includes('duurzaam') || msg.includes('fairtrade') || msg.includes('fair trade') || msg.includes('biolog') || msg.includes('sustainab')) {
    reply = 'Duurzaamheid staat centraal bij Noirra. Al onze producten zijn Fairtrade gecertificeerd of dragen het Rainforest Alliance keurmerk. Wij werken direct samen met cacaoboeren in Ecuador, Madagascar en Brazilië. 2% van onze omzet gaat naar het Noirra Sustainability Fund voor opleiding van boeren en boshersteprojecten. Lees ons volledige duurzaamheidsrapport via de Notificaties-pagina.'
  } else if (msg.includes('dark') || msg.includes('puur') || msg.includes('70') || msg.includes('85')) {
    reply = 'Onze Dark 70% is een intense, robuuste chocolade met geroosterde cacaotonen en fruitige ondertonen uit Ecuador — perfect voor pure chocoladeliefhebbers. De Dark 85% is nog intenser: auster en complex, voor de echte kenner. Beide zijn Fairtrade gecertificeerd. Wilt u meer weten over een specifiek product?'
  } else if (msg.includes('ruby') || msg.includes('roze') || msg.includes('bessen')) {
    reply = 'Ruby chocolade is een uniek type — het vierde chocoladetype naast puur, melk en wit. De roze kleur is 100% natuurlijk, afkomstig van speciale ruby cacaobonen uit Brazilië. De smaak is fruitig met bessen-tonen en een delicate bloemige afdronk. Een echte zeldzaamheid die slechts 0,1% van de wereldwijde cacaoteelt vertegenwoordigt!'
  } else if (msg.includes('melk') || msg.includes('hazelno') || msg.includes('milk')) {
    reply = 'Onze Milk Hazelnut Praline is fluweelzacht met warme caramel-tonen en een geroosterde hazelnootsmaak. Het bevat 38% cacao en 12% echte hazelnootpasta. Let op: dit product bevat melk, hazelnoten en soja als allergenen. Een heerlijke keuze voor wie houdt van klassieke comfortchocolade!'
  } else if (msg.includes('wit') || msg.includes('white') || msg.includes('truffle') || msg.includes('truffel')) {
    reply = 'Onze White Truffle Luxury combineert premium witte chocolade met het subtiele aroma van Italiaanse witte truffel. Een luxe ervaring waarbij aardse tonen harmonieus samensmelten met romige cacaoboter. Op dit moment tijdelijk uitverkocht — schrijf u in voor een notificatie zodra het weer beschikbaar is!'
  } else if (msg.includes('punt') || msg.includes('loyal') || msg.includes('gold') || msg.includes('premium')) {
    reply = 'Met ons loyaliteitsprogramma spaart u punten bij elke aankoop en productregistratie. Gold Members (vanaf 200 punten) ontvangen exclusieve aanbiedingen, vroege toegang tot nieuwe producten en uitnodigingen voor speciale evenementen. Platinum Members (vanaf 1000 punten) krijgen ook gratis bezorging en een persoonlijke chocolatier-sessie per jaar.'
  } else if (msg.includes('nieuw') || msg.includes('new') || msg.includes('smaak') || msg.includes('flavor')) {
    reply = 'Wij werken altijd aan nieuwe creaties! Begin 2026 lanceren wij onze nieuwe "Noir Spice" collectie met specerijen als kardemom, chili en rozenwater. Volg onze community voor de nieuwste updates en wees de eerste die de nieuwe smaken proeft via onze proeverij-evenementen. Schrijf u in via de Evenementen-pagina!'
  } else {
    reply = 'Bedankt voor uw vraag! Ik ben Nova, uw persoonlijke Noirra-assistent. Ik kan u helpen met vragen over onze producten, allergenen, bestellingen, klachten, duurzaamheid en evenementen. Wilt u verbonden worden met een medewerker voor meer gespecialiseerde hulp? U kunt ook direct door de app navigeren voor snelle informatie.'
  }

  res.json({ reply })
})

// ─── Cart (existing) ──────────────────────────────────────────────────────────

app.get('/api/cart', (_req, res) => {
  const { items } = readCart()
  res.json([...items].reverse())
})

app.get('/api/cart/count', (_req, res) => {
  const { items } = readCart()
  res.json({ count: items.length })
})

app.post('/api/cart', (req, res) => {
  const { base, toppings, finish, rarity, batch } = req.body
  if (!base || !finish || !batch)
    return res.status(400).json({ error: 'base, finish and batch are required' })
  const cart = readCart()
  const item = {
    id: cart.nextId++,
    base,
    toppings: Array.isArray(toppings) ? toppings : [],
    finish,
    rarity: Number(rarity) || 0,
    batch,
    quantity: 1,
    created_at: new Date().toISOString()
  }
  cart.items.push(item)
  writeCart(cart)
  res.status(201).json(item)
})

app.patch('/api/cart/:id/quantity', (req, res) => {
  const id = Number(req.params.id)
  const qty = Number(req.body.quantity)
  if (!qty || qty < 1) return res.status(400).json({ error: 'quantity must be >= 1' })
  const cart = readCart()
  const item = cart.items.find(i => i.id === id)
  if (!item) return res.status(404).json({ error: 'not found' })
  item.quantity = qty
  writeCart(cart)
  res.json(item)
})

app.delete('/api/cart/:id', (req, res) => {
  const id = Number(req.params.id)
  const cart = readCart()
  const before = cart.items.length
  cart.items = cart.items.filter(i => i.id !== id)
  if (cart.items.length === before) return res.status(404).json({ error: 'not found' })
  writeCart(cart)
  res.json({ success: true })
})

app.delete('/api/cart', (_req, res) => {
  const cart = readCart()
  const deleted = cart.items.length
  cart.items = []
  writeCart(cart)
  res.json({ success: true, deleted })
})

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () =>
  console.log(`✓ Noirra API  →  http://localhost:${PORT}`)
)

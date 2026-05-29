# NOIRRA — 3D Chocolate Configurator

> *Crafted by Code. Designed by You.*

Een interactieve 3D chocolade-configurator voor het premium merk **Noirra**, gebouwd met React, Three.js en een Express/JSON backend.

![Noirra Preview](https://i.imgur.com/placeholder.png)

---

## Features

### 3D Configurator
- Realistische chocoladereep met **6×4 afgeronde segmenten** (RoundedBox geometry)
- Automatische rotatie + drag-to-rotate via OrbitControls
- ACESFilmic tone mapping met meerdere lichtbronnen (key, rim, fill, backlight)
- Contactschaduwen onder de reep

### Customization
| Optie | Keuzes |
|-------|--------|
| **Base Type** | Dark 70%, Dark 85%, Milk, Ruby |
| **Toppings** | Sea Salt, Hazelnuts, Freeze-dried Raspberry, Gold Flakes |
| **Finish** | Matte, Glossy, Metallic |

### Winkelwagen (persistent)
- **POST** een configuratie → opgeslagen in `server/cart.json`
- Cart-drawer met alle opgeslagen repen, batch-nummers en tijdstempels
- Items verwijderen of alles wissen
- Badge in de header toont het actuele aantal items
- Data blijft bewaard na herstart

### UI
- Luxe donker thema (`#0a0a0a`) met goud accent (`#c9a961`)
- Playfair Display serif + Inter sans-serif
- Innovation Index™ — dynamische rarity-score per combinatie (Classic → Legendary)
- Scale-pulse animatie bij elke configuratiewijziging
- Volledig responsive (mobiel + desktop)

---

## Tech Stack

| Laag | Technologie |
|------|-------------|
| Frontend | React 18, Vite 5 |
| 3D | Three.js, @react-three/fiber, @react-three/drei |
| Styling | Tailwind CSS |
| Backend | Express 4, Node.js |
| Database | JSON file store (geen native dependencies) |
| Dev tooling | concurrently |

---

## Installatie

```bash
# 1. Clone de repo
git clone https://github.com/jouw-gebruikersnaam/noirra.git
cd noirra

# 2. Installeer dependencies
npm install

# 3. Start frontend + backend tegelijk
npm run dev
```

Open **http://localhost:5174** in je browser.

De API draait op `http://localhost:3001` en wordt automatisch geproxied door Vite.

---

## Scripts

| Script | Beschrijving |
|--------|-------------|
| `npm run dev` | Start Vite (5174) + Express API (3001) tegelijk |
| `npm run dev:vite` | Alleen de frontend |
| `npm run dev:api` | Alleen de backend |
| `npm run build` | Productie-build van de frontend |

---

## API Endpoints

| Methode | Pad | Beschrijving |
|---------|-----|-------------|
| `GET` | `/api/cart` | Haal alle cart-items op (nieuwste eerst) |
| `GET` | `/api/cart/count` | Geeft `{ count: n }` terug |
| `POST` | `/api/cart` | Voeg item toe `{ base, toppings, finish, rarity, batch }` |
| `PATCH` | `/api/cart/:id/quantity` | Pas aantal aan `{ quantity: n }` |
| `DELETE` | `/api/cart/:id` | Verwijder één item |
| `DELETE` | `/api/cart` | Wis de volledige winkelwagen |

---

## Projectstructuur

```
noirra/
├── server/
│   ├── index.js        # Express REST API
│   ├── db.js           # JSON file store
│   └── cart.json       # Runtime data (gitignored)
├── src/
│   ├── App.jsx         # Volledige applicatie (3D + UI + cart)
│   ├── main.jsx        # React entry point
│   └── index.css       # Tailwind imports
├── index.html
├── vite.config.js      # Vite + API proxy config
├── tailwind.config.js
└── package.json
```

---

## Licentie

MIT

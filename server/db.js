/**
 * Lightweight JSON-file database.
 * Zero native dependencies — works on any Node.js ≥ 18.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const DB_PATH = join(__dirname, 'cart.json')

const EMPTY = { nextId: 1, items: [] }

export function readDb() {
  if (!existsSync(DB_PATH)) return structuredClone(EMPTY)
  try {
    return JSON.parse(readFileSync(DB_PATH, 'utf8'))
  } catch {
    return structuredClone(EMPTY)
  }
}

export function writeDb(data) {
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8')
}

// Ensure file exists on startup
if (!existsSync(DB_PATH)) writeDb(EMPTY)
console.log('✓ JSON store ready:', DB_PATH)

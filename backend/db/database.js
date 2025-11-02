import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/database.db')
const dbDir = path.dirname(dbPath)

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

let db = null

export function initDatabase() {
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  // Projects table
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_address TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      owner TEXT NOT NULL,
      funding_goal TEXT NOT NULL,
      deadline INTEGER NOT NULL,
      total_stages INTEGER NOT NULL,
      stage_allocations TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `)

  // Proposals table
  db.exec(`
    CREATE TABLE IF NOT EXISTS proposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      proposal_id INTEGER NOT NULL,
      contract_address TEXT NOT NULL,
      stage_index INTEGER NOT NULL,
      evidence_hash TEXT NOT NULL,
      proposer TEXT NOT NULL,
      voting_deadline INTEGER NOT NULL,
      votes_for TEXT DEFAULT '0',
      votes_against TEXT DEFAULT '0',
      executed INTEGER DEFAULT 0,
      passed INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(contract_address, proposal_id)
    )
  `)

  // Events table for indexing
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_address TEXT NOT NULL,
      event_name TEXT NOT NULL,
      block_number INTEGER NOT NULL,
      transaction_hash TEXT NOT NULL,
      log_index INTEGER NOT NULL,
      data TEXT,
      indexed_at INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(transaction_hash, log_index)
    )
  `)

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner);
    CREATE INDEX IF NOT EXISTS idx_proposals_contract ON proposals(contract_address);
    CREATE INDEX IF NOT EXISTS idx_events_contract ON events(contract_address);
    CREATE INDEX IF NOT EXISTS idx_events_block ON events(block_number);
  `)

  console.log('Database initialized')
  return db
}

export function getDatabase() {
  if (!db) {
    db = initDatabase()
  }
  return db
}

export function closeDatabase() {
  if (db) {
    db.close()
    db = null
  }
}

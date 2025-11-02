import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SQLite database file path
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../database.sqlite');

// Create SQLite database connection
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

console.log('✅ Connected to SQLite database:', DB_PATH);

// Query helper function (compatible with PostgreSQL-style interface)
export async function query(text, params = []) {
  const start = Date.now();
  try {
    // Convert PostgreSQL-style $1, $2 placeholders to SQLite ? placeholders
    let sql = text;
    const sqliteParams = [];
    
    // Simple conversion: replace $1, $2, etc. with ?
    if (params.length > 0) {
      // Find all $N placeholders and replace with ?
      sql = sql.replace(/\$\d+/g, () => {
        return '?';
      });
      sqliteParams.push(...params);
    }
    
    const stmt = db.prepare(sql);
    
    // Check if it's a SELECT query (returns data) or DDL/DML (doesn't return data)
    const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
    
    if (isSelect) {
      const result = stmt.all(...sqliteParams);
      const duration = Date.now() - start;
      console.log('Executed query', { text: sql, duration, rows: result.length });
      
      return {
        rows: result,
        rowCount: result.length,
      };
    } else {
      // For CREATE, INSERT, UPDATE, DELETE, etc. - use run()
      const result = stmt.run(...sqliteParams);
      const duration = Date.now() - start;
      console.log('Executed query', { text: sql, duration, changes: result.changes });
      
      return {
        rows: [],
        rowCount: result.changes,
        lastInsertRowid: result.lastInsertRowid,
      };
    }
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Execute a query that returns a single row
export async function queryOne(text, params = []) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

// Execute a query that doesn't return rows (INSERT, UPDATE, DELETE)
export function execute(text, params = []) {
  const start = Date.now();
  try {
    let sql = text;
    const sqliteParams = [];
    
    if (params.length > 0) {
      sql = sql.replace(/\$\d+/g, () => '?');
      sqliteParams.push(...params);
    }
    
    const stmt = db.prepare(sql);
    const result = stmt.run(...sqliteParams);
    
    const duration = Date.now() - start;
    console.log('Executed query', { text: sql, duration, changes: result.changes });
    
    return {
      rowCount: result.changes,
      lastInsertRowid: result.lastInsertRowid,
    };
  } catch (error) {
    console.error('Database execute error:', error);
    throw error;
  }
}

// Transaction helper
export async function transaction(callback) {
  const transaction = db.transaction(callback);
  return transaction();
}

// Get the database instance (for direct access if needed)
export function getDb() {
  return db;
}

export default db;


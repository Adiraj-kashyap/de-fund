import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  console.log('?? Running database migrations...');

  try {
    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    await pool.query(schema);

    console.log('? Database migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('? Migration failed:', error);
    process.exit(1);
  }
}

migrate();

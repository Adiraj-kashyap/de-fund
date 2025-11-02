import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db, { query } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  console.log('🔄 Running database migrations...');

  try {
    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Remove comments and split by semicolons
    const cleanedSchema = schema
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n');

    // Split by semicolons, but be smarter about it
    // We need to preserve SQL that might have semicolons inside string literals
    const statements = [];
    let currentStatement = '';
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < cleanedSchema.length; i++) {
      const char = cleanedSchema[i];
      const prevChar = i > 0 ? cleanedSchema[i - 1] : '';
      
      // Track string literals
      if ((char === '"' || char === "'") && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
      }
      
      currentStatement += char;
      
      // Only split on semicolon if we're not in a string
      if (char === ';' && !inString) {
        const trimmed = currentStatement.trim();
        if (trimmed.length > 0 && trimmed !== ';') {
          statements.push(trimmed);
        }
        currentStatement = '';
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim().length > 0) {
      statements.push(currentStatement.trim());
    }

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement && !statement.startsWith('--')) {
        try {
          await query(statement);
        } catch (error) {
          // Ignore errors for IF NOT EXISTS or already exists
          if (!error.message.includes('already exists') && 
              !error.message.includes('duplicate') &&
              !(error.code === 'SQLITE_ERROR' && error.message.includes('already exists'))) {
            // For CREATE INDEX, table might not exist yet - that's ok if it's part of migration
            if (statement.toUpperCase().includes('CREATE INDEX')) {
              console.warn(`⚠️  Index creation skipped (may already exist): ${statement.substring(0, 50)}...`);
            } else {
              console.error(`❌ Error executing statement ${i + 1}:`, error.message);
              throw error;
            }
          }
        }
      }
    }

    console.log('✅ Database migrations completed successfully!');
    console.log(`📁 Database location: ${db.name}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();

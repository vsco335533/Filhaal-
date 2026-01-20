import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, '../../migrations');
const MIGRATIONS_TABLE = 'schema_migrations';

async function createMigrationsTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(query);
  console.log('✓ Migrations table ready');
}

// catch (error) { console.error('Error creating migrations table:', error); throw error; } }




async function getExecutedMigrations() {
  const result = await pool.query(
    `SELECT filename FROM ${MIGRATIONS_TABLE} ORDER BY id`
  );
  return result.rows.map(row => row.filename);
}

async function executeMigration(filename, sql) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log(`Executing migration: ${filename}`);
    await client.query(sql);
    await client.query(
      `INSERT INTO ${MIGRATIONS_TABLE} (filename) VALUES ($1)`,
      [filename]
    );
    await client.query('COMMIT');
    console.log(`✓ Migration completed: ${filename}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function runMigrations() {
  console.log('Starting Database Migrations');

  await createMigrationsTable();
  const executed = await getExecutedMigrations();

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('No migrations directory');
    return;
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (!executed.includes(file)) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await executeMigration(file, sql);
    }
  }

  console.log('✓ All migrations done');
}

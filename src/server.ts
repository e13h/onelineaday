import express from 'express';
import pg from 'pg';
const { Pool } = pg;
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

config();

const app = express();
app.use(express.json());

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
});

async function runMigrations() {
  try {
    console.log('Running database migrations...');
    const migrationPath = join(process.cwd(), 'db_schema.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    await pool.query(migrationSQL);
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
}

app.get('/api/entries/:month', async (req, res) => {
  const month = req.params.month;
  try {
    const result = await pool.query(
      `SELECT date::text, message, year 
       FROM journal_entries 
       WHERE EXTRACT(MONTH FROM date) = $1
       ORDER BY date, year`,
      [month]
    );
    console.log('Fetched entries:', result.rows); // Debug log
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching entries:', error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

app.post('/api/entries', async (req, res) => {
  const entries = req.body;
  console.log('Received entries:', entries);
  
  try {
    await pool.query('BEGIN');
    
    for (const entry of entries) {
      await pool.query(
        `INSERT INTO journal_entries (date, message, year)
         VALUES ($1, $2, $3)
         ON CONFLICT (date, year)
         DO UPDATE SET message = EXCLUDED.message`,
        [entry.date, entry.message, entry.year]
      );
    }
    
    await pool.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error saving entries:', error);
    res.status(500).json({ error: 'Failed to save entries' });
  }
});

const port = process.env.PORT || 3000;

// Run migrations before starting the server
runMigrations()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server due to migration error:', error);
    process.exit(1);
  });

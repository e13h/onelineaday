import express from 'express';
import pg from 'pg';
const { Pool } = pg;
import { config } from 'dotenv';

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
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
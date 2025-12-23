import express from 'express';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(__dirname);
const dbDir = join(projectRoot, 'db');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const app = express();
app.use(express.json());
app.use(express.static(join(projectRoot, 'dist')));

let db;

function initializeDatabase() {
  const dbPath = join(dbDir, 'journal.db');
  db = new Database(dbPath);

  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

app.get('/api/entries', (req, res) => {
  try {
    const entries = db.prepare('SELECT date, message FROM entries ORDER BY date DESC').all();
    res.json(entries);
  } catch (error) {
    console.error('Error fetching entries:', error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

app.get('/api/entries/:date', (req, res) => {
  try {
    const { date } = req.params;
    const entry = db.prepare('SELECT date, message FROM entries WHERE date = ?').get(date);
    if (entry) {
      res.json(entry);
    } else {
      res.status(404).json({ error: 'Entry not found' });
    }
  } catch (error) {
    console.error('Error fetching entry:', error);
    res.status(500).json({ error: 'Failed to fetch entry' });
  }
});

app.post('/api/entries', (req, res) => {
  try {
    const { date, message } = req.body;

    if (!date || !message) {
      return res.status(400).json({ error: 'Date and message are required' });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
    }

    const now = new Date().toISOString();
    db.prepare('INSERT OR REPLACE INTO entries (date, message, updated_at) VALUES (?, ?, ?)').run(
      date,
      message,
      now
    );

    const entry = db.prepare('SELECT date, message FROM entries WHERE date = ?').get(date);
    res.json(entry);
  } catch (error) {
    console.error('Error creating/updating entry:', error);
    res.status(500).json({ error: 'Failed to save entry' });
  }
});

app.put('/api/entries/:date', (req, res) => {
  try {
    const { date } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE entries SET message = ?, updated_at = ? WHERE date = ?').run(
      message,
      now,
      date
    );

    const entry = db.prepare('SELECT date, message FROM entries WHERE date = ?').get(date);
    if (entry) {
      res.json(entry);
    } else {
      res.status(404).json({ error: 'Entry not found' });
    }
  } catch (error) {
    console.error('Error updating entry:', error);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

app.delete('/api/entries/:date', (req, res) => {
  try {
    const { date } = req.params;
    db.prepare('DELETE FROM entries WHERE date = ?').run(date);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting entry:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

app.post('/api/import', (req, res) => {
  try {
    const { entries } = req.body;

    if (!Array.isArray(entries)) {
      return res.status(400).json({ error: 'Entries must be an array' });
    }

    const now = new Date().toISOString();
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO entries (date, message, updated_at) VALUES (?, ?, ?)'
    );

    for (const entry of entries) {
      if (!entry.date || !entry.message) {
        return res.status(400).json({ error: 'Each entry must have date and message' });
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(entry.date)) {
        return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
      }

      stmt.run(entry.date, entry.message, now);
    }

    res.json({ success: true, count: entries.length });
  } catch (error) {
    console.error('Error importing entries:', error);
    res.status(500).json({ error: 'Failed to import entries' });
  }
});

app.get('/api/export', (req, res) => {
  try {
    const entries = db.prepare('SELECT date, message FROM entries ORDER BY date').all();
    res.json(entries);
  } catch (error) {
    console.error('Error exporting entries:', error);
    res.status(500).json({ error: 'Failed to export entries' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(join(projectRoot, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;

try {
  initializeDatabase();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Database: ${join(dbDir, 'journal.db')}`);
  });
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}

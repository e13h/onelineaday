/*
  # Create journal entries table

  1. New Table
    - `journal_entries`
      - `id` (serial, primary key)
      - `date` (date, not null)
      - `message` (text, not null)
      - `year` (integer, not null)
      - `created_at` (timestamp with time zone, default: now())
      - `updated_at` (timestamp with time zone, default: now())

  2. Indexes
    - Unique constraint on date and year combination
    - Index on year for faster queries
*/

CREATE TABLE IF NOT EXISTS journal_entries (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    message TEXT NOT NULL,
    year INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date, year)
);

CREATE INDEX IF NOT EXISTS journal_entries_year_idx ON journal_entries(year);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update the updated_at column
CREATE TRIGGER update_journal_entries_updated_at
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
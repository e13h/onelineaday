import React, { useState, useEffect } from 'react';
import { Upload, Save } from 'lucide-react';
import { MonthButton } from './components/MonthButton';
import { DayButton } from './components/DayButton';
import { JournalEntry } from './components/JournalEntry';
import type { ImportData, JournalEntry as JournalEntryType } from './types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getUTCDate();
}

function App() {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [entries, setEntries] = useState<JournalEntryType[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => 2021 + i);
  const currentYear = new Date().getUTCFullYear();

  useEffect(() => {
    if (selectedMonth !== null) {
      fetchEntriesForMonth(selectedMonth + 1);
    }
  }, [selectedMonth]);

  const fetchEntriesForMonth = async (month: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/entries/${month}`);
      if (!response.ok) {
        throw new Error('Failed to fetch entries');
      }
      const data = await response.json();
      console.log('Fetched entries:', data);
      setEntries(data);
    } catch (error) {
      console.error('Error fetching entries:', error);
      alert('Failed to fetch entries. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getEntryCountForDay = (day: number): number => {
    if (!entries || entries.length === 0) return 0;
    
    const formattedDay = String(day).padStart(2, '0');
    const monthStr = String(selectedMonth! + 1).padStart(2, '0');
    
    const count = entries.filter(entry => {
      const [year, month, entryDay] = entry.date.split('-');
      return entryDay === formattedDay && month === monthStr;
    }).length;
    
    return count;
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string) as ImportData[];
        const entriesToSave = importedData.map(item => ({
          date: item.date,
          message: item.message,
          year: new Date(item.date).getUTCFullYear()
        }));

        setIsSaving(true);
        const response = await fetch('/api/entries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(entriesToSave),
        });

        if (!response.ok) {
          throw new Error('Failed to save imported entries');
        }

        const result = await response.json();
        if (result.success) {
          alert('Entries imported and saved successfully!');
          if (selectedMonth !== null) {
            await fetchEntriesForMonth(selectedMonth + 1);
          }
        } else {
          throw new Error('Failed to save imported entries');
        }
      } catch (error) {
        console.error('Error importing data:', error);
        alert('Error importing data. Please check the file format.');
      } finally {
        setIsSaving(false);
      }
    };
    reader.readAsText(file);
  };

  const handleEntryChange = (date: string, year: number, message: string) => {
    setEntries(prevEntries => {
      const existingEntryIndex = prevEntries.findIndex(
        entry => entry.date === date && entry.year === year
      );

      if (existingEntryIndex >= 0) {
        const newEntries = [...prevEntries];
        newEntries[existingEntryIndex] = { date, year, message };
        return newEntries;
      } else {
        return [...prevEntries, { date, year, message }];
      }
    });
  };

  const getEntryForDate = (date: string, year: number): string => {
    const entry = entries.find(entry => entry.date === date && entry.year === year);
    console.log('Getting entry for date:', date, 'year:', year, 'found:', entry);
    return entry?.message || '';
  };

  const handleSave = async () => {
    if (selectedMonth === null || selectedDay === null) return;
    setIsSaving(true);
    try {
      const entriesToSave = years.map(year => {
        const date = `${year}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
        const message = getEntryForDate(date, year);
        return {
          date,
          message,
          year
        };
      }).filter(entry => entry.message);

      if (entriesToSave.length === 0) {
        alert('No entries to save!');
        setIsSaving(false);
        return;
      }

      console.log('Saving entries:', entriesToSave);

      const response = await fetch('/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entriesToSave),
      });

      if (!response.ok) {
        throw new Error(`Failed to save entries: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        alert('Entries saved successfully!');
        await fetchEntriesForMonth(selectedMonth + 1);
      } else {
        throw new Error('Failed to save entries');
      }
    } catch (error) {
      console.error('Error saving entries:', error);
      alert('Failed to save entries. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMonthSelect = (index: number) => {
    setSelectedMonth(index);
    setSelectedDay(null);
    setEntries([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">One Line a Day Journal</h1>
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" style={{ opacity: isSaving ? 0.5 : 1, pointerEvents: isSaving ? 'none' : 'auto' }}>
            <Upload className="w-5 h-5" />
            <span>{isSaving ? 'Importing...' : 'Import'}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
              disabled={isSaving}
            />
          </label>
        </div>

        {selectedMonth === null ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {MONTHS.map((month, index) => (
              <MonthButton
                key={month}
                month={month}
                onClick={() => handleMonthSelect(index)}
              />
            ))}
          </div>
        ) : selectedDay === null ? (
          <div>
            <button
              onClick={() => setSelectedMonth(null)}
              className="mb-4 text-indigo-600 hover:text-indigo-800 font-medium"
            >
              ← Back to months
            </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {MONTHS[selectedMonth]}
            </h2>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-lg text-gray-600">Loading entries...</div>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-3 sm:gap-4">
                {Array.from(
                  { length: getDaysInMonth(selectedMonth, currentYear) },
                  (_, i) => i + 1
                ).map((day) => {
                  const count = getEntryCountForDay(day);
                  console.log(`Day ${day} has ${count} entries`);
                  return (
                    <DayButton
                      key={day}
                      day={day}
                      onClick={() => setSelectedDay(day)}
                      entryCount={count}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  ← Back to days
                </button>
                <h2 className="text-2xl font-bold text-gray-900">
                  {MONTHS[selectedMonth]} {selectedDay}
                </h2>
              </div>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                <span>{isSaving ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
            <div className="space-y-6">
              {years.map(year => {
                const date = `${year}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
                const value = getEntryForDate(date, year);
                console.log('Rendering entry for date:', date, 'value:', value);
                return (
                  <JournalEntry
                    key={year}
                    year={year}
                    value={value}
                    onChange={(message) => handleEntryChange(date, year, message)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
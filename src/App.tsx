import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Home, Download, Upload, Edit2, Check } from 'lucide-react';
import { useDB } from './hooks/useDB';
import { useSync } from './hooks/useSync';
import { useGestures } from './hooks/useGestures';
import { getCatchupCounts, formatDateDisplay, getStartDate } from './utils/dateUtils';
import CatchupBadge from './components/CatchupBadge';
import OnThisDayList from './components/OnThisDayList';
import EntryEditor from './components/EntryEditor';

function App() {
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const [entries, setEntries] = useState<Record<string, string>>({});
  const [startDate, setStartDate] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [unsyncedChanges, setUnsyncedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { loadEntries, saveEntry, deleteEntry, exportData, importData } = useDB();
  const { syncWithServer, isSyncing, lastSyncTime } = useSync(entries);
  const { handleWheel, handleTouchStart, handleTouchEnd } = useGestures(
    (offset) => {
      const [currentYear, currentMonth, currentDay] = currentDate.split("-").map(Number);
      const newDate = new Date(currentYear, currentMonth - 1, currentDay);
      newDate.setDate(newDate.getDate() + offset);
      setCurrentDate(newDate.toISOString().split('T')[0]);
      setEditing(false);
    }
  );

  useEffect(() => {
    const initializeApp = async () => {
      const loadedEntries = await loadEntries();
      setEntries(loadedEntries);

      const calculatedStartDate = getStartDate(loadedEntries);
      setStartDate(calculatedStartDate);
    };

    initializeApp();
  }, [loadEntries]);

  useEffect(() => {
    if (unsyncedChanges && !isSyncing) {
      const timer = setTimeout(async () => {
        await syncWithServer(entries);
        setUnsyncedChanges(false);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [unsyncedChanges, isSyncing, entries, syncWithServer]);

  // Auto-enable editing mode for new entries
  useEffect(() => {
    const currentEntry = entries[currentDate] || '';
    if (!currentEntry && !editing) {
      setEditing(true);
    }
  }, [currentDate, entries, editing]);

  const handleSaveEntry = useCallback(
    async (date: string, message: string) => {
      setEntries((prev) => {
        const updated = { ...prev, [date]: message };
        setUnsyncedChanges(true);
        return updated;
      });

      setIsSaving(true);
      await saveEntry(date, message);
      setIsSaving(false);
    },
    [saveEntry]
  );

  const handleDeleteEntry = useCallback(
    async (date: string) => {
      setEntries((prev) => {
        const updated = { ...prev };
        delete updated[date];
        setUnsyncedChanges(true);
        return updated;
      });

      await deleteEntry(date);
    },
    [deleteEntry]
  );

  const handleExport = useCallback(async () => {
    const data = Object.entries(entries).map(([date, message]) => ({ date, message }));
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [entries]);

  const handleImport = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const text = await file.text();
      const data = JSON.parse(text);

      if (!Array.isArray(data)) {
        alert('Invalid JSON format');
        return;
      }
      console.log(`Parsed ${data.length} rows of data!`);

      const imported = await importData(data);
      setEntries(imported);
      const calculatedStartDate = getStartDate(imported);
      setStartDate(calculatedStartDate);
      setUnsyncedChanges(true);
    };
    input.click();
  }, [importData]);

  const goToToday = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    setCurrentDate(today);
    setEditing(false);
  }, []);

  const currentEntry = entries[currentDate] || '';
  const today = new Date().toISOString().split('T')[0];
  const isToday = currentDate === today;
  const { previousCount, nextCount } = getCatchupCounts(
    currentDate,
    entries,
    startDate || today
  );

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative h-screen flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-slate-200 z-10">
          <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl sm:text-3xl font-light text-slate-900">
                {formatDateDisplay(currentDate)}
              </h1>
              <div className="flex gap-2">
                {!isToday && (
                  <button
                    onClick={goToToday}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-sm"
                  >
                    <Home size={18} />
                    <span className="hidden sm:inline">Today</span>
                  </button>
                )}
                <button
                  onClick={handleExport}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Export entries"
                >
                  <Download size={20} className="text-slate-600" />
                </button>
                <button
                  onClick={handleImport}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Import entries"
                >
                  <Upload size={20} className="text-slate-600" />
                </button>
              </div>
            </div>

            {/* Navigation arrows */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  const [currentYear, currentMonth, currentDay] = currentDate.split("-").map(Number);
                  const prev = new Date(currentYear, currentMonth - 1, currentDay - 1);
                  setCurrentDate(prev.toISOString().split('T')[0]);
                  setEditing(false);
                }}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                title="Previous day"
              >
                <ChevronLeft size={24} className="text-slate-600" />
              </button>

              <div className="flex-1 px-4">
                <div className="h-1 bg-slate-200 rounded-full relative">
                  <div
                    className="h-1 bg-blue-500 rounded-full transition-all"
                    style={{
                      width: '2%',
                      marginLeft: currentDate > today ? '0%' : currentDate === today ? '49%' : '98%',
                    }}
                  ></div>
                </div>
              </div>

              <button
                onClick={() => {
                  const [currentYear, currentMonth, currentDay] = currentDate.split("-").map(Number);
                  const next = new Date(currentYear, currentMonth - 1, currentDay + 1);
                  setCurrentDate(next.toISOString().split('T')[0]);
                  setEditing(false);
                }}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                title="Next day"
              >
                <ChevronRight size={24} className="text-slate-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-row overflow-hidden">
          {/* Left sidebar - Previous catchup count */}
          <CatchupBadge count={previousCount} side="left" />

          {/* Center - Entry editor and on this day list */}
          <div className="flex-1 overflow-y-auto flex flex-col">
            <div className="max-w-2xl mx-auto w-full px-4 py-8 sm:px-6">
              <div className="mb-8">
                {currentEntry && !editing && (
                  <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-slate-700 leading-relaxed">{currentEntry}</p>
                      <button
                        onClick={() => setEditing(true)}
                        className="p-1 ml-2 hover:bg-slate-100 rounded transition-colors flex-shrink-0"
                        title="Edit entry"
                      >
                        <Edit2 size={18} className="text-slate-500" />
                      </button>
                    </div>
                    {isSaving && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        Saving...
                      </div>
                    )}
                    {!isSaving && !unsyncedChanges && (
                      <div className="flex items-center gap-2 text-xs text-green-600 mt-3">
                        <Check size={14} />
                        Saved
                      </div>
                    )}
                  </div>
                )}

                {(!currentEntry || editing) && (
                  <EntryEditor
                    date={currentDate}
                    initialMessage={currentEntry}
                    onSave={handleSaveEntry}
                    isSaving={isSaving}
                  />
                )}
              </div>

              {/* On This Day section */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">On this day</h2>
                <OnThisDayList currentDate={currentDate} entries={entries} />
              </div>
            </div>
          </div>

          {/* Right sidebar - Next catchup count */}
          <CatchupBadge count={nextCount} side="right" />
        </div>

        {/* Sync status indicator */}
        {(unsyncedChanges || isSyncing) && (
          <div className="fixed bottom-4 right-4 px-4 py-2 bg-amber-100 border border-amber-400 rounded-lg text-sm text-amber-800">
            {isSyncing ? 'Syncing...' : 'Unsaved changes'}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

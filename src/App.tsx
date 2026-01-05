import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Home, Download, Upload, Edit2, Check, Menu, RefreshCw } from 'lucide-react';
import { useDB, Entry } from './hooks/useDB';
import { useSync } from './hooks/useSync';
import { useGestures } from './hooks/useGestures';
import { getCatchupCounts, formatDateDisplay, getStartDate, formatDateString } from './utils/dateUtils';
import CatchupBadge from './components/CatchupBadge';
import OnThisDayList from './components/OnThisDayList';
import EntryEditor from './components/EntryEditor';

function App() {
  const [currentDate, setCurrentDate] = useState(() => {
    return formatDateString();
  });

  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [startDate, setStartDate] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [unsyncedChanges, setUnsyncedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const initialSyncDone = useRef(false);
  const syncDelayRef = useRef(10000); // Start with 10 seconds
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { 
    loadEntries, 
    saveEntry, 
    saveEntries,
    deleteEntry, 
    exportData, 
    importData,
    getLastSyncTime,
    setLastSyncTime,
    getEntriesModifiedSince
  } = useDB();
  const { syncWithServer, isSyncing, lastSyncTime, initializeSync } = useSync(
    () => entries,
    getLastSyncTime,
    setLastSyncTime,
    getEntriesModifiedSince,
    saveEntries
  );
  const { handleTouchStart, handleTouchEnd } = useGestures(
    (offset) => {
      const [currentYear, currentMonth, currentDay] = currentDate.split("-").map(Number);
      const newDate = new Date(currentYear, currentMonth - 1, currentDay);
      newDate.setDate(newDate.getDate() + offset);
      setCurrentDate(formatDateString(newDate));
      setEditing(false);
    }
  );

  useEffect(() => {
    const initializeApp = async () => {
      const loadedEntries = await loadEntries();
      setEntries(loadedEntries);

      // Convert entries to string format for getStartDate compatibility
      const stringEntries: Record<string, string> = {};
      Object.entries(loadedEntries).forEach(([date, entry]) => {
        if (entry.message) { // Only include non-empty messages (exclude tombstones)
          stringEntries[date] = entry.message;
        }
      });

      const calculatedStartDate = getStartDate(stringEntries);
      setStartDate(calculatedStartDate);
      
      // Initialize sync state
      await initializeSync();
      setIsInitializing(false);
    };

    initializeApp();
  }, [loadEntries, initializeSync]);

  // Perform initial sync after app loads (only once)
  useEffect(() => {
    if (!initialSyncDone.current && startDate !== null) {
      initialSyncDone.current = true;
      setTimeout(async () => {
        try {
          const success = await syncWithServer();
          if (success) {
            const updatedEntries = await loadEntries();
            setEntries(updatedEntries);
          }
        } catch (error) {
          console.error('Initial sync failed:', error);
        }
      }, 1000); // Small delay to let the UI settle
    }
  }, [startDate, loadEntries]); // Remove syncWithServer from dependencies

  useEffect(() => {
    if (unsyncedChanges && !isSyncing) {
      const timer = setTimeout(async () => {
        const success = await syncWithServer();
        if (success) {
          setUnsyncedChanges(false);
          // Reload entries to get any server changes
          const updatedEntries = await loadEntries();
          setEntries(updatedEntries);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [unsyncedChanges, isSyncing, loadEntries]);

  // Handle click outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDropdown]);

  // Periodic sync with exponential backoff
  useEffect(() => {
    const scheduleNextSync = () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      
      syncTimeoutRef.current = setTimeout(async () => {
        if (!isSyncing && !isSaving) {
          try {
            const success = await syncWithServer();
            if (success) {
              // Reset delay on successful sync
              syncDelayRef.current = 10000; // 10 seconds
              
              const updatedEntries = await loadEntries();
              setEntries(prevEntries => {
                // Only update if there are actual changes to avoid unnecessary re-renders
                const hasChanges = Object.keys(updatedEntries).some(date => {
                  const prev = prevEntries[date];
                  const updated = updatedEntries[date];
                  return !prev || prev.message !== updated.message || prev.timestamp !== updated.timestamp;
                }) || Object.keys(prevEntries).length !== Object.keys(updatedEntries).length;
                
                return hasChanges ? updatedEntries : prevEntries;
              });
            } else {
              // Increase delay on sync failure with exponential backoff (max 5 minutes)
              syncDelayRef.current = Math.min(syncDelayRef.current * 2, 300000);
              console.log(`Sync failed, increasing delay to ${syncDelayRef.current / 1000} seconds`);
            }
          } catch (error) {
            console.error('Periodic sync failed:', error);
            // Increase delay on error with exponential backoff (max 5 minutes)
            syncDelayRef.current = Math.min(syncDelayRef.current * 2, 300000);
            console.log(`Sync error, increasing delay to ${syncDelayRef.current / 1000} seconds`);
          }
        }
        
        // Schedule the next sync
        scheduleNextSync();
      }, syncDelayRef.current);
    };

    // Start the first sync
    scheduleNextSync();

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [isSyncing, isSaving, loadEntries]);

  // Auto-enable editing mode for new entries, but only after initial data is loaded
  useEffect(() => {
    // Don't make editing decisions until initial data is loaded
    if (isInitializing) return;
    
    const currentEntry = entries[currentDate];
    const currentMessage = currentEntry?.message || '';
    if (!currentMessage) {
      setEditing(true);
    }
  }, [currentDate, entries, isInitializing]);

  const handleSaveEntry = useCallback(
    async (date: string, message: string) => {
      setIsSaving(true);
      try {
        const savedEntry = await saveEntry(date, message);
        setEntries((prev) => {
          const updated = { ...prev, [date]: savedEntry };
          setUnsyncedChanges(true);
          return updated;
        });
      } catch (error) {
        console.error('Error saving entry:', error);
      } finally {
        setIsSaving(false);
      }
    },
    [saveEntry]
  );

  const handleDeleteEntry = useCallback(
    async (date: string) => {
      try {
        const tombstone = await deleteEntry(date);
        setEntries((prev) => {
          const updated = { ...prev, [date]: tombstone };
          setUnsyncedChanges(true);
          return updated;
        });
      } catch (error) {
        console.error('Error deleting entry:', error);
      }
    },
    [deleteEntry]
  );

  const handleExport = useCallback(async () => {
    const data = Object.values(entries)
      .filter(entry => entry.message) // Exclude tombstones
      .map(entry => ({ date: entry.date, message: entry.message, timestamp: entry.timestamp }));
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `onelineaday_export_${new Date().toISOString().replace(/:/g, '-')}.json`;
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
    const todayString = formatDateString();
    setCurrentDate(todayString);
    setEditing(false);
  }, []);

  const currentEntry = entries[currentDate];
  const currentMessage = currentEntry?.message || '';
  const today = formatDateString();
  const isToday = currentDate === today;
  
  // Convert entries to string format for getCatchupCounts compatibility
  const stringEntries: Record<string, string> = {};
  Object.entries(entries).forEach(([date, entry]) => {
    if (entry.message) { // Only include non-empty messages (exclude tombstones)
      stringEntries[date] = entry.message;
    }
  });
  
  const { previousCount, nextCount } = getCatchupCounts(
    currentDate,
    stringEntries,
    startDate || today
  );

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Backdrop for dropdown - outside header so it covers entire page */}
      
      <div className="relative h-screen flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-slate-200 z-10">
          <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-light text-slate-900">
                {formatDateDisplay(currentDate)}
              </h1>
              <div className="flex gap-2 relative">
                {!isToday && (
                  <button
                    onClick={goToToday}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-sm"
                  >
                    <Home size={18} />
                    <span className="hidden sm:inline">Today</span>
                  </button>
                )}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Menu"
                  >
                    <Menu size={20} className="text-slate-600" />
                  </button>
                  {showDropdown && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-[110]">
                        <button
                          onClick={async () => {
                            setShowDropdown(false);
                            try {
                              const success = await syncWithServer();
                              if (success) {
                                const updatedEntries = await loadEntries();
                                setEntries(updatedEntries);
                                setUnsyncedChanges(false);
                              }
                            } catch (error) {
                              console.error('Manual sync failed:', error);
                            }
                          }}
                          disabled={isSyncing}
                          className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-slate-50 text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <RefreshCw size={18} className={`text-slate-600 ${isSyncing ? 'animate-spin' : ''}`} />
                          {isSyncing ? 'Syncing...' : 'Sync Now'}
                        </button>
                        <button
                          onClick={() => {
                            handleExport();
                            setShowDropdown(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-slate-50 text-slate-700 transition-colors"
                        >
                          <Download size={18} className="text-slate-600" />
                          Export entries
                        </button>
                        <button
                          onClick={() => {
                            handleImport();
                            setShowDropdown(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-slate-50 text-slate-700 transition-colors"
                        >
                          <Upload size={18} className="text-slate-600" />
                          Import entries
                        </button>
                      </div>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation arrows */}
            <div className="flex items-center justify-between">
              <div className="relative">
                <button
                  onClick={() => {
                    const [currentYear, currentMonth, currentDay] = currentDate.split("-").map(Number);
                    const prev = new Date(currentYear, currentMonth - 1, currentDay - 1);
                    setCurrentDate(formatDateString(prev));
                    setEditing(false);
                  }}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                  title="Previous day"
                >
                  <ChevronLeft size={24} className="text-slate-600" />
                </button>
                <CatchupBadge count={previousCount} side="left" />
              </div>

              <div className="flex-1 px-4">
                <div className="h-1 bg-slate-200 rounded-full relative">
                  <div
                    className="h-1 bg-blue-500 rounded-full transition-all"
                    style={{
                      width: '10%',
                      marginLeft: currentDate > today ? '0%' : currentDate === today ? '45%' : '90%',
                    }}
                  ></div>
                </div>
              </div>

              <div className="relative">
                <button
                  onClick={() => {
                    const [currentYear, currentMonth, currentDay] = currentDate.split("-").map(Number);
                    const next = new Date(currentYear, currentMonth - 1, currentDay + 1);
                    setCurrentDate(formatDateString(next));
                    setEditing(false);
                  }}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                  title="Next day"
                >
                  <ChevronRight size={24} className="text-slate-600" />
                </button>
                <CatchupBadge count={nextCount} side="right" />
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto w-full px-4 py-8 sm:px-6">
              <div className="mb-8">
                {currentMessage && !editing && (
                  <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-slate-700 leading-relaxed">{currentMessage}</p>
                      <button
                        onClick={() => setEditing(true)}
                        className="flex items-center gap-2 px-3 py-2 ml-2 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex-shrink-0 text-sm text-slate-600 hover:text-slate-700"
                        title="Edit entry"
                      >
                        <Edit2 size={16} className="text-slate-500" />
                        Edit
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

                {(!currentMessage || editing) && (
                  <EntryEditor
                    date={currentDate}
                    initialMessage={currentMessage}
                    onSave={handleSaveEntry}
                    isSaving={isSaving}
                  />
                )}
              </div>

              {/* On This Day section */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">On this day</h2>
                <OnThisDayList currentDate={currentDate} entries={stringEntries} />
              </div>
          </div>
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

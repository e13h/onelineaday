import { useState, useCallback } from 'react';
import { Entry } from './useDB';

export function useSync(
  getEntries: () => Record<string, Entry>,
  getLastSyncTime: () => Promise<string | null>,
  setLastSyncTime: (timestamp: string) => Promise<void>,
  getEntriesModifiedSince: (since: string) => Promise<Entry[]>,
  saveEntries: (entries: Entry[]) => Promise<void>
) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTimeState] = useState<string | null>(null);

  const syncWithServer = useCallback(async (): Promise<boolean> => {
    if (isSyncing) return false;

    setIsSyncing(true);
    try {
      // Get current entries at sync time
      const entries = getEntries();
      
      // Get our last sync timestamp
      const lastSync = await getLastSyncTime();
      
      // Step 1: Get changes from server since our last sync
      let serverEntries: Entry[] = [];
      try {
        const response = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            lastSync: lastSync,
            action: 'pull'
          }),
        });

        if (response.ok) {
          const data = await response.json();
          serverEntries = data.entries || [];
        } else {
          console.error('Failed to pull changes from server:', response.statusText);
        }
      } catch (error) {
        console.error('Error pulling changes from server:', error);
      }

      // Step 2: Merge server entries with local entries (most recent timestamp wins)
      const mergedEntries = { ...entries };
      let hasLocalChanges = false;

      for (const serverEntry of serverEntries) {
        const localEntry = mergedEntries[serverEntry.date];
        
        if (!localEntry || serverEntry.timestamp > localEntry.timestamp) {
          mergedEntries[serverEntry.date] = serverEntry;
          hasLocalChanges = true;
        }
      }

      // Save merged entries to local database if there were server changes
      if (hasLocalChanges) {
        await saveEntries(Object.values(mergedEntries));
      }

      // Step 3: Get local changes since last sync and send to server
      const localChanges = lastSync ? await getEntriesModifiedSince(lastSync) : Object.values(entries);
      
      if (localChanges.length > 0) {
        // Send local changes in chunks
        const CHUNK_SIZE = 50;
        const chunks = [];
        for (let i = 0; i < localChanges.length; i += CHUNK_SIZE) {
          chunks.push(localChanges.slice(i, i + CHUNK_SIZE));
        }

        let pushSuccessful = true;

        for (let i = 0; i < chunks.length; i++) {
          try {
            const response = await fetch('/api/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'push',
                entries: chunks[i],
                chunkIndex: i,
                totalChunks: chunks.length
              }),
            });

            if (!response.ok) {
              console.error(`Push failed for chunk ${i + 1}/${chunks.length}:`, response.statusText);
              pushSuccessful = false;
            }
          } catch (error) {
            console.error(`Error pushing chunk ${i + 1}/${chunks.length} to server:`, error);
            pushSuccessful = false;
          }
        }

        if (!pushSuccessful) {
          return false;
        }
      }

      // Step 4: Update last sync timestamp
      const newSyncTime = new Date().toISOString();
      await setLastSyncTime(newSyncTime);
      setLastSyncTimeState(newSyncTime);

      console.log(`Delta sync completed. Pulled ${serverEntries.length} entries, pushed ${localChanges.length} entries`);
      return true;

    } catch (error) {
      console.error('Error during delta sync:', error);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, getEntries, getLastSyncTime, setLastSyncTime, getEntriesModifiedSince, saveEntries]);

  // Initialize last sync time on first load
  const initializeSync = useCallback(async () => {
    const lastSync = await getLastSyncTime();
    setLastSyncTimeState(lastSync);
  }, [getLastSyncTime]);

  return { 
    syncWithServer, 
    isSyncing, 
    lastSyncTime,
    initializeSync
  };
}

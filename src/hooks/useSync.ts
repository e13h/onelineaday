import { useState, useCallback } from 'react';

export function useSync(entries: Record<string, string>) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  const syncWithServer = useCallback(
    async (entriesToSync: Record<string, string>) => {
      if (isSyncing) return;

      setIsSyncing(true);
      try {
        const entryArray = Object.entries(entriesToSync).map(([date, message]) => ({
          date,
          message,
        }));

        // Send data in chunks to avoid payload size limits
        const CHUNK_SIZE = 50;
        const chunks = [];
        for (let i = 0; i < entryArray.length; i += CHUNK_SIZE) {
          chunks.push(entryArray.slice(i, i + CHUNK_SIZE));
        }

        let allSuccessful = true;

        // Process chunks sequentially
        for (let i = 0; i < chunks.length; i++) {
          try {
            const response = await fetch('/api/import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                entries: chunks[i],
                chunkIndex: i,
                totalChunks: chunks.length
              }),
            });

            if (!response.ok) {
              console.error(`Sync failed for chunk ${i + 1}/${chunks.length}:`, response.statusText);
              allSuccessful = false;
            }
          } catch (error) {
            console.error(`Error syncing chunk ${i + 1}/${chunks.length} with server:`, error);
            allSuccessful = false;
          }
        }

        if (allSuccessful) {
          setLastSyncTime(Date.now());
        }
      } catch (error) {
        console.error('Error syncing with server:', error);
      } finally {
        setIsSyncing(false);
      }
    },
    [isSyncing]
  );

  return { syncWithServer, isSyncing, lastSyncTime };
}

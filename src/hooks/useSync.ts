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

        const response = await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries: entryArray }),
        });

        if (response.ok) {
          setLastSyncTime(Date.now());
        } else {
          console.error('Sync failed:', response.statusText);
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

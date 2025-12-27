import { useCallback } from 'react';

export interface Entry {
  date: string;
  message: string;
  timestamp: string; // ISO timestamp of when this entry was last modified
}

interface LastSync {
  id: string;
  timestamp: string;
}

const DB_NAME = 'JournalDB';
const STORE_NAME = 'entries';
const SYNC_STORE_NAME = 'sync';

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2); // Increment version for schema update

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create entries store with timestamp index
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const entriesStore = db.createObjectStore(STORE_NAME, { keyPath: 'date' });
        entriesStore.createIndex('timestamp', 'timestamp', { unique: false });
      } else if (event.oldVersion === 1) {
        // Upgrade existing entries to include timestamps
        const transaction = (event.target as IDBOpenDBRequest).transaction!;
        const entriesStore = transaction.objectStore(STORE_NAME);
        entriesStore.createIndex('timestamp', 'timestamp', { unique: false });
        
        // Add timestamps to existing entries
        entriesStore.getAll().onsuccess = (getAllEvent) => {
          const entries = (getAllEvent.target as IDBRequest).result as any[];
          const now = new Date().toISOString();
          entries.forEach(entry => {
            if (!entry.timestamp) {
              entry.timestamp = now;
              entriesStore.put(entry);
            }
          });
        };
      }
      
      // Create sync store for tracking last sync time
      if (!db.objectStoreNames.contains(SYNC_STORE_NAME)) {
        db.createObjectStore(SYNC_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export function useDB() {
  const loadEntries = useCallback(async (): Promise<Record<string, Entry>> => {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const entries = request.result as Entry[];
          const result: Record<string, Entry> = {};
          entries.forEach((entry) => {
            // Ensure backward compatibility by adding timestamp if missing
            if (!entry.timestamp) {
              entry.timestamp = new Date().toISOString();
            }
            result[entry.date] = entry;
          });
          resolve(result);
        };
      });
    } catch (error) {
      console.error('Error loading entries from IndexedDB:', error);
      return {};
    }
  }, []);

  const getLastSyncTime = useCallback(async (): Promise<string | null> => {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([SYNC_STORE_NAME], 'readonly');
        const store = transaction.objectStore(SYNC_STORE_NAME);
        const request = store.get('lastSync');

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const result = request.result as LastSync | undefined;
          resolve(result?.timestamp || null);
        };
      });
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  }, []);

  const setLastSyncTime = useCallback(async (timestamp: string): Promise<void> => {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([SYNC_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(SYNC_STORE_NAME);
        const request = store.put({ id: 'lastSync', timestamp });

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('Error setting last sync time:', error);
    }
  }, []);

  const getEntriesModifiedSince = useCallback(async (since: string): Promise<Entry[]> => {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('timestamp');
        const range = IDBKeyRange.lowerBound(since, true); // exclusive of 'since'
        const request = index.getAll(range);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          resolve(request.result as Entry[]);
        };
      });
    } catch (error) {
      console.error('Error getting modified entries:', error);
      return [];
    }
  }, []);

  const saveEntry = useCallback(async (date: string, message: string): Promise<Entry> => {
    const timestamp = new Date().toISOString();
    const entry: Entry = { date, message, timestamp };
    
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(entry);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(entry);
      });
    } catch (error) {
      console.error('Error saving entry to IndexedDB:', error);
      throw error;
    }
  }, []);

  const saveEntries = useCallback(async (entries: Entry[]): Promise<void> => {
    try {
      const db = await getDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      for (const entry of entries) {
        store.put(entry);
      }
      
      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('Error saving entries to IndexedDB:', error);
      throw error;
    }
  }, []);

  const deleteEntry = useCallback(async (date: string): Promise<Entry> => {
    const timestamp = new Date().toISOString();
    // Store a tombstone record with empty message to track deletion
    const tombstone: Entry = { date, message: '', timestamp };
    
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(tombstone);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(tombstone);
      });
    } catch (error) {
      console.error('Error deleting entry from IndexedDB:', error);
      throw error;
    }
  }, []);

  const exportData = useCallback(async (): Promise<Entry[]> => {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          resolve(request.result as Entry[]);
        };
      });
    } catch (error) {
      console.error('Error exporting entries:', error);
      return [];
    }
  }, []);

  const importData = useCallback(
    async (data: Entry[]): Promise<Record<string, string>> => {
      try {
        const db = await getDB();
        const result: Record<string, string> = {};

        for (const entry of data) {
          await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(entry);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              result[entry.date] = entry.message;
              resolve();
            };
          });
        }

        // Send data to server in chunks to avoid payload size limits
        const CHUNK_SIZE = 50;
        const chunks = [];
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
          chunks.push(data.slice(i, i + CHUNK_SIZE));
        }

        // Process chunks sequentially to avoid overwhelming the server
        for (let i = 0; i < chunks.length; i++) {
          try {
            await fetch('/api/import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                entries: chunks[i],
                chunkIndex: i,
                totalChunks: chunks.length
              }),
            });
          } catch (error) {
            console.error(`Error syncing chunk ${i + 1}/${chunks.length} to server:`, error);
          }
        }

        return result;
      } catch (error) {
        console.error('Error importing entries:', error);
        return {};
      }
    },
    []
  );

  return { 
    loadEntries, 
    saveEntry, 
    saveEntries,
    deleteEntry, 
    exportData, 
    importData,
    getLastSyncTime,
    setLastSyncTime,
    getEntriesModifiedSince
  };
}

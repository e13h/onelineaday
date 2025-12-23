import { useCallback } from 'react';

interface Entry {
  date: string;
  message: string;
}

const DB_NAME = 'JournalDB';
const STORE_NAME = 'entries';

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'date' });
      }
    };
  });
}

export function useDB() {
  const loadEntries = useCallback(async (): Promise<Record<string, string>> => {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const entries = request.result as Entry[];
          const result: Record<string, string> = {};
          entries.forEach((entry) => {
            result[entry.date] = entry.message;
          });
          resolve(result);
        };
      });
    } catch (error) {
      console.error('Error loading entries from IndexedDB:', error);
      return {};
    }
  }, []);

  const saveEntry = useCallback(async (date: string, message: string): Promise<void> => {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put({ date, message });

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          fetch('/api/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, message }),
          }).catch((error) => console.error('Error syncing to server:', error));

          resolve();
        };
      });
    } catch (error) {
      console.error('Error saving entry to IndexedDB:', error);
    }
  }, []);

  const deleteEntry = useCallback(async (date: string): Promise<void> => {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(date);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          fetch(`/api/entries/${date}`, { method: 'DELETE' }).catch((error) =>
            console.error('Error syncing deletion to server:', error)
          );

          resolve();
        };
      });
    } catch (error) {
      console.error('Error deleting entry from IndexedDB:', error);
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

        fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries: data }),
        }).catch((error) => console.error('Error syncing import to server:', error));

        return result;
      } catch (error) {
        console.error('Error importing entries:', error);
        return {};
      }
    },
    []
  );

  return { loadEntries, saveEntry, deleteEntry, exportData, importData };
}

/**
 * Client-Side IndexedDB Storage for Medical Document Scans & Original Files
 * 
 * Bypasses the 5MB browser localStorage quota, enabling instant offline access,
 * cross-tab loading, and high-fidelity rendering of prescription & lab scans.
 */

const DB_NAME = 'prescriptime_file_db';
const DB_VERSION = 1;
const STORE_NAME = 'document_files';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB not supported or running on server'));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

export async function saveStoredFile(id: string, fileData: string): Promise<void> {
  if (!id || !fileData) return;
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({
        id,
        fileData,
        updatedAt: new Date().toISOString(),
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to save file to IndexedDB:', err);
  }
}

export async function getStoredFile(id: string): Promise<string | null> {
  if (!id) return null;
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.fileData : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to retrieve file from IndexedDB:', err);
    return null;
  }
}

export async function deleteStoredFile(id: string): Promise<void> {
  if (!id) return;
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to delete file from IndexedDB:', err);
  }
}

import { Book } from '../types';

const DB_NAME = 'ChronosDB';
const STORE_NAME = 'books';
const DB_VERSION = 1;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject('IndexedDB error');

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };
  });
};

export const saveBookToDB = async (book: Book): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(book);

      request.onsuccess = () => resolve();
      request.onerror = () => reject('Error saving book');
    });
  } catch (e) {
    console.error("Failed to save to DB", e);
  }
};

export const updateBookInDB = async (book: Book): Promise<void> => {
    return saveBookToDB(book); // put() updates if key exists
};

export const getAllBooksFromDB = async (): Promise<Book[]> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const books = request.result as Book[];
        // Sort by newer first
        books.sort((a, b) => b.createdAt - a.createdAt);
        resolve(books);
      };
      request.onerror = () => reject('Error fetching books');
    });
  } catch (e) {
    console.error("Failed to load from DB", e);
    return [];
  }
};

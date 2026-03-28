const DB_NAME = 'toddo-planner-db';
const DB_VERSION = 1;
const STORE_NAME = 'planner_kv';
const TASKS_KEY = 'tasks';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

function readRecord(key) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDatabase();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };

      tx.oncomplete = () => {
        db.close();
      };
    } catch (error) {
      reject(error);
    }
  });
}

function writeRecord(key, value) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDatabase();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      store.put({ key, value });

      tx.oncomplete = () => {
        db.close();
        resolve();
      };

      tx.onerror = () => {
        reject(tx.error);
      };
    } catch (error) {
      reject(error);
    }
  });
}

export async function loadTasksFromDb() {
  const record = await readRecord(TASKS_KEY);
  if (!record || !Array.isArray(record.value)) {
    return [];
  }
  return record.value;
}

export async function saveTasksToDb(tasks) {
  await writeRecord(TASKS_KEY, tasks);
}

export async function migrateLocalStorageToDb(legacyKey) {
  const legacyData = localStorage.getItem(legacyKey);
  if (!legacyData) {
    return [];
  }

  try {
    const parsed = JSON.parse(legacyData);
    const tasks = Array.isArray(parsed) ? parsed : [];
    if (tasks.length) {
      await saveTasksToDb(tasks);
    }
    localStorage.removeItem(legacyKey);
    return tasks;
  } catch {
    return [];
  }
}

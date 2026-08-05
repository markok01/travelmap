const DB_NAME = "travelmap-offline";
const DB_VERSION = 1;
const STORE = "snapshots";

export type OfflineSnapshotKey = "dashboard" | "map" | "trips";

export type OfflineSnapshot<T = unknown> = {
  key: OfflineSnapshotKey;
  savedAt: string;
  payload: T;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

export async function saveOfflineSnapshot<T>(
  key: OfflineSnapshotKey,
  payload: T,
): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({
        key,
        savedAt: new Date().toISOString(),
        payload,
      } satisfies OfflineSnapshot<T>);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("snapshot write failed"));
    });
    db.close();
  } catch {
    /* ignore quota / private mode */
  }
}

export async function readOfflineSnapshot<T>(
  key: OfflineSnapshotKey,
): Promise<OfflineSnapshot<T> | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await openDb();
    const result = await new Promise<OfflineSnapshot<T> | null>(
      (resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(key);
        req.onsuccess = () =>
          resolve((req.result as OfflineSnapshot<T> | undefined) ?? null);
        req.onerror = () =>
          reject(req.error ?? new Error("snapshot read failed"));
      },
    );
    db.close();
    return result;
  } catch {
    return null;
  }
}

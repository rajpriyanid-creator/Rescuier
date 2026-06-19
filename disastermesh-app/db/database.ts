import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const openDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('disastermesh.db');
  await initSchema(db);
  return db;
};

const initSchema = async (database: SQLite.SQLiteDatabase) => {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS offline_sos (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS offline_location (
      id TEXT PRIMARY KEY,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      status TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS cached_alerts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL,
      sentAt INTEGER NOT NULL,
      read INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS cached_messages (
      id TEXT PRIMARY KEY,
      cityId TEXT NOT NULL,
      senderName TEXT NOT NULL,
      senderDisasterId TEXT NOT NULL,
      type TEXT NOT NULL,
      text TEXT,
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vault_items (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      encryptedData TEXT NOT NULL,
      iv TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `);
};

// ─── Offline SOS ──────────────────────────────────────────────────────────────
export const saveOfflineSOS = async (id: string, payload: object) => {
  const db = await openDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO offline_sos (id, payload, createdAt) VALUES (?, ?, ?)',
    [id, JSON.stringify(payload), Date.now()]
  );
};

export const getPendingOfflineSOS = async () => {
  const db = await openDatabase();
  return db.getAllAsync<{ id: string; payload: string; createdAt: number }>(
    'SELECT * FROM offline_sos WHERE synced = 0 ORDER BY createdAt ASC'
  );
};

export const markSOSSynced = async (id: string) => {
  const db = await openDatabase();
  await db.runAsync('UPDATE offline_sos SET synced = 1 WHERE id = ?', [id]);
};

// ─── Cached Alerts ────────────────────────────────────────────────────────────
export const cacheAlert = async (alert: {
  id: string; title: string; message: string; severity: string; sentAt: number;
}) => {
  const db = await openDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO cached_alerts (id, title, message, severity, sentAt) VALUES (?, ?, ?, ?, ?)',
    [alert.id, alert.title, alert.message, alert.severity, alert.sentAt]
  );
};

export const getCachedAlerts = async () => {
  const db = await openDatabase();
  return db.getAllAsync<any>('SELECT * FROM cached_alerts ORDER BY sentAt DESC LIMIT 50');
};

export const markAlertRead = async (id: string) => {
  const db = await openDatabase();
  await db.runAsync('UPDATE cached_alerts SET read = 1 WHERE id = ?', [id]);
};

// ─── Vault Items ──────────────────────────────────────────────────────────────
export const saveVaultItem = async (
  id: string, category: string, encryptedData: string, iv: string
) => {
  const db = await openDatabase();
  const now = Date.now();
  await db.runAsync(
    'INSERT OR REPLACE INTO vault_items (id, category, encryptedData, iv, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
    [id, category, encryptedData, iv, now, now]
  );
};

export const getVaultItems = async (category?: string) => {
  const db = await openDatabase();
  if (category) {
    return db.getAllAsync<any>('SELECT * FROM vault_items WHERE category = ? ORDER BY updatedAt DESC', [category]);
  }
  return db.getAllAsync<any>('SELECT * FROM vault_items ORDER BY updatedAt DESC');
};

export const deleteVaultItem = async (id: string) => {
  const db = await openDatabase();
  await db.runAsync('DELETE FROM vault_items WHERE id = ?', [id]);
};

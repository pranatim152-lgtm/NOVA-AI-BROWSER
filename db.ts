import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import type { Bookmark, HistoryEntry, DownloadEntry } from '../shared/types';

let db: Database.Database;

export function initDatabase(userDataPath: string): void {
  fs.mkdirSync(userDataPath, { recursive: true });
  db = new Database(path.join(userDataPath, 'nova-browser.sqlite'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      folder TEXT NOT NULL DEFAULT 'Bookmarks bar',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      visited_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_history_visited ON history(visited_at DESC);
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS secrets (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS downloads (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      url TEXT NOT NULL,
      path TEXT NOT NULL,
      state TEXT NOT NULL,
      received_bytes INTEGER NOT NULL DEFAULT 0,
      total_bytes INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function ready(): Database.Database {
  if (!db) throw new Error('Local database has not been initialized.');
  return db;
}

export function listBookmarks(): Bookmark[] {
  return ready().prepare(`SELECT id, title, url, folder, created_at AS createdAt FROM bookmarks ORDER BY folder, title`).all() as Bookmark[];
}

export function addBookmark(title: string, url: string): void {
  ready().prepare(`INSERT INTO bookmarks(title, url) VALUES(?, ?) ON CONFLICT(url) DO UPDATE SET title=excluded.title`).run(title.slice(0, 500), url);
}

export function removeBookmark(id: number): void {
  ready().prepare('DELETE FROM bookmarks WHERE id = ?').run(id);
}

export function hasBookmark(url: string): boolean {
  return Boolean(ready().prepare('SELECT 1 FROM bookmarks WHERE url = ?').get(url));
}

export function addHistory(title: string, url: string): void {
  if (!/^https?:\/\//i.test(url)) return;
  ready().prepare('INSERT INTO history(title, url) VALUES(?, ?)').run((title || url).slice(0, 500), url.slice(0, 4000));
  ready().prepare(`DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY visited_at DESC LIMIT 10000)`).run();
}

export function listHistory(limit = 100): HistoryEntry[] {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 1000);
  return ready().prepare(`SELECT id, title, url, visited_at AS visitedAt FROM history ORDER BY visited_at DESC LIMIT ?`).all(safeLimit) as HistoryEntry[];
}

export function clearHistory(): void {
  ready().prepare('DELETE FROM history').run();
}

export function getSetting(key: string): string | null {
  const row = ready().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  ready().prepare('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, value);
}

export function getSecret(key: string): string | null {
  const row = ready().prepare('SELECT value FROM secrets WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSecret(key: string, encryptedValue: string | null): void {
  if (encryptedValue === null) {
    ready().prepare('DELETE FROM secrets WHERE key = ?').run(key);
  } else {
    ready().prepare('INSERT INTO secrets(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, encryptedValue);
  }
}

export function saveDownload(download: DownloadEntry): void {
  ready().prepare(`INSERT INTO downloads(id, filename, url, path, state, received_bytes, total_bytes, updated_at)
    VALUES(@id, @filename, @url, @path, @state, @receivedBytes, @totalBytes, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET filename=excluded.filename, url=excluded.url, path=excluded.path,
    state=excluded.state, received_bytes=excluded.received_bytes, total_bytes=excluded.total_bytes, updated_at=CURRENT_TIMESTAMP`).run(download);
}

export function listDownloads(): DownloadEntry[] {
  return ready().prepare(`SELECT id, filename, url, path, state, received_bytes AS receivedBytes,
    total_bytes AS totalBytes FROM downloads ORDER BY updated_at DESC LIMIT 200`).all() as DownloadEntry[];
}

export function clearBrowsingData(): void {
  const database = ready();
  const transaction = database.transaction(() => {
    database.prepare('DELETE FROM history').run();
    database.prepare('DELETE FROM downloads').run();
  });
  transaction();
}

export function closeDatabase(): void {
  if (db?.open) db.close();
}

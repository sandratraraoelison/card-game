import { DatabaseSync } from 'node:sqlite';
import { INITIAL_CREDITS } from '@rami/game';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { RoomRepository, SessionRepository } from '../application/ports';
import { ApplicationError, type RoomRecord, type SessionRecord } from '../domain/models';

export class SqliteStore {
  readonly db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, payload TEXT NOT NULL, expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS rooms_updated ON rooms(updated_at);`);
    this.db.exec('CREATE TABLE IF NOT EXISTS wallets (player_id TEXT PRIMARY KEY, balance INTEGER NOT NULL CHECK(balance >= 0))');
  }
  onModuleDestroy() { this.db.close(); }
}
const oldest = () => Date.now() - 7 * 86400000;
export class SqliteSessions implements SessionRepository {
  constructor(private readonly store: SqliteStore) {}
  balance(playerId: string): number { return new SqliteRooms(this.store).balance(playerId); }
  save(session: SessionRecord) {
    this.store.db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
    this.store.db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(session.tokenHash, JSON.stringify(session), session.expiresAt);
  }
  find(hash: string): SessionRecord | undefined {
    const row = this.store.db.prepare('SELECT payload FROM sessions WHERE hash = ?').get(hash);
    return row ? JSON.parse(String(row.payload)) : undefined;
  }
}
export class SqliteRooms implements RoomRepository {
  constructor(private readonly store: SqliteStore) {}
  remove(id: string) { this.store.db.prepare('DELETE FROM rooms WHERE id = ?').run(id); }
  balance(playerId: string): number {
    const row = this.store.db.prepare('SELECT balance FROM wallets WHERE player_id = ?').get(playerId);
    return row ? Number(row.balance) : INITIAL_CREDITS;
  }
  adjustBalance(playerId: string, amount: number) {
    const balance = this.balance(playerId) + amount;
    if (!Number.isSafeInteger(balance) || balance < 0) throw new ApplicationError(409, 'Solde fictif insuffisant pour cette mise.');
    this.store.db.prepare('INSERT INTO wallets VALUES (?, ?) ON CONFLICT(player_id) DO UPDATE SET balance = excluded.balance').run(playerId, balance);
  }
  create(room: RoomRecord) {
    this.store.db.prepare('DELETE FROM rooms WHERE updated_at < ?').run(oldest());
    this.store.db.prepare('INSERT INTO rooms VALUES (?, ?, ?)').run(room.id, JSON.stringify(room), room.updatedAt);
  }
  find(id: string): RoomRecord | undefined {
    const row = this.store.db.prepare('SELECT payload FROM rooms WHERE id = ? AND updated_at >= ?').get(id, oldest());
    return row ? JSON.parse(String(row.payload)) : undefined;
  }
  list(): RoomRecord[] {
    return this.store.db.prepare('SELECT payload FROM rooms WHERE updated_at >= ? ORDER BY updated_at DESC LIMIT 100').all(oldest()).map(row => JSON.parse(String(row.payload)));
  }
  transact<T>(id: string, work: (room: RoomRecord) => T): T {
    this.store.db.exec('BEGIN IMMEDIATE');
    try {
      const room = this.find(id);
      if (!room) throw new ApplicationError(404, 'Salon introuvable ou expiré.');
      const result = work(room);
      room.revision = (room.revision ?? 0) + 1;
      this.store.db.prepare('UPDATE rooms SET payload = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(room), room.updatedAt, id);
      this.store.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.store.db.exec('ROLLBACK');
      throw error;
    }
  }
}

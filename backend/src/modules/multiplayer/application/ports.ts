import type { RoomRecord, SessionRecord } from '../domain/models';

export interface SessionRepository {
  balance(playerId: string): number;
  save(session: SessionRecord): void;
  find(tokenHash: string): SessionRecord | undefined;
}
export interface RoomRepository {
  balance(playerId: string): number;
  adjustBalance(playerId: string, amount: number): void;
  create(room: RoomRecord): void;
  find(id: string): RoomRecord | undefined;
  list(): RoomRecord[];
  /** Work, room revision increment and commit are synchronous/atomic; throwing rolls back. */
  transact<T>(id: string, work: (room: RoomRecord) => T): T;
}
export interface IdentitySource { id(): string; roomCode(): string; token(): string; hash(value: string): string }
export interface Clock { now(): number }

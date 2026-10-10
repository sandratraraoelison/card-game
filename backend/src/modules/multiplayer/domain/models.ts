import type { CommandResult, GameState, PlayerAccount } from '@rami/game';

export interface SessionRecord { tokenHash: string; player: PlayerAccount; expiresAt: number }
export interface RoomRecord {
  stake?: number;
  pot?: number;
  carryover?: number;
  roundCarryover?: number;
  finishCarryover?: number;
  roundFinishCarryover?: number;
  exposureWinnerId?: string;
  settledGameId?: string;
  readyPlayerIds?: string[];
  lastReadyGameId?: string;
  revision: number;
  id: string;
  name: string;
  capacity: 4 | 5;
  hostId: string;
  members: PlayerAccount[];
  game?: GameState;
  receipts: Record<string, { fingerprint: string; result: CommandResult }>;
  updatedAt: number;
}
export class ApplicationError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

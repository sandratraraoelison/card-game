import type { CommandEnvelope, CommandResult, GameView, PlayerAccount, RoomSummary } from './types';

export interface GuestSession {
  token: string;
  player: PlayerAccount;
}
export interface RoomView extends RoomSummary {
  revision: number;
  hostId: string;
  members: PlayerAccount[];
  game?: GameView;
}

export interface SavedOnlineSession { session: GuestSession; roomId?: string }
export interface LobbyService {
  restore(): SavedOnlineSession | undefined;
  forget(): void;
  login(name: string): Promise<GuestSession>;
  list(): Promise<RoomSummary[]>;
  get(id: string): Promise<RoomView>;
  create(name: string, capacity: 4 | 5): Promise<RoomView>;
  join(id: string): Promise<RoomView>;
  leave(id: string): Promise<void>;
  start(id: string): Promise<RoomView>;
  command(id: string, command: CommandEnvelope): Promise<{ result: CommandResult; room: RoomView }>;
}
export class NetworkError extends Error {
  constructor(message: string, readonly status = 0) { super(message); }
}

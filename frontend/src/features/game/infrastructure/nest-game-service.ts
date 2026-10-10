import type { CommandEnvelope, GameService, GameView, RoomView } from '@rami/game';
import { NetworkError, type LobbyService } from '@rami/game';

/** HTTP adapter; only the server changes the game. Polling belongs to the lobby lifecycle. */
export class NestGameService implements GameService {
  readonly mode = 'remote' as const;
  private listeners = new Set<() => void>();
  private disposed = false;
  constructor(readonly playerId: string, private snapshot: GameView, private readonly roomId: string,
    private readonly lobby: LobbyService, private readonly onRoom: (room: RoomView) => void) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  receive(snapshot: GameView) {
    if (this.disposed || snapshot.id !== this.snapshot.id || snapshot.revision <= this.snapshot.revision) return;
    this.snapshot = snapshot;
    this.listeners.forEach(listener => listener());
  }
  dispatch = async (command: CommandEnvelope) => {
    if (this.disposed) return { ok: false as const, error: 'Cette session est fermée.' };
    // A lost acknowledgement is retried with the SAME ID; the server deduplicates it.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await this.lobby.command(this.roomId, command);
        if (!this.disposed) {
          if (response.room.game) this.receive(response.room.game);
          this.onRoom(response.room);
        }
        return response.result;
      } catch (error) {
        if (this.disposed || !(error instanceof NetworkError) || error.status !== 0 || attempt === 1)
          return { ok: false as const, error: error instanceof Error ? error.message : 'Commande non confirmée.' };
      }
    }
    return { ok: false as const, error: 'Commande non confirmée.' };
  };
  dispose() { this.disposed = true; this.listeners.clear(); }
}

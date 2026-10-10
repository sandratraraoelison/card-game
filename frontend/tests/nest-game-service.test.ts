import { describe, expect, it, vi } from 'vitest';
import { createGame, NetworkError, toGameView, type CommandEnvelope, type LobbyService, type RoomView } from '@rami/game';
import { NestGameService } from '../src/features/game/infrastructure/nest-game-service';

function fixture() {
  const game = createGame(4, false, () => 0.999999);
  game.mode = 'remote';
  const snapshot = toGameView(game, 'p0');
  const room: RoomView = { id: 'room', revision: 1, name: 'Table', capacity: 4, playerCount: 4, status: 'playing', hostId: 'p0', members: [], game: { ...snapshot, revision: 1 } };
  const command: CommandEnvelope = { gameId: game.id, playerId: 'p0', commandId: 'retry-id', expectedRevision: 0, command: { type: 'draw', source: 'stock' } };
  return { snapshot, room, command };
}
describe('network game adapter', () => {
  it('refreshes a rejected stale action after another player arranges their hand', async () => {
    const { snapshot, room, command } = fixture();
    const dispatch = vi.fn().mockResolvedValueOnce({ result: { ok: false, error: 'La partie a changé. Réessayez avec son état actuel.' }, room }).mockResolvedValueOnce({ result: { ok: true }, room: { ...room, game: { ...room.game, revision: 2 } } });
    const service = new NestGameService('p0', snapshot, room.id, { command: dispatch } as unknown as LobbyService, vi.fn());
    expect(await service.dispatch(command)).toEqual({ ok: true });
    expect(dispatch.mock.calls[1][1].expectedRevision).toBe(1);
    expect(dispatch.mock.calls[1][1].commandId).not.toBe(command.commandId);
    expect(service.getSnapshot().revision).toBe(2);
  });
  it('retries a lost acknowledgement with the same command and applies only newer revisions', async () => {
    const { snapshot, room, command } = fixture();
    const dispatch = vi.fn().mockRejectedValueOnce(new NetworkError('Offline')).mockResolvedValueOnce({ result: { ok: true }, room });
    const onRoom = vi.fn();
    const service = new NestGameService('p0', snapshot, room.id, { command: dispatch } as unknown as LobbyService, onRoom);
    expect(await service.dispatch(command)).toEqual({ ok: true });
    expect(dispatch).toHaveBeenNthCalledWith(1, room.id, command);
    expect(dispatch).toHaveBeenNthCalledWith(2, room.id, command);
    expect(service.getSnapshot().revision).toBe(1);
    service.receive(snapshot);
    service.receive({ ...snapshot, id: 'another-game', revision: 5 });
    expect(service.getSnapshot().revision).toBe(1);
    expect(onRoom).toHaveBeenCalledOnce();
    service.dispose();
  });
  it('does not retry forbidden requests or update a disposed table', async () => {
    const { snapshot, room, command } = fixture();
    const dispatch = vi.fn().mockRejectedValue(new NetworkError('Session expirée', 401));
    const onRoom = vi.fn();
    const service = new NestGameService('p0', snapshot, room.id, { command: dispatch } as unknown as LobbyService, onRoom);
    expect(await service.dispatch(command)).toEqual({ ok: false, error: 'Session expirée' });
    expect(dispatch).toHaveBeenCalledOnce();
    service.dispose();
    service.receive(room.game!);
    expect(service.getSnapshot()).toBe(snapshot);
    expect((await service.dispatch(command)).ok).toBe(false);
    expect(dispatch).toHaveBeenCalledOnce();
    expect(onRoom).not.toHaveBeenCalled();
  });
});

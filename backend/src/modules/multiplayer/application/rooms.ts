import { toGameView, type PlayerAccount, type RoomSummary, type RoomView } from '@rami/game';
import { ApplicationError, type RoomRecord } from '../domain/models';
import type { Clock, IdentitySource, RoomRepository } from './ports';

export function requireMember(room: RoomRecord, playerId: string) {
  if (!room.members.some(p => p.id === playerId)) throw new ApplicationError(403, 'Vous ne faites pas partie de ce salon.');
}
export function summary(room: RoomRecord): RoomSummary {
  return { id: room.id, name: room.name, capacity: room.capacity, playerCount: room.members.length, status: room.game ? 'playing' : 'waiting' };
}
export class Rooms {
  constructor(private readonly repository: RoomRepository, private readonly identity: IdentitySource, private readonly clock: Clock) {}
  list(): RoomSummary[] { return this.repository.list().filter(r => !r.game).map(summary); }
  create(player: PlayerAccount, name: string, capacity: 4 | 5): RoomView {
    const room: RoomRecord = { id: this.identity.id(), revision: 0, name, capacity, hostId: player.id, members: [player], receipts: {}, updatedAt: this.clock.now() };
    this.repository.create(room);
    return this.view(room.id, player.id);
  }
  view(id: string, playerId: string): RoomView {
    const room = this.repository.find(id);
    if (!room) throw new ApplicationError(404, 'Salon introuvable ou expiré.');
    requireMember(room, playerId);
    return { ...summary(room), revision: room.revision, hostId: room.hostId, members: room.members, ...(room.game ? { game: toGameView(room.game, playerId) } : {}) };
  }
  join(id: string, player: PlayerAccount): RoomView {
    this.repository.transact(id, room => {
      if (room.members.some(p => p.id === player.id)) return;
      if (room.game || room.members.length >= room.capacity) throw new ApplicationError(409, 'Salon complet ou partie déjà commencée.');
      room.members.push(player);
      if (!room.hostId) room.hostId = player.id;
      room.updatedAt = this.clock.now();
    });
    return this.view(id, player.id);
  }
  leave(id: string, playerId: string): void {
    this.repository.transact(id, room => {
      requireMember(room, playerId);
      if (room.game && room.game.phase !== 'finished') throw new ApplicationError(409, 'La manche est en cours. Votre place reste réservée pour la reconnexion.');
      if (room.game) { room.game = undefined; room.receipts = {}; }
      room.members = room.members.filter(p => p.id !== playerId);
      if (room.hostId === playerId) room.hostId = room.members[0]?.id ?? '';
      room.updatedAt = this.clock.now();
    });
  }
}

import { isValidStake, refundRoom, roundPrizes, toGameView, type PlayerAccount, type RoomSummary, type RoomView } from '@rami/game';
import { ApplicationError, type RoomRecord } from '../domain/models';
import type { Clock, IdentitySource, RoomRepository } from './ports';

export function requireMember(room: RoomRecord, playerId: string) {
  if (!room.members.some(p => p.id === playerId)) throw new ApplicationError(403, 'Vous ne faites pas partie de ce salon.');
}
export function summary(room: RoomRecord): RoomSummary {
  return { id: room.id, name: room.name, stake: room.stake ?? 0, pot: room.pot ?? 0, carryover: room.carryover ?? 0, finishCarryover: room.finishCarryover ?? 0, exposureWinnerId: room.exposureWinnerId, ...roundPrizes(room.capacity, room.stake ?? 0, room.game ? room.roundCarryover ?? 0 : room.carryover ?? 0, room.game ? room.roundFinishCarryover ?? 0 : room.finishCarryover ?? 0), capacity: room.capacity, playerCount: room.members.length, status: room.game ? 'playing' : 'waiting' };
}
export class Rooms {
  constructor(private readonly repository: RoomRepository, private readonly identity: IdentitySource, private readonly clock: Clock) {}
  list(): RoomSummary[] { return this.repository.list().filter(r => !r.game).map(summary); }
  create(player: PlayerAccount, name: string, capacity: 4 | 5, stake = 0): RoomView {
    if (!isValidStake(stake)) throw new ApplicationError(400, 'La mise doit être un entier entre 0 et 100 000 Ar.');
    if (this.repository.balance(player.id) < stake) throw new ApplicationError(409, 'Solde fictif insuffisant pour cette mise.');
    let id = '';
    for (let attempt = 0; attempt < 100; attempt++) {
      const candidate = this.identity.roomCode();
      if (!this.repository.find(candidate)) { id = candidate; break; }
    }
    if (!id) throw new ApplicationError(503, 'Impossible de créer un code de salon. Réessayez.');
    const room: RoomRecord = { id, stake, pot: 0, revision: 0, name, capacity, hostId: player.id, members: [player], receipts: {}, updatedAt: this.clock.now() };
    this.repository.create(room);
    return this.view(room.id, player.id);
  }
  view(id: string, playerId: string): RoomView {
    const room = this.repository.find(id);
    if (!room) throw new ApplicationError(404, 'Salon introuvable ou expiré.');
    requireMember(room, playerId);
    return { ...summary(room), readyPlayerIds: room.readyPlayerIds ?? [], revision: room.revision, hostId: room.hostId, members: room.members.map(player => ({ ...player, balance: this.repository.balance(player.id) })), ...(room.game ? { game: toGameView(room.game, playerId) } : {}) };
  }
  join(id: string, player: PlayerAccount): RoomView {
    this.repository.transact(id, room => {
      if (room.members.some(p => p.id === player.id)) return;
      if (this.repository.balance(player.id) < (room.stake ?? 0)) throw new ApplicationError(409, 'Solde fictif insuffisant pour cette mise.');
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
      if (room.game) { room.game = undefined; room.receipts = {}; room.pot = 0; room.exposureWinnerId = undefined; room.roundCarryover = undefined; room.roundFinishCarryover = undefined; room.readyPlayerIds = []; }
      room.members = room.members.filter(p => p.id !== playerId);
      if (room.hostId === playerId) room.hostId = room.members[0]?.id ?? '';
      room.updatedAt = this.clock.now();
    });
  }
  close(id: string, playerId: string): void {
    this.repository.transact(id, room => {
      if (room.hostId !== playerId) throw new ApplicationError(403, 'Seul l’hôte peut terminer le salon.');
      const active = room.game && room.game.phase !== 'finished';
      const amount = active ? (room.pot ?? 0) + (room.roundCarryover ?? 0) + (room.roundFinishCarryover ?? 0) : (room.carryover ?? 0) + (room.finishCarryover ?? 0);
      for (const payment of refundRoom(room.members.map(member => member.id), amount)) this.repository.adjustBalance(payment.playerId, payment.amount);
      this.repository.remove(id);
    });
  }
}

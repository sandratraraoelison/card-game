import { applyCommand, createGame, includesValidExposure, settlePot, toGameView, type CommandEnvelope, type CommandResult } from '@rami/game';
import { ApplicationError, type RoomRecord } from '../domain/models';
import type { Clock, IdentitySource, RoomRepository } from './ports';
import { requireMember } from './rooms';

export class Games {
  constructor(private readonly repository: RoomRepository, private readonly identity: IdentitySource, private readonly clock: Clock, private readonly random: () => number) {}
  start(roomId: string, playerId: string): void {
    this.repository.transact(roomId, room => {
      requireMember(room, playerId);
      if (room.hostId !== playerId) throw new ApplicationError(403, 'Seul l’hôte peut démarrer une manche.');
      if (room.members.length !== room.capacity) throw new ApplicationError(409, `Il faut exactement ${room.capacity} joueurs.`);
      if (room.game && room.game.phase !== 'finished') throw new ApplicationError(409, 'La manche est déjà en cours.');
      if (room.game) throw new ApplicationError(409, 'Tous les joueurs doivent être prêts pour la prochaine manche.');
      this.begin(room);
    });
  }
  private begin(room: RoomRecord) {
    for (const member of room.members) this.repository.adjustBalance(member.id, -(room.stake ?? 0));
    room.readyPlayerIds = [];
    room.pot = (room.stake ?? 0) * room.members.length;
    room.roundCarryover = room.carryover ?? 0;
    room.roundFinishCarryover = room.finishCarryover ?? 0;
    room.exposureWinnerId = undefined;
    room.settledGameId = undefined;
    const game = createGame(room.capacity, false, this.random);
    game.mode = 'remote';
    if (game.result?.playerId) {
      const winnerIndex = game.players.findIndex(player => player.id === game.result?.playerId);
      const originalReason = game.result.reason;
      game.result.reason = game.result.reason.replace(game.players[winnerIndex].name, room.members[winnerIndex].displayName);
      game.log = game.log.map(entry => entry === originalReason ? game.result!.reason : entry);
      game.result.playerId = room.members[winnerIndex].id;
    }
    game.players = game.players.map((p, i) => ({ ...p, id: room.members[i].id, name: room.members[i].displayName, simulated: false }));
    room.game = game;
    this.settle(room);
    room.receipts = {};
    room.updatedAt = this.clock.now();
  }
  ready(roomId: string, playerId: string, gameId: string): void {
    this.repository.transact(roomId, room => {
      requireMember(room, playerId);
      if (room.game?.id !== gameId) {
        if (room.lastReadyGameId === gameId) return;
        throw new ApplicationError(409, 'Cette manche a changé.');
      }
      if (room.game.phase !== 'finished') throw new ApplicationError(409, 'La manche est encore en cours.');
      if (this.repository.balance(playerId) < (room.stake ?? 0)) throw new ApplicationError(409, 'Solde fictif insuffisant pour la prochaine mise.');
      room.readyPlayerIds = [...new Set([...(room.readyPlayerIds ?? []), playerId])];
      room.updatedAt = this.clock.now();
      if (room.members.length === room.capacity && room.members.every(member => room.readyPlayerIds!.includes(member.id))) {
        this.begin(room);
        room.lastReadyGameId = gameId;
      }
    });
  }
  private settle(room: RoomRecord) {
    const game = room.game;
    if (!game || game.phase !== 'finished' || room.settledGameId === game.id) return;
    const winner = game.players.find(player => player.id === game.result?.playerId);
    if (!room.exposureWinnerId && winner && includesValidExposure(winner.hand, winner.melds, game.reference, game.rules)) room.exposureWinnerId = winner.id;
    const settlement = settlePot(room.members.map(member => member.id), room.stake ?? 0, game.result?.playerId, room.exposureWinnerId, room.roundCarryover ?? 0, room.roundFinishCarryover ?? 0, game.result?.victory ? game.result.playerId : undefined);
    for (const payment of settlement.payments) this.repository.adjustBalance(payment.playerId, payment.amount);
    room.carryover = settlement.carryover;
    room.finishCarryover = settlement.finishCarryover;
    room.settledGameId = game.id;
  }
  command(roomId: string, playerId: string, envelope: CommandEnvelope): CommandResult {
    return this.repository.transact(roomId, room => {
      requireMember(room, playerId);
      if (envelope.playerId !== playerId) throw new ApplicationError(403, 'Identité de commande incorrecte.');
      if (!room.game || envelope.gameId !== room.game.id) throw new ApplicationError(409, 'Cette manche n’est plus active.');
      const key = `${playerId}:${envelope.commandId}`;
      const fingerprint = this.identity.hash(JSON.stringify(envelope));
      const receipt = room.receipts[key];
      if (receipt) {
        if (receipt.fingerprint !== fingerprint) throw new ApplicationError(409, 'Identifiant de commande déjà utilisé avec un autre contenu.');
        return receipt.result;
      }
      const applied = applyCommand(room.game, { ...envelope, playerId });
      room.game = applied.state;
      if (applied.result.ok && envelope.command.type === 'expose' && !room.exposureWinnerId && toGameView(room.game, playerId).players.find(player => player.id === playerId)?.exposedCards.length === 10) {
        room.exposureWinnerId = playerId;
      }
      if (applied.result.ok) this.settle(room);
      room.receipts[key] = { fingerprint, result: applied.result };
      // Retain a bounded retry window. Older revisions still cannot replay a move.
      const keys = Object.keys(room.receipts);
      if (keys.length > 1000) delete room.receipts[keys[0]];
      room.updatedAt = this.clock.now();
      return applied.result;
    });
  }
}

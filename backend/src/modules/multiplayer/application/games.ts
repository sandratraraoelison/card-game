import { applyCommand, createGame, type CommandEnvelope, type CommandResult } from '@rami/game';
import { ApplicationError } from '../domain/models';
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
      const game = createGame(room.capacity, false, this.random);
      game.mode = 'remote';
      game.players = game.players.map((p, i) => ({ ...p, id: room.members[i].id, name: room.members[i].displayName, simulated: false }));
      room.game = game;
      room.receipts = {};
      room.updatedAt = this.clock.now();
    });
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
      room.receipts[key] = { fingerprint, result: applied.result };
      // Retain a bounded retry window. Older revisions still cannot replay a move.
      const keys = Object.keys(room.receipts);
      if (keys.length > 1000) delete room.receipts[keys[0]];
      room.updatedAt = this.clock.now();
      return applied.result;
    });
  }
}

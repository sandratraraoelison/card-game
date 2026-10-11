import { ApplicationError, type RoomRecord } from '../domain/models';

export function requireMember(room: RoomRecord, playerId: string): void {
  if (!room.members.some(player => player.id === playerId)) {
    throw new ApplicationError(403, 'Vous ne faites pas partie de ce salon.');
  }
}

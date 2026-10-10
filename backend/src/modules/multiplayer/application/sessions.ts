import type { GuestSession, PlayerAccount } from '@rami/game';
import { ApplicationError } from '../domain/models';
import type { Clock, IdentitySource, SessionRepository } from './ports';

export class Sessions {
  constructor(private readonly repository: SessionRepository, private readonly identity: IdentitySource, private readonly clock: Clock) {}
  create(displayName: string): GuestSession {
    const token = this.identity.token();
    const player = { id: this.identity.id(), displayName };
    this.repository.save({ tokenHash: this.identity.hash(token), player, expiresAt: this.clock.now() + 30 * 86400000 });
    return { token, player };
  }
  authenticate(token: string): PlayerAccount {
    const session = this.repository.find(this.identity.hash(token));
    if (!session || session.expiresAt <= this.clock.now()) throw new ApplicationError(401, 'Session expirée ou inconnue. Reconnectez-vous.');
    return session.player;
  }
}

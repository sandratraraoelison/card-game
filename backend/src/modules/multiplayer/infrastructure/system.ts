import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import type { Clock, IdentitySource } from '../application/ports';

export const systemIdentity: IdentitySource = {
  id: randomUUID,
  roomCode: () => randomInt(100000, 1000000).toString(),
  token: () => randomBytes(32).toString('hex'),
  hash: value => createHash('sha256').update(value).digest('hex'),
};

export const systemClock: Clock = { now: Date.now };
export const secureRandom = (): number => randomInt(0, 2 ** 32) / 2 ** 32;

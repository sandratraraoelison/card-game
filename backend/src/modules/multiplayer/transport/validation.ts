import type { CommandEnvelope, GameCommand, Meld } from '@rami/game';
import { ApplicationError } from '../domain/models';

function invalid(): never { throw new ApplicationError(400, 'Requête invalide. Vérifiez les champs envoyés.'); }
export function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some(key => !keys.includes(key))) return invalid();
  return record;
}
export function text(value: unknown, max = 100): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f]/.test(value)) return invalid();
  return value.trim();
}
export function capacity(value: unknown): 4 | 5 { return value === 4 || value === 5 ? value : invalid(); }
function ids(value: unknown, max: number): string[] {
  if (!Array.isArray(value) || value.length > max) return invalid();
  return value.map(v => text(v));
}
function meld(value: unknown): Meld {
  const m = object(value, ['id', 'cardIds', 'kind', 'useJokers']);
  if ((m.kind !== 'run' && m.kind !== 'set') || typeof m.useJokers !== 'boolean') return invalid();
  return { id: text(m.id), cardIds: ids(m.cardIds, 4), kind: m.kind, useJokers: m.useJokers };
}
function melds(value: unknown): Meld[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 4) return invalid();
  return value.map(meld);
}
function command(value: unknown): GameCommand {
  if (!value || typeof value !== 'object') return invalid();
  const type = (value as { type?: unknown }).type;
  switch (type) {
    case 'draw': {
      const c = object(value, ['type', 'source']);
      if (c.source !== 'stock' && c.source !== 'discard') return invalid();
      return { type, source: c.source };
    }
    case 'discard': return { type, cardId: text(object(value, ['type', 'cardId']).cardId) };
    case 'reorder': return { type, cardIds: ids(object(value, ['type', 'cardIds']).cardIds, 14) };
    case 'meld': return { type, meld: meld(object(value, ['type', 'meld']).meld) };
    case 'unmeld': return { type, meldId: text(object(value, ['type', 'meldId']).meldId) };
    case 'expose': return { type, melds: melds(object(value, ['type', 'melds']).melds) };
    case 'declare': {
      const c = object(value, ['type', 'pattern', 'discardId', 'melds']);
      if (c.pattern !== 13) return invalid();
      return { type, pattern: 13, discardId: c.discardId === undefined ? undefined : text(c.discardId), melds: melds(c.melds) };
    }
    default: return invalid();
  }
}
export function envelope(value: unknown): CommandEnvelope {
  const e = object(value, ['gameId', 'playerId', 'expectedRevision', 'commandId', 'command']);
  if (!Number.isSafeInteger(e.expectedRevision) || (e.expectedRevision as number) < 0) return invalid();
  return { gameId: text(e.gameId), playerId: text(e.playerId), expectedRevision: e.expectedRevision as number, commandId: text(e.commandId), command: command(e.command) };
}

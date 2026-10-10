import { expect, it, vi } from 'vitest';
import { createIdentifier } from '@rami/game';

it('creates unique v4 identifiers without randomUUID on LAN HTTP', () => {
  vi.stubGlobal('crypto', { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) });
  try {
    const ids = Array.from({ length: 100 }, createIdentifier);
    expect(new Set(ids).size).toBe(100);
    ids.forEach(id => expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/));
  } finally { vi.unstubAllGlobals(); }
});

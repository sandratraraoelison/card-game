import { expect, it } from 'vitest';
import { createGame, createJokerWinDemo, DEMO_GROUPS, findValidExposure, includesValidExposure, isValidStake, settlePot } from '@rami/game';
it('validates whole Ariary stakes and carries both prizes on a drawn round', () => {
  for (const value of [-1, 1.5, NaN, Infinity, '1000', 100001]) expect(isValidStake(value)).toBe(false);
  expect(isValidStake(1000)).toBe(true);
  expect(settlePot(['a', 'b', 'c', 'd'], 1000, 'b', 'a')).toEqual({ payments: [{ playerId: 'a', amount: 2000 }, { playerId: 'b', amount: 2000 }], carryover: 0, finishCarryover: 0 });
});
it('carries the unclaimed ten-card prize into the next five-player round', () => {
  const players = ['a', 'b', 'c', 'd', 'e'];
  expect(settlePot(players, 500, 'b')).toEqual({ payments: [{ playerId: 'b', amount: 1500 }], carryover: 1000, finishCarryover: 0 });
  expect(settlePot(players, 500, 'c', 'a', 1000)).toEqual({ payments: [{ playerId: 'a', amount: 2000 }, { playerId: 'c', amount: 1500 }], carryover: 0, finishCarryover: 0 });
  expect(settlePot(players, 500, 'b', undefined, 1000).carryover).toBe(2000);
  expect(settlePot(players, 500)).toEqual({ payments: [], carryover: 1000, finishCarryover: 1500 });
  expect(settlePot(players, 500, undefined, undefined, 1000, 1500)).toEqual({ payments: [], carryover: 2000, finishCarryover: 3000 });
  expect(settlePot(players, 500, undefined, 'a', 1000, 1500)).toEqual({ payments: [{ playerId: 'a', amount: 2000 }], carryover: 0, finishCarryover: 3000 });
  expect(settlePot(players, 500, 'a', 'a', 1000, 1500)).toEqual({ payments: [{ playerId: 'a', amount: 2000 }, { playerId: 'a', amount: 3000 }], carryover: 0, finishCarryover: 0 });
  expect(settlePot(players, 500, 'b', 'a', 1000, 1500, 'b')).toEqual({ payments: [{ playerId: 'b', amount: 5000 }], carryover: 0, finishCarryover: 0 });
});
it('detects ten natural cards inside a direct finish, excluding a joker four-card group', () => {
  const game = createGame(5, true);
  const melds = DEMO_GROUPS.map((cardIds, index) => ({ id: `${index}`, cardIds, kind: index === 0 || index === 2 ? 'run' as const : 'set' as const, useJokers: false }));
  expect(includesValidExposure(game.players[0].hand, melds, game.reference)).toBe(true);
  expect(findValidExposure(game.players[0].hand, melds, game.reference)).toHaveLength(3);
  expect(findValidExposure(game.players[0].hand, melds.slice(0, 2), game.reference)).toBeUndefined();
  expect(findValidExposure(game.players[0].hand, [melds[0], melds[0], melds[1]], game.reference)).toBeUndefined();
  const joker = createJokerWinDemo(5);
  expect(includesValidExposure(joker.players[0].hand, joker.players[0].melds, joker.reference)).toBe(false);
});

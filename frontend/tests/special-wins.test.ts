import { expect, it } from 'vitest';
import { applyCommand, countIdenticalPairs, countTrueJokers, createDeck, createGame, initialDealOutcome } from '@rami/game';

function randomForDeck(prefix: string[]) {
  const deck = createDeck();
  const desired = [...prefix.map(id => deck.find(card => card.id === id)!), ...deck.filter(card => !prefix.includes(card.id))];
  const working = [...deck];
  const values: number[] = [];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = working.findIndex(card => card.id === desired[i].id);
    values.push((j + 0.5) / (i + 1));
    [working[i], working[j]] = [working[j], working[i]];
  }
  return () => values.shift() ?? 0.5;
}
const cards = (...ids: string[]) => ids.map(id => createDeck().find(card => card.id === id)!);
const reference = cards('0-spades-4')[0];
const jokers = cards('0-hearts-4', '1-hearts-4', '0-diamonds-4', '1-diamonds-4');

it('rejects a true-joker discard without changing state, requiring a stock draw', () => {
  const game = createGame(4, true);
  game.reference = reference;
  game.discards = [{ id: 'joker', card: jokers[0], fromPlayerId: 'p1', toPlayerId: 'p0', pickedUp: false, turn: 1 }];
  const envelope = { gameId: game.id, playerId: 'p0', expectedRevision: game.revision, commandId: 'pickup', command: { type: 'draw' as const, source: 'discard' as const } };
  const rejected = applyCommand(game, envelope);
  expect(rejected.result).toEqual({ ok: false, error: 'Un vrai joker défaussé ne peut pas être repris. Piochez une carte.' });
  expect(rejected.state).toBe(game);
  expect(game.discards[0].pickedUp).toBe(false);
  expect(applyCommand(game, { ...envelope, command: { type: 'draw', source: 'stock' } }).result.ok).toBe(true);
  game.discards[0].card = cards('0-clubs-4')[0];
  expect(applyCommand(game, envelope).result.ok).toBe(true);
});

it('wins immediately with three true jokers at the deal, preserving all cards', () => {
  const game = createGame(5, false, randomForDeck([reference.id, ...jokers.slice(0, 3).map(card => card.id)]));
  expect(game.result).toMatchObject({ playerId: 'p0', victory: 'jokers-deal' });
  expect(game.phase).toBe('finished');
  expect(countTrueJokers(game.players[0].hand, game.reference)).toBe(3);
  expect(new Set([game.reference, ...game.stock, ...game.players.flatMap(player => player.hand)].map(card => card.id)).size).toBe(104);
});
it('counts identical suit/rank pairs and gives joker wins priority over redeals', () => {
  const pairs = cards('0-diamonds-2', '1-diamonds-2', '0-spades-12', '1-spades-12', '0-hearts-5', '1-hearts-5', '0-diamonds-7', '1-diamonds-7');
  expect(countIdenticalPairs(pairs)).toBe(4);
  expect(initialDealOutcome([{ id: 'a', hand: pairs }], reference)).toEqual({ winnerId: undefined, redeal: true });
  expect(initialDealOutcome([{ id: 'a', hand: pairs }, { id: 'b', hand: jokers.slice(0, 3) }], reference)).toEqual({ winnerId: 'b', redeal: false });
  expect(countIdenticalPairs(cards('0-spades-2', '0-hearts-2'))).toBe(0);
  expect(countIdenticalPairs([pairs[0], pairs[0]])).toBe(0);
});
it('automatically redistributes four pairs without losing or duplicating cards', () => {
  const first = randomForDeck([reference.id, '0-diamonds-2', '1-diamonds-2', '0-spades-12', '1-spades-12', '0-hearts-5', '1-hearts-5', '0-diamonds-7', '1-diamonds-7']);
  const second = randomForDeck([]);
  let calls = 0;
  const game = createGame(5, false, () => calls++ < 103 ? first() : second());
  expect(game.log[0]).toContain('partage(s) annulé(s)');
  expect(game.players.every(player => countIdenticalPairs(player.hand) < 4)).toBe(true);
  expect(new Set([game.reference, ...game.stock, ...game.players.flatMap(player => player.hand)].map(card => card.id)).size).toBe(104);
});
for (const source of ['stock'] as const) it(`wins on taking the fourth true joker from ${source}`, () => {
  const game = createGame(4, true);
  game.reference = reference;
  game.players[0].hand = [...jokers.slice(0, 3), ...game.players[0].hand.filter(card => card.rank !== 4).slice(0, 10)];
  const fourth = jokers[3];
  game.stock.unshift(fourth);
  game.discards = [{ id: 'incoming', card: fourth, fromPlayerId: 'p1', toPlayerId: 'p0', pickedUp: false, turn: 1 }];
  const command = { gameId: game.id, playerId: 'p0', expectedRevision: game.revision, commandId: 'four-jokers', command: { type: 'draw' as const, source } };
  const result = applyCommand(game, command);
  expect(result.result.ok).toBe(true);
  expect(result.state.phase).toBe('finished');
  expect(result.state.result).toMatchObject({ playerId: 'p0', victory: 'jokers-play' });
  expect(applyCommand(result.state, { ...command, expectedRevision: result.state.revision }).result.ok).toBe(false);
});

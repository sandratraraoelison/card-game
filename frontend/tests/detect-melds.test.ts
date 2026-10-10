import { expect, it } from "vitest";
import { createDeck, detectAdjacentMelds, validateMeld } from "@rami/game";

const deck = createDeck();
const cards = (...ids: string[]) =>
  ids.map((id) => deck.find((card) => card.id === id)!);
it("detects natural high-ace runs for automatic halos and slots", () => {
  for (const ranks of [[12, 13, 1], [11, 12, 13, 1]]) {
    const hand = cards(...ranks.map(rank => `0-hearts-${rank}`));
    const groups = detectAdjacentMelds(hand, deck[3]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ kind: "run", useJokers: false, cardIds: hand.map(card => card.id) });
  }
  expect(detectAdjacentMelds(cards("0-hearts-13", "0-hearts-1", "0-hearts-2"), deck[3])).toEqual([]);
});
it("detects the adjacent three twos from the reported hand, including a printed joker", () => {
  const hand = cards(
    "0-spades-13",
    "0-hearts-2",
    "0-clubs-2",
    "0-diamonds-2",
    "0-hearts-9",
  );
  const groups = detectAdjacentMelds(hand, deck[1]);
  expect(groups).toHaveLength(1);
  expect(groups[0].cardIds).toEqual(hand.slice(1, 4).map((card) => card.id));
  expect(groups[0].useJokers).toBe(false);
  expect(detectAdjacentMelds(hand, deck[1], groups)).toEqual([]);
});
it("never overlaps exemplars or suggests an invalid duplicate-suit set", () => {
  const hand = cards(
    "0-hearts-2",
    "1-hearts-2",
    "0-clubs-2",
    "0-clubs-3",
    "0-clubs-4",
    "0-clubs-5",
  );
  const groups = detectAdjacentMelds(hand, deck[0]);
  const ids = groups.flatMap((group) => group.cardIds);
  expect(new Set(ids).size).toBe(ids.length);
  expect(groups).toHaveLength(1);
  expect(groups[0].cardIds).toHaveLength(4);
  expect(
    validateMeld(cards(...ids), groups[0].kind, false, deck[0]).valid,
  ).toBe(true);
});

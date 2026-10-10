import { validateMeld } from "./rules";
import { Card, DEFAULT_RULES, Meld } from "./types";

/** Suggest natural adjacent groups; prefer the layout covering the most cards.
 * Existing prepared groups remain reserved. Jokers keep their printed value.
 */
export function detectAdjacentMelds(
  hand: Card[],
  reference: Card,
  reserved: Meld[] = [],
  rules = DEFAULT_RULES,
): Meld[] {
  const used = new Set(reserved.flatMap((meld) => meld.cardIds));
  function search(index: number, groups: number, fours: number): Meld[] {
    if (index >= hand.length || groups >= 4) return [];
    let best = search(index + 1, groups, fours);
    for (const size of [4, 3]) {
      if (size === 4 && fours >= 1) continue;
      const cards = hand.slice(index, index + size);
      if (cards.length !== size || cards.some((card) => used.has(card.id)))
        continue;
      for (const kind of ["set", "run"] as const) {
        if (!validateMeld(cards, kind, false, reference, rules).valid) continue;
        const cardIds = cards.map((card) => card.id);
        const candidate = [
          {
            id: `suggested-${cardIds.join("-")}`,
            cardIds,
            kind,
            useJokers: false,
          },
          ...search(index + size, groups + 1, fours + Number(size === 4)),
        ];
        const count = (melds: Meld[]) =>
          melds.reduce((total, meld) => total + meld.cardIds.length, 0);
        if (count(candidate) >= count(best)) best = candidate;
      }
    }
    return best;
  }
  return search(
    0,
    reserved.length,
    reserved.filter((meld) => meld.cardIds.length === 4).length,
  );
}

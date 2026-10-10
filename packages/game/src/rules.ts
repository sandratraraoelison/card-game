import {
  Card,
  DEFAULT_RULES,
  JokerKind,
  Meld,
  RulesConfig,
  SUITS,
} from "./types";
export const suitLabels = {
  spades: "pique",
  clubs: "trèfle",
  hearts: "cœur",
  diamonds: "carreau",
};
export const rankLabels: Record<number, string> = {
  1: "A",
  11: "J",
  12: "Q",
  13: "K",
};
export const rankLabel = (rank: number) => rankLabels[rank] ?? String(rank);
export const cardLabel = (card: Card) =>
  `${rankLabel(card.rank)} de ${suitLabels[card.suit]}`;
export const color = (card: Pick<Card, "suit">) =>
  card.suit === "hearts" || card.suit === "diamonds" ? "red" : "black";
export function jokerKind(card: Card, reference: Card): JokerKind {
  return card.rank !== reference.rank
    ? "none"
    : color(card) === color(reference)
      ? "false"
      : "true";
}
export function createDeck(): Card[] {
  return ([0, 1] as const).flatMap((copy) =>
    SUITS.flatMap((suit) =>
      Array.from({ length: 13 }, (_, i) => ({
        id: `${copy}-${suit}-${i + 1}`,
        rank: (i + 1) as Card["rank"],
        suit,
        copy,
      })),
    ),
  );
}
export function shuffle<T>(items: T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export interface MeldValidation {
  valid: boolean;
  natural: boolean;
  error?: string;
}
export function validateMeld(
  cards: Card[],
  kind: Meld["kind"],
  useJokers: boolean,
  reference: Card,
  rules = DEFAULT_RULES,
): MeldValidation {
  const fail = (error: string): MeldValidation => ({
    valid: false,
    natural: false,
    error,
  });
  if (![3, 4].includes(cards.length))
    return fail("Une combinaison contient exactement 3 ou 4 cartes.");
  if (new Set(cards.map((c) => c.id)).size !== cards.length)
    return fail("Un même exemplaire ne peut pas être utilisé deux fois.");
  const wild = useJokers
    ? cards.filter((c) => jokerKind(c, reference) === "true")
    : [];
  const fixed = cards.filter((c) => !wild.includes(c));
  if (kind === "set") {
    if (fixed.some((c) => c.rank !== fixed[0]?.rank))
      return fail("Un tri ou carré doit avoir la même valeur.");
    if (
      rules.distinctSuitsInSets &&
      new Set(fixed.map((c) => c.suit)).size !== fixed.length
    )
      return fail("Les enseignes du tri ou carré doivent être distinctes.");
  } else {
    if (fixed.some((c) => c.suit !== fixed[0]?.suit))
      return fail("Une suite doit être de la même enseigne.");
    const options = rules.ace === "low-or-high" ? [false, true] : [false];
    const valid = options.some((high) => {
      const ranks = fixed.map((c) => (high && c.rank === 1 ? 14 : c.rank));
      if (new Set(ranks).size !== ranks.length) return false;
      const min = high ? 2 : 1,
        max = high ? 14 : 13;
      for (let start = min; start <= max - cards.length + 1; start++) {
        if (ranks.every((rank) => rank >= start && rank < start + cards.length))
          return true;
      }
      return false;
    });
    if (!valid)
      return fail("La suite doit être consécutive, sans valeur en double.");
  }
  return { valid: true, natural: wild.length === 0 };
}
function validateLayout(
  hand: Card[],
  melds: Meld[],
  pattern: 10 | 13,
  reference: Card,
  rules: RulesConfig = DEFAULT_RULES,
): MeldValidation {
  const fail = (error: string): MeldValidation => ({
    valid: false,
    natural: false,
    error,
  });
  const sizes = melds
    .map((m) => m.cardIds.length)
    .sort()
    .join(",");
  if (sizes !== (pattern === 13 ? "3,3,3,4" : "3,3,4"))
    return fail(
      `Il faut répartir ${pattern} cartes en ${pattern === 13 ? "4 + 3 + 3 + 3" : "4 + 3 + 3"}.`,
    );
  const ids = melds.flatMap((m) => m.cardIds);
  if (new Set(ids).size !== ids.length)
    return fail("Une carte ne peut appartenir à deux combinaisons.");
  if (ids.some((id) => !hand.some((c) => c.id === id)))
    return fail(
      "Une carte de la combinaison ne se trouve pas dans votre main.",
    );
  const results = melds.map((m) =>
    validateMeld(
      m.cardIds.map((id) => hand.find((c) => c.id === id)!),
      m.kind,
      m.useJokers,
      reference,
      rules,
    ),
  );
  const invalid = results.find((r) => !r.valid);
  if (invalid) return invalid;
  if (pattern === 10 && results.some((r) => !r.natural))
    return fail(
      "L’exposition à 10 cartes doit être entièrement naturelle. Désactivez la substitution pour jouer un joker à sa valeur d’origine.",
    );
  if (pattern === 13) {
    const naturalThree = (kind: Meld["kind"]) =>
      melds.some(
        (m, i) =>
          m.cardIds.length === 3 && m.kind === kind && results[i].natural,
      );
    if (!naturalThree("set") || !naturalThree("run"))
      return fail(
        "Il faut un tri naturel de 3 cartes et une suite naturelle de 3 cartes.",
      );
  }
  return { valid: true, natural: results.every((r) => r.natural) };
}

export function validateFinish(
  hand: Card[],
  melds: Meld[],
  pattern: 13,
  reference: Card,
  rules = DEFAULT_RULES,
): MeldValidation {
  if (pattern !== 13)
    return {
      valid: false,
      natural: false,
      error: "Seules 13 cartes peuvent terminer la manche.",
    };
  return validateLayout(hand, melds, 13, reference, rules);
}

export function validateExposure(
  hand: Card[],
  melds: Meld[],
  reference: Card,
  rules = DEFAULT_RULES,
): MeldValidation {
  return validateLayout(hand, melds, 10, reference, rules);
}

/** A finish may include a natural 4 + 3 + 3 without a prior exposure command. */
export function includesValidExposure(hand: Card[], melds: Meld[], reference: Card, rules = DEFAULT_RULES): boolean {
  return !!findValidExposure(hand, melds, reference, rules);
}

export function findValidExposure(hand: Card[], melds: Meld[], reference: Card, rules = DEFAULT_RULES): Meld[] | undefined {
  for (let a = 0; a < melds.length; a++) {
    for (let b = a + 1; b < melds.length; b++) {
      for (let c = b + 1; c < melds.length; c++) {
        const groups = [melds[a], melds[b], melds[c]];
        if (validateExposure(hand, groups, reference, rules).valid) return groups;
      }
    }
  }
}

export const countTrueJokers = (hand: Card[], reference: Card) => hand.filter(card => jokerKind(card, reference) === 'true').length;
export const canPickUpDiscard = (card: Card, reference: Card) => jokerKind(card, reference) !== 'true';
export function countIdenticalPairs(hand: Card[]): number {
  const copies = new Map<string, Set<number>>();
  for (const card of hand) {
    const key = `${card.suit}-${card.rank}`;
    const pair = copies.get(key) ?? new Set<number>();
    pair.add(card.copy);
    copies.set(key, pair);
  }
  return [...copies.values()].filter(pair => pair.size === 2).length;
}
export function initialDealOutcome(players: Pick<import('./types').Player, 'id' | 'hand'>[], reference: Card) {
  const winner = players.find(player => countTrueJokers(player.hand, reference) >= 3);
  if (winner) return { winnerId: winner.id, redeal: false };
  return { winnerId: undefined, redeal: players.some(player => countIdenticalPairs(player.hand) >= 4) };
}

import { previousPlayerIndex } from "@rami/game";
import {
  Card,
  GameView,
  Meld,
  SUITS,
  jokerKind,
  validateMeld,
  detectAdjacentMelds,
} from "@rami/game";

export interface MeldView {
  id: string;
  cards: Card[];
  title: string;
  valid: boolean;
  natural: boolean;
}

/** Pure view preparation: the shared domain remains the only rule validator. */
export function selectGameView(
  game: GameView,
  playerId: string,
  selected: string[],
  useJokers: boolean,
) {
  const me = game.players.find((player) => player.id === playerId);
  if (!me?.hand)
    throw new Error(
      "La vue de la partie doit contenir la main du joueur connecté.",
    );
  const hand = me.hand;
  const turn = game.players[game.currentPlayerIndex];
  const myTurn = turn.id === me.id && game.phase !== "finished";
  const used = new Set(me.melds.flatMap((meld) => meld.cardIds));
  const suggestions = detectAdjacentMelds(
    hand,
    game.reference,
    me.melds,
    game.rules,
  );
  const selectedCards = hand.filter((card) => selected.includes(card.id));
  const validSelection =
    selectedCards.length === selected.length &&
    selected.every((id) => !used.has(id)) &&
    (["run", "set"] as const).some(
      (kind) =>
        validateMeld(selectedCards, kind, useJokers, game.reference, game.rules)
          .valid,
    );
  const melds: MeldView[] = me.melds.map((meld) => {
    const cards = meld.cardIds.flatMap((id) =>
      hand.filter((card) => card.id === id),
    );
    const validation = validateMeld(
      cards,
      meld.kind,
      meld.useJokers,
      game.reference,
      game.rules,
    );
    return {
      id: meld.id,
      cards,
      title: meldTitle(meld),
      valid: cards.length === meld.cardIds.length && validation.valid,
      natural: validation.natural,
    };
  });
  const validCards = new Set(
    melds
      .filter((meld) => meld.valid)
      .flatMap((meld) => meld.cards.map((card) => card.id)),
  );
  if (validSelection) selected.forEach((id) => validCards.add(id));
  suggestions.forEach((meld) =>
    meld.cardIds.forEach((id) => validCards.add(id)),
  );
  const incoming = game.discards.findLast((discard) => !discard.pickedUp);
  const previousPlayer =
    game.players[
      previousPlayerIndex(game.players.indexOf(me), game.players.length)
    ];
  const status =
    game.phase === "finished"
      ? (game.result?.reason ?? "Manche terminée.")
      : myTurn
        ? game.phase === "draw"
          ? "C’est à vous. Piochez une carte pour commencer."
          : "À vous de jouer. Préparez vos combinaisons, puis défaussez."
        : `${turn.name} réfléchit…${turn.simulated ? " Joueur simulé." : ""}`;
  return {
    me,
    hand,
    myTurn,
    used,
    validCards,
    validSelection,
    melds,
    suggestions,
    status,
    incoming,
    incomingFrom: game.players.find(
      (player) => player.id === incoming?.fromPlayerId,
    )?.name,
    top: incoming?.toPlayerId === me.id ? incoming : undefined,
    received: game.discards.filter((discard) => discard.toPlayerId === me.id),
    previousPlayerName: previousPlayer.name,
    opponents: game.players
      .filter((player) => player.id !== me.id)
      .map((player) => {
        const received = game.discards.filter(
          (discard) => discard.toPlayerId === player.id,
        );
        return {
          id: player.id,
          name: player.name,
          simulated: player.simulated,
          cardCount: player.cardCount,
          active: turn.id === player.id && game.phase !== "finished",
          received,
          fromName:
            game.players[
              previousPlayerIndex(game.players.indexOf(player), game.players.length)
            ].name,
        };
      }),
  };
}

export type OpponentView = ReturnType<
  typeof selectGameView
>["opponents"][number];
const meldTitle = (meld: Meld) =>
  meld.kind === "run" ? "Suite" : meld.cardIds.length === 4 ? "Carré" : "Tri";

export function selectJokerSuits(reference: Card) {
  const byKind = (kind: "true" | "false") =>
    SUITS.filter(
      (suit) => jokerKind({ ...reference, suit }, reference) === kind,
    );
  return { trueSuits: byKind("true"), falseSuits: byKind("false") };
}

export function reorderBefore(
  hand: Card[],
  cardId: string,
  beforeId?: string,
): string[] {
  const ids = hand.map((card) => card.id);
  if (
    !ids.includes(cardId) ||
    cardId === beforeId ||
    (beforeId && !ids.includes(beforeId))
  )
    return ids;
  const remaining = ids.filter((id) => id !== cardId);
  remaining.splice(
    beforeId ? remaining.indexOf(beforeId) : remaining.length,
    0,
    cardId,
  );
  return remaining;
}

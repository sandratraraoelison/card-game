import { createIdentifier } from "./identifiers";
import { nextPlayerIndex } from "./turn-order";
import {
  Card,
  CommandEnvelope,
  CommandResult,
  DEFAULT_RULES,
  GameState,
  GameView,
  GameCommand,
  RulesConfig,
} from "./types";
import {
  cardLabel,
  createDeck,
  shuffle,
  validateFinish,
  validateExposure,
  validateMeld,
  countTrueJokers,
  initialDealOutcome,
  canPickUpDiscard,
} from "./rules";
export const DEMO_GROUPS = [
  ["0-hearts-5", "0-hearts-6", "0-hearts-7", "0-hearts-8"],
  ["0-spades-9", "0-hearts-9", "0-diamonds-9"],
  ["0-clubs-1", "0-clubs-2", "0-clubs-3"],
  ["0-spades-13", "0-hearts-13", "0-diamonds-13"],
];
const JOKER_DEMO_GROUPS = [
  ["0-hearts-5", "0-hearts-6", "0-hearts-4", "0-hearts-8"],
  ...DEMO_GROUPS.slice(1),
];
function dealGame(
  count: 4 | 5 = 4,
  demo: boolean | "joker" = false,
  random = Math.random,
  rules: RulesConfig = DEFAULT_RULES,
): GameState {
  if (count !== 4 && count !== 5)
    throw new Error("Une partie accueille 4 ou 5 joueurs.");
  let deck = shuffle(createDeck(), random);
  const demoGroups = demo === "joker" ? JOKER_DEMO_GROUPS : DEMO_GROUPS;
  // In the guided scenario, reserve the exercise cards before drawing a random reference.
  const reserved = new Set([...demoGroups.flat(), "0-diamonds-12"]);
  const referenceIndex = demo === "joker"
    ? deck.findIndex((c) => c.id === "0-spades-4")
    : demo ? deck.findIndex((c) => !reserved.has(c.id)) : 0;
  const reference = deck[referenceIndex];
  if (rules.referenceCard === "removed") deck.splice(referenceIndex, 1);
  const players = ["Vous", "Soa", "Hery", "Mialy", "Fara"]
    .slice(0, count)
    .map((name, i) => ({
      id: `p${i}`,
      name,
      simulated: i !== 0,
      hand: [] as Card[],
      melds: [],
      exposedMeldIds: [] as string[],
    }));
  if (demo) {
    const ids = [
      ...demoGroups.flat().filter((id) => id !== "0-diamonds-13"),
      "0-diamonds-12",
    ];
    players[0].hand = ids.map((id) => deck.find((c) => c.id === id)!);
    deck = deck.filter((c) => !ids.includes(c.id));
    const draw = deck.find((c) => c.id === "0-diamonds-13")!;
    deck = deck.filter((c) => c.id !== draw.id);
    for (const player of players.slice(1)) player.hand = deck.splice(0, 13);
    deck.unshift(draw);
  } else for (const player of players) player.hand = deck.splice(0, 13);
  return {
    id: createIdentifier(),
    revision: 0,
    mode: "local",
    players,
    reference,
    stock: deck,
    discards: [],
    currentPlayerIndex: 0,
    phase: "draw",
    turn: 1,
    rules: { ...rules },
    demo: !!demo,
    log: [
      demo
        ? "Main guidée : piochez le roi de carreau, puis préparez vos combinaisons."
        : "Les cartes sont distribuées. À vous de piocher.",
    ],
  };
}

export function createGame(count: 4 | 5 = 4, demo: boolean | 'joker' = false, random = Math.random, rules: RulesConfig = DEFAULT_RULES): GameState {
  for (let attempt = 0; attempt < 100; attempt++) {
    const game = dealGame(count, demo, random, rules);
    // Guided exercises preserve their scripted deal.
    if (demo) return game;
    const outcome = initialDealOutcome(game.players, game.reference);
    if (outcome.winnerId) {
      const winner = game.players.find(player => player.id === outcome.winnerId)!;
      game.phase = 'finished';
      game.result = { playerId: winner.id, victory: 'jokers-deal', reason: `${winner.name} reçoit au moins 3 vrais jokers : victoire immédiate, tous les prix !` };
      game.log.unshift(game.result.reason);
    } else if (outcome.redeal) continue;
    if (attempt) game.log.unshift(`${attempt} partage(s) annulé(s) pour au moins 4 paires identiques. Nouvelle distribution sans nouvelle mise.`);
    return game;
  }
  throw new Error('Impossible de distribuer une main sans quatre paires après 100 partages.');
}

/** A completed local example, won through the same commands as a real turn. */
export function createJokerWinDemo(count: 4 | 5 = 4): GameState {
  let state = createGame(count, "joker");
  const commands: GameCommand[] = [
    { type: "draw", source: "stock" },
    {
      type: "declare",
      pattern: 13,
      melds: JOKER_DEMO_GROUPS.map((cardIds, index) => ({
        id: `joker-demo-${index}`,
        cardIds,
        kind: index === 0 || index === 2 ? "run" : "set",
        useJokers: index === 0,
      })),
    },
  ];
  for (const command of commands) {
    const applied = applyCommand(state, {
      gameId: state.id,
      playerId: state.players[0].id,
      expectedRevision: state.revision,
      commandId: createIdentifier(),
      command,
    });
    if (!applied.result.ok) throw new Error(applied.result.error);
    state = applied.state;
  }
  state.log.unshift("Simulation : le 4 de cœur, vrai joker, remplace le 7 de cœur dans la suite 5–6–joker–8.");
  return state;
}
export function toGameView(state: GameState, viewerId: string): GameView {
  const { stock, players, ...publicState } = state;
  return {
    ...publicState,
    stockCount: stock.length,
    players: players.map(({ hand, ...p }) => ({
      ...p,
      melds:
        p.id === viewerId
          ? p.melds
          : p.melds.filter((m) => p.exposedMeldIds.includes(m.id)),
      exposedCards: hand.filter((c) =>
        p.melds.some(
          (m) => p.exposedMeldIds.includes(m.id) && m.cardIds.includes(c.id),
        ),
      ),
      cardCount: hand.length,
      ...(p.id === viewerId ? { hand } : {}),
    })),
  };
}
export function applyCommand(
  state: GameState,
  envelope: CommandEnvelope,
): { state: GameState; result: CommandResult } {
  const fail = (error: string) => ({
    state,
    result: { ok: false, error } as CommandResult,
  });
  if (
    envelope.gameId !== state.id ||
    envelope.expectedRevision !== state.revision
  )
    return fail("La partie a changé. Réessayez avec son état actuel.");
  const player = state.players[state.currentPlayerIndex];
  const actorIndex = state.players.findIndex(p => p.id === envelope.playerId);
  if (actorIndex < 0) return fail('Joueur inconnu.');
  if (envelope.command.type !== 'reorder' && envelope.playerId !== player.id) return fail("Attendez votre tour.");
  if (state.phase === "finished")
    return fail("Cette manche est terminée. Lancez une nouvelle manche.");
  const next = structuredClone(state),
    p = next.players[actorIndex],
    command = envelope.command;
  const log = (message: string) => {
    next.log = [message, ...next.log].slice(0, 30);
  };
  const discard = (id: string) => {
    const card = p.hand.find((c) => c.id === id)!;
    p.hand = p.hand.filter((c) => c.id !== id);
    p.melds = p.melds.filter((m) => !m.cardIds.includes(id));
    if (p.exposedMeldIds.some((id) => !p.melds.some((m) => m.id === id)))
      p.exposedMeldIds = [];
    const recipient =
      next.players[
        nextPlayerIndex(next.currentPlayerIndex, next.players.length)
      ];
    next.discards.push({
      id: `${next.id}-${next.turn}`,
      card,
      fromPlayerId: p.id,
      toPlayerId: recipient.id,
      turn: next.turn,
      pickedUp: false,
    });
    log(`${p.name} défausse ${cardLabel(card)} devant ${recipient.name}.`);
  };
  switch (command.type) {
    case "draw": {
      if (next.phase !== "draw")
        return fail("Vous avez déjà pioché. Défaussez une carte.");
      let card: Card | undefined;
      if (command.source === "stock") card = next.stock.shift();
      else {
        if (!next.rules.allowDiscardPickup)
          return fail("La reprise de défausse est désactivée.");
        const top = next.discards.findLast((d) => !d.pickedUp);
        if (!top || top.toPlayerId !== p.id)
          return fail("Aucune défausse disponible devant vous.");
        if (!canPickUpDiscard(top.card, next.reference))
          return fail('Un vrai joker défaussé ne peut pas être repris. Piochez une carte.');
        top.pickedUp = true;
        card = top.card;
      }
      if (!card) return fail("La pioche est vide.");
      p.hand.push(card);
      next.phase = "discard";
      if (countTrueJokers(p.hand, next.reference) >= 4) {
        next.phase = 'finished';
        next.result = { playerId: p.id, victory: 'jokers-play', reason: `${p.name} possède 4 vrais jokers : victoire immédiate, tous les prix !` };
        log(next.result.reason);
      }
      log(
        `${p.name} pioche ${command.source === "stock" ? "une carte" : "dans la défausse"}.`,
      );
      break;
    }
    case "discard": {
      if (next.phase !== "discard") return fail("Piochez avant de défausser.");
      if (!p.hand.some((c) => c.id === command.cardId))
        return fail("Cette carte ne se trouve pas dans votre main.");
      discard(command.cardId);
      next.currentPlayerIndex = nextPlayerIndex(
        next.currentPlayerIndex,
        next.players.length,
      );
      next.turn++;
      next.phase = "draw";
      if (!next.stock.length) {
        next.phase = "finished";
        next.result = {
          reason:
            "Pioche épuisée : manche nulle, sans recyclage des défausses.",
        };
      }
      break;
    }
    case "reorder": {
      if (
        command.cardIds.length !== p.hand.length ||
        new Set(command.cardIds).size !== p.hand.length ||
        command.cardIds.some((id) => !p.hand.some((c) => c.id === id))
      )
        return fail(
          "L’ordre doit contenir chaque carte de votre main une seule fois.",
        );
      p.hand = command.cardIds.map((id) => p.hand.find((c) => c.id === id)!);
      break;
    }
    case "meld": {
      if (p.melds.some((m) => m.id === command.meld.id))
        return fail("Cette combinaison existe déjà.");
      if (command.meld.cardIds.some((id) => !p.hand.some((c) => c.id === id)))
        return fail("Sélectionnez des cartes de votre main.");
      if (
        p.melds.some((m) =>
          m.cardIds.some((id) => command.meld.cardIds.includes(id)),
        )
      )
        return fail("Libérez d’abord les cartes déjà dans une combinaison.");
      const result = validateMeld(
        command.meld.cardIds.map((id) => p.hand.find((c) => c.id === id)!),
        command.meld.kind,
        command.meld.useJokers,
        next.reference,
        next.rules,
      );
      if (!result.valid) return fail(result.error!);
      p.melds.push(command.meld);
      log(
        `${p.name} prépare une combinaison ${result.natural ? "naturelle" : "avec substitution"}.`,
      );
      break;
    }
    case "unmeld":
      if (p.exposedMeldIds.includes(command.meldId)) p.exposedMeldIds = [];
      p.melds = p.melds.filter((m) => m.id !== command.meldId);
      break;
    case "expose": {
      // Commit submitted groups only when the whole exposure is valid.
      if (command.melds) {
        if (
          new Set(command.melds.map((meld) => meld.id)).size !==
          command.melds.length
        )
          return fail("Chaque combinaison doit avoir un identifiant unique.");
        p.melds = structuredClone(command.melds);
      }
      const result = validateExposure(
        p.hand,
        p.melds,
        next.reference,
        next.rules,
      );
      if (!result.valid) return fail(result.error!);
      p.exposedMeldIds = p.melds.map((m) => m.id);
      log(`${p.name} expose 10 cartes naturelles. La manche continue.`);
      break;
    }
    case "declare": {
      if (command.pattern !== 13)
        return fail(
          "Seules 13 cartes peuvent terminer la manche. Utilisez « Afficher 10 cartes » pour les exposer.",
        );
      // Submitted detected groups and final discard commit only if the whole
      // declaration succeeds. Invalid proposals never change the live state.
      if (command.melds) {
        if (
          new Set(command.melds.map((meld) => meld.id)).size !==
          command.melds.length
        )
          return fail("Chaque combinaison doit avoir un identifiant unique.");
        p.melds = structuredClone(command.melds);
      }
      const layout = validateFinish(
        p.hand,
        p.melds,
        13,
        next.reference,
        next.rules,
      );
      if (!layout.valid) return fail(layout.error!);
      if (next.phase === "discard") {
        const ungrouped = p.hand.filter(
          (card) => !p.melds.some((meld) => meld.cardIds.includes(card.id)),
        );
        const discardId =
          command.discardId ??
          (ungrouped.length === 1 ? ungrouped[0].id : undefined);
        if (!discardId || !p.hand.some((c) => c.id === discardId))
          return fail(
            "Préparez vos 13 cartes en combinaisons : une seule carte doit rester à défausser automatiquement.",
          );
        if (p.melds.some((m) => m.cardIds.includes(discardId)))
          return fail(
            "La carte à défausser ne doit pas appartenir à une combinaison.",
          );
        discard(discardId);
      }
      if (p.hand.length !== 13)
        return fail(
          "La déclaration se fait avec 13 cartes après la défausse éventuelle.",
        );
      const result = validateFinish(
        p.hand,
        p.melds,
        command.pattern,
        next.reference,
        next.rules,
      );
      if (!result.valid) return fail(result.error!);
      next.phase = "finished";
      next.result = {
        playerId: p.id,
        pattern: command.pattern,
        reason: `${p.name} termine à ${command.pattern} cartes${result.natural ? ", naturellement" : ", avec jokers"} !`,
      };
      log(next.result.reason);
      break;
    }
  }
  next.revision++;
  return { state: next, result: { ok: true } };
}

import { describe, expect, it, vi } from "vitest";
import {
  applyCommand,
  Card,
  createDeck,
  createGame,
  detectAdjacentMelds,
  DEFAULT_RULES,
  DEMO_GROUPS,
  GameCommand,
  GameState,
  jokerKind,
  Meld,
  SUITS,
  toGameView,
  validateFinish,
  validateExposure,
  validateMeld,
} from "@rami/game";
import { LocalGameService } from "../src/features/game/infrastructure/local-game-service";
const deck = createDeck();
const card = (rank: number, suit: Card["suit"] = "spades", copy = 0) =>
  deck.find((c) => c.rank === rank && c.suit === suit && c.copy === copy)!;
const reference = card(4);
it('allows a player to arrange only their own hand outside their turn', () => {
  const game = createGame(4, false, () => 0.999999);
  const reordered = [...game.players[1].hand].reverse().map(card => card.id);
  const envelope = { gameId: game.id, playerId: 'p1', expectedRevision: game.revision, commandId: 'arrange', command: { type: 'reorder' as const, cardIds: reordered } };
  const result = applyCommand(game, envelope);
  expect(result.result.ok).toBe(true);
  expect(result.state.players[1].hand.map(card => card.id)).toEqual(reordered);
  expect(result.state.players[0].hand).toEqual(game.players[0].hand);
  expect(result.state.currentPlayerIndex).toBe(game.currentPlayerIndex);
  expect(result.state.phase).toBe(game.phase);
  expect(applyCommand(game, { ...envelope, command: { type: 'draw', source: 'stock' } }).result.ok).toBe(false);
  expect(applyCommand(game, { ...envelope, command: { type: 'reorder', cardIds: game.players[0].hand.map(card => card.id) } }).result.ok).toBe(false);
});
const group = (cards: Card[], kind: Meld["kind"], useJokers = false): Meld => ({
  id: cards.map((c) => c.id).join(":"),
  cardIds: cards.map((c) => c.id),
  kind,
  useJokers,
});
const groups = [
  group(
    [
      card(5, "hearts"),
      card(6, "hearts"),
      card(7, "hearts"),
      card(8, "hearts"),
    ],
    "run",
  ),
  group([card(9), card(9, "hearts"), card(9, "diamonds")], "set"),
  group([card(1, "clubs"), card(2, "clubs"), card(3, "clubs")], "run"),
  group([card(13), card(13, "hearts"), card(13, "diamonds")], "set"),
];
const handFor = (melds: Meld[]) =>
  melds.flatMap((m) => m.cardIds.map((id) => deck.find((c) => c.id === id)!));
const run = (
  state: GameState,
  command: GameCommand,
  playerId = state.players[state.currentPlayerIndex].id,
) =>
  applyCommand(state, {
    gameId: state.id,
    expectedRevision: state.revision,
    commandId: crypto.randomUUID(),
    playerId,
    command,
  });

it("atomically declares detected groups and automatically discards the remaining card", () => {
  const state = run(createGame(4, true), {
    type: "draw",
    source: "stock",
  }).state;
  // Match the user's arranged hand: all four groups adjacent, queen last.
  state.players[0].hand = [...handFor(groups), card(12, "diamonds")];
  const melds = detectAdjacentMelds(state.players[0].hand, state.reference);
  const rejected = run(state, {
    type: "declare",
    pattern: 13,
    melds: melds.slice(0, 3),
  });
  expect(rejected.result.ok).toBe(false);
  expect(rejected.state).toBe(state);
  expect(state.players[0].melds).toEqual([]);
  const result = run(state, { type: "declare", pattern: 13, melds });
  expect(result.result.ok).toBe(true);
  expect(result.state.phase).toBe("finished");
  expect(result.state.players[0].hand).toHaveLength(13);
  expect(result.state.players[0].melds).toHaveLength(4);
  expect(result.state.discards.at(-1)?.card.id).toBe("0-diamonds-12");
});

describe("deck and joker allocation", () => {
  it("contains two copies of all 52 cards with 104 unique IDs", () => {
    expect(deck).toHaveLength(104);
    expect(new Set(deck.map((c) => c.id)).size).toBe(104);
    for (const suit of SUITS)
      for (let rank = 1; rank <= 13; rank++)
        expect(
          deck.filter((c) => c.suit === suit && c.rank === rank),
        ).toHaveLength(2);
  });
  for (const suit of SUITS)
    it(`classifies both copies for reference ${suit}`, () => {
      const ref = card(4, suit),
        red = ["hearts", "diamonds"].includes(suit);
      expect(deck.filter((c) => jokerKind(c, ref) === "true")).toHaveLength(4);
      expect(deck.filter((c) => jokerKind(c, ref) === "false")).toHaveLength(4);
      for (const c of deck)
        expect(jokerKind(c, ref)).toBe(
          c.rank !== 4
            ? "none"
            : ["hearts", "diamonds"].includes(c.suit) === red
              ? "false"
              : "true",
        );
    });
  for (const count of [4, 5] as const)
    it(`deals 13 cards to ${count} players and removes reference`, () => {
      const game = createGame(count, false, () => 0.999999);
      game.players.forEach((p) => expect(p.hand).toHaveLength(13));
      expect(game.stock).toHaveLength(103 - count * 13);
      expect(
        new Set(
          [
            ...game.stock,
            ...game.players.flatMap((p) => p.hand),
            game.reference,
          ].map((c) => c.id),
        ).size,
      ).toBe(104);
    });
});
describe("melds", () => {
  it("allows natural runs, tris and squares", () => {
    for (const m of groups)
      expect(validateMeld(handFor([m]), m.kind, false, reference)).toEqual({
        valid: true,
        natural: true,
      });
    expect(
      validateMeld(
        SUITS.map((s) => card(10, s)),
        "set",
        false,
        reference,
      ).valid,
    ).toBe(true);
  });
  it("rejects repeated physical cards and duplicate ranks in runs", () => {
    expect(
      validateMeld([card(1), card(1), card(2)], "run", false, reference).valid,
    ).toBe(false);
    expect(
      validateMeld(
        [card(1), card(1, "spades", 1), card(2)],
        "run",
        false,
        reference,
      ).valid,
    ).toBe(false);
  });
  it("requires distinct suits in sets unless configured otherwise", () => {
    const cards = [card(8), card(8, "spades", 1), card(8, "hearts")];
    expect(validateMeld(cards, "set", false, reference).valid).toBe(false);
    expect(
      validateMeld(cards, "set", false, reference, {
        ...DEFAULT_RULES,
        distinctSuitsInSets: false,
      }).valid,
    ).toBe(true);
  });
  it("supports low and high ace by default, never wraps", () => {
    expect(
      validateMeld([card(1), card(2), card(3)], "run", false, reference).valid,
    ).toBe(true);
    expect(
      validateMeld([card(12), card(13), card(1)], "run", false, reference)
        .valid,
    ).toBe(true);
    expect(
      validateMeld(
        [card(11), card(12), card(13), card(1)],
        "run",
        false,
        reference,
      ),
    ).toEqual({ valid: true, natural: true });
    expect(
      validateMeld([card(12), card(13), card(1)], "run", false, reference, {
        ...DEFAULT_RULES,
        ace: "low",
      }).valid,
    ).toBe(false);
    expect(
      validateMeld([card(13), card(1), card(2)], "run", false, reference, {
        ...DEFAULT_RULES,
        ace: "low-or-high",
      }).valid,
    ).toBe(false);
  });
  it("only true jokers substitute", () => {
    expect(
      validateMeld(
        [card(5), card(7), card(4, "hearts")],
        "run",
        true,
        reference,
      ),
    ).toEqual({ valid: true, natural: false });
    expect(
      validateMeld([card(5), card(7), card(4, "clubs")], "run", true, reference)
        .valid,
    ).toBe(false);
    expect(
      validateMeld([card(3), card(4), card(5)], "run", false, reference),
    ).toEqual({ valid: true, natural: true });
  });
  it("rejects gaps, mixed suits and groups of 2 or 5", () => {
    for (const cards of [
      [card(1), card(2), card(4)],
      [card(1), card(2, "hearts"), card(3)],
      [card(1), card(2)],
      [card(1), card(2), card(3), card(4), card(5)],
    ])
      expect(validateMeld(cards, "run", false, reference).valid).toBe(false);
  });
});
describe("13-card declaration", () => {
  it("accepts natural 4+3+3+3", () =>
    expect(validateFinish(handFor(groups), groups, 13, reference)).toEqual({
      valid: true,
      natural: true,
    }));
  it("accepts a square as the group of four", () => {
    const melds = [
      group(
        SUITS.map((s) => card(6, s)),
        "set",
      ),
      ...groups.slice(1),
    ];
    expect(validateFinish(handFor(melds), melds, 13, reference).valid).toBe(
      true,
    );
  });
  it("accepts substitution after a natural tri AND a natural 3-card run", () => {
    const melds = [
      group(
        [
          card(5, "hearts"),
          card(6, "hearts"),
          card(7, "hearts"),
          card(4, "diamonds"),
        ],
        "run",
        true,
      ),
      ...groups.slice(1),
    ];
    expect(validateFinish(handFor(melds), melds, 13, reference)).toEqual({
      valid: true,
      natural: false,
    });
  });
  it("rejects all runs even if all are natural", () => {
    const melds = [
      groups[0],
      group([card(1), card(2), card(3)], "run"),
      groups[2],
      group(
        [card(9, "diamonds"), card(10, "diamonds"), card(11, "diamonds")],
        "run",
      ),
    ];
    expect(validateFinish(handFor(melds), melds, 13, reference).valid).toBe(
      false,
    );
  });
  it("does not count a four-card run as the required natural three-card run", () => {
    const melds = [
      groups[0],
      groups[1],
      group([card(7), card(7, "clubs"), card(7, "diamonds")], "set"),
      groups[3],
    ];
    expect(validateFinish(handFor(melds), melds, 13, reference).valid).toBe(
      false,
    );
  });
  it("does not count a substituted run as the natural anchor", () => {
    const melds = [
      groups[0],
      groups[1],
      group(
        [card(1, "clubs"), card(2, "clubs"), card(4, "hearts")],
        "run",
        true,
      ),
      groups[3],
    ];
    expect(validateFinish(handFor(melds), melds, 13, reference).valid).toBe(
      false,
    );
  });
  it("rejects wrong pattern, cards outside hand, and reuse across groups", () => {
    expect(
      validateFinish(handFor(groups), groups.slice(0, 3), 13, reference).valid,
    ).toBe(false);
    expect(
      validateFinish(handFor(groups).slice(1), groups, 13, reference).valid,
    ).toBe(false);
    const melds = [groups[0], groups[1], groups[2], groups[1]];
    expect(validateFinish(handFor(melds), melds, 13, reference).valid).toBe(
      false,
    );
  });
});
describe("10-card exposure", () => {
  for (const phase of ["draw", "discard"] as const) {
    for (const confirmed of [0, 1]) {
      it(`atomically exposes detected groups in ${phase} with ${confirmed} prepared group`, () => {
        let state = createGame(4, true);
        if (phase === "discard")
          state = run(state, { type: "draw", source: "stock" }).state;
        if (confirmed)
          state = run(state, { type: "meld", meld: groups[0] }).state;
        const player = state.players[0];
        const melds = [
          ...player.melds,
          ...detectAdjacentMelds(player.hand, state.reference, player.melds),
        ];
        const before = structuredClone(state);
        const result = run(state, { type: "expose", melds });

        expect(result.result.ok).toBe(true);
        expect(result.state.players[0].melds).toEqual(melds);
        expect(result.state.players[0].exposedMeldIds).toEqual(melds.map(m => m.id));
        expect(toGameView(result.state, "p1").players[0].exposedCards).toHaveLength(10);
        expect(result.state.phase).toBe(phase);
        expect(result.state.currentPlayerIndex).toBe(state.currentPlayerIndex);
        expect(result.state.players[0].hand).toEqual(player.hand);
        expect(result.state.discards).toEqual(state.discards);
        expect(result.state.result).toBeUndefined();
        expect(result.state.revision).toBe(state.revision + 1);
        expect(state).toEqual(before);
      });
    }
  }

  it("rejects invalid submitted groups without changing prepared or exposed cards", () => {
    const initial = createGame(4, true);
    initial.reference = reference;
    const state = run(initial, { type: "expose", melds: groups.slice(0, 3) }).state;
    const before = structuredClone(state);
    const invalidProposals = [
      groups.slice(0, 2),
      [groups[0], groups[1], { ...groups[2], id: groups[1].id }],
      [groups[0], groups[1], { ...groups[1], id: "duplicate-cards" }],
      [groups[0], groups[1], group([card(1), card(2), card(3)], "run")],
      [groups[0], groups[1], { ...groups[2], kind: "set" as const }],
    ];
    for (const melds of invalidProposals) {
      const result = run(state, { type: "expose", melds });
      expect(result.result.ok).toBe(false);
      expect(result.state).toBe(state);
      expect(state).toEqual(before);
    }
  });

  it("accepts natural 4+3+3 without requiring both types", () => {
    const melds = [
      groups[0],
      groups[2],
      group([card(9), card(10), card(11)], "run"),
    ];
    expect(validateExposure(handFor(melds), melds, reference)).toEqual({
      valid: true,
      natural: true,
    });
  });
  it("allows true and false jokers at their original rank/suit", () => {
    for (const suit of SUITS) {
      const melds = [
        groups[0],
        groups[1],
        group([card(2, suit), card(3, suit), card(4, suit)], "run"),
      ];
      expect(validateExposure(handFor(melds), melds, reference).valid).toBe(
        true,
      );
    }
  });
  it("rejects joker substitution and wrong pattern", () => {
    const melds = [
      groups[0],
      groups[1],
      group(
        [card(1, "clubs"), card(2, "clubs"), card(4, "hearts")],
        "run",
        true,
      ),
    ];
    expect(validateExposure(handFor(melds), melds, reference).valid).toBe(
      false,
    );
    expect(validateExposure(handFor(groups), groups, reference).valid).toBe(
      false,
    );
  });
});
describe("local game flow", () => {
  it("rejects out-of-turn, stale commands and discard before draw without mutation", () => {
    const g = createGame(4, false, () => 0.999999),
      before = structuredClone(g);
    expect(run(g, { type: "draw", source: "stock" }, "p1").result.ok).toBe(
      false,
    );
    expect(
      run(g, { type: "discard", cardId: g.players[0].hand[0].id }).result.ok,
    ).toBe(false);
    expect(
      applyCommand(g, {
        gameId: g.id,
        expectedRevision: 99,
        commandId: "x",
        playerId: "p0",
        command: { type: "draw", source: "stock" },
      }).result.ok,
    ).toBe(false);
    expect(g).toEqual(before);
  });
  it("places discard before J+1, permits only next player pickup, preserves provenance", () => {
    let g = run(createGame(4, false, () => 0.999999), { type: "draw", source: "stock" }).state;
    expect(run(g, { type: "draw", source: "stock" }).result.ok).toBe(false);
    const discarded = g.players[0].hand[0];
    g = run(g, { type: "discard", cardId: discarded.id }).state;
    expect(g.discards[0]).toMatchObject({
      fromPlayerId: "p0",
      toPlayerId: "p3",
      pickedUp: false,
    });
    g = run(g, { type: "draw", source: "discard" }).state;
    expect(g.players[3].hand.some((c) => c.id === discarded.id)).toBe(true);
    expect(g.discards[0].pickedUp).toBe(true);
  });
  it("supports Soa discarding to the human player", () => {
    let g = createGame(5, false, () => 0.999999);
    g.currentPlayerIndex = 1;
    g = run(g, { type: "draw", source: "stock" }).state;
    g = run(g, { type: "discard", cardId: g.players[1].hand[0].id }).state;
    expect(g.currentPlayerIndex).toBe(0);
    expect(g.discards[0].toPlayerId).toBe("p0");
  });
  it("plays a full guided winning turn", () => {
    let g = run(createGame(4, true), { type: "draw", source: "stock" }).state;
    for (const [i, cardIds] of DEMO_GROUPS.entries()) {
      const result = run(g, {
        type: "meld",
        meld: {
          id: String(i),
          cardIds,
          kind: i === 0 || i === 2 ? "run" : "set",
          useJokers: false,
        },
      });
      expect(result.result.ok).toBe(true);
      g = result.state;
    }
    const result = run(g, {
      type: "declare",
      pattern: 13,
    });
    expect(result.result.ok).toBe(true);
    expect(result.state.phase).toBe("finished");
    expect(result.state.players[0].hand).toHaveLength(13);
    expect(result.state.result?.playerId).toBe("p0");
    expect(result.state.discards.at(-1)).toMatchObject({
      card: { id: "0-diamonds-12" },
      fromPlayerId: "p0",
      toPlayerId: "p3",
    });
    const invalid = structuredClone(g);
    invalid.players[0].melds.pop();
    const rejected = run(invalid, { type: "declare", pattern: 13 });
    expect(rejected.result.ok).toBe(false);
    expect(rejected.state).toEqual(invalid);
  });
  it("exposes ten without ending the round, discarding or changing turn; can later win at thirteen", () => {
    let g = run(createGame(5, true), { type: "draw", source: "stock" }).state;
    for (const [i, cardIds] of DEMO_GROUPS.slice(0, 3).entries())
      g = run(g, {
        type: "meld",
        meld: {
          id: String(i),
          cardIds,
          kind: i === 0 || i === 2 ? "run" : "set",
          useJokers: false,
        },
      }).state;
    const result = run(g, { type: "expose" });
    expect(result.result.ok).toBe(true);
    const exposed = result.state;
    expect(exposed.phase).toBe("discard");
    expect(exposed.result).toBeUndefined();
    expect(exposed.currentPlayerIndex).toBe(g.currentPlayerIndex);
    expect(exposed.players[0].hand).toEqual(g.players[0].hand);
    expect(exposed.discards).toEqual(g.discards);
    expect(toGameView(exposed, "p1").players[0].exposedCards).toHaveLength(10);
    expect(toGameView(exposed, "p1").players[0]).not.toHaveProperty("hand");
    const continued = run(exposed, {
      type: "discard",
      cardId: "0-diamonds-12",
    }).state;
    expect(continued.currentPlayerIndex).toBe(4);
    expect(continued.phase).toBe("draw");
    expect(continued.players[0].exposedMeldIds).toHaveLength(3);
    const edited = run(exposed, { type: "unmeld", meldId: "0" }).state;
    expect(toGameView(edited, "p1").players[0].exposedCards).toHaveLength(0);
    const completed = run(exposed, {
      type: "meld",
      meld: { id: "3", cardIds: DEMO_GROUPS[3], kind: "set", useJokers: false },
    }).state;
    expect(
      run(completed, {
        type: "declare",
        pattern: 13,
        discardId: "0-diamonds-12",
      }).state.result?.pattern,
    ).toBe(13);
  });
  it("rejects invalid exposure without changing state", () => {
    const g = createGame(4, false, () => 0.999999);
    const result = run(g, { type: "expose" });
    expect(result.result.ok).toBe(false);
    expect(result.state).toBe(g);
  });
  it("rejects legacy ten-card winning commands at runtime", () => {
    const g = createGame(4, false, () => 0.999999);
    const result = run(g, {
      type: "declare",
      pattern: 10,
    } as unknown as GameCommand);
    expect(result.result.ok).toBe(false);
    expect(result.state).toBe(g);
  });
  it("failed declaration does not consume the selected discard", () => {
    const g = run(createGame(4, false, () => 0.999999), { type: "draw", source: "stock" }).state;
    const result = run(g, {
      type: "declare",
      pattern: 13,
      discardId: g.players[0].hand[0].id,
    });
    expect(result.result.ok).toBe(false);
    expect(result.state).toBe(g);
    expect(g.players[0].hand).toHaveLength(14);
  });
  it("ends a round when stock runs out without recycling history", () => {
    const g = createGame(4, false, () => 0.999999);
    g.stock = g.stock.slice(0, 1);
    const drawn = run(g, { type: "draw", source: "stock" }).state;
    expect(
      run(drawn, { type: "discard", cardId: drawn.players[0].hand[0].id }).state
        .result?.playerId,
    ).toBeUndefined();
    expect(
      run(drawn, { type: "discard", cardId: drawn.players[0].hand[0].id }).state
        .phase,
    ).toBe("finished");
  });
  it("redacts stock and other hands from public snapshots", () => {
    const view = toGameView(createGame(4, false, () => 0.999999), "p0");
    expect(view).not.toHaveProperty("stock");
    expect(view.players[0].hand).toHaveLength(13);
    expect(view.players[1]).not.toHaveProperty("hand");
  });
  it("simulates a complete rotation then returns control to the human", async () => {
    vi.useFakeTimers();
    const service = new LocalGameService();
    async function dispatch(command: GameCommand) {
      const s = service.getSnapshot();
      return service.dispatch({
        gameId: s.id,
        expectedRevision: s.revision,
        commandId: crypto.randomUUID(),
        playerId: "p0",
        command,
      });
    }
    await dispatch({ type: "draw", source: "stock" });
    await dispatch({
      type: "discard",
      cardId: service.getSnapshot().players[0].hand![0].id,
    });
    await vi.advanceTimersByTimeAsync(6000);
    const s = service.getSnapshot();
    expect(s.currentPlayerIndex).toBe(0);
    expect(s.discards).toHaveLength(4);
    expect(s.players.every((p) => p.cardCount === 13)).toBe(true);
    service.dispose();
    vi.useRealTimers();
  });
});

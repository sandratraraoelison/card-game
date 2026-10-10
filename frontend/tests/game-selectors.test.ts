import { describe, it, expect } from "vitest";
import { createGame, DEMO_GROUPS, toGameView } from "@rami/game";
import {
  reorderBefore,
  selectGameView,
  selectJokerSuits,
} from "../src/features/game/application/game-selectors";

describe("presentation selectors respect domain rules and viewer identity", () => {
  it("keeps chronological discards including picked-up cards for every seat", () => {
    const game = createGame(4);
    game.discards = [
      {
        id: "d1",
        card: game.players[2].hand[0],
        fromPlayerId: "p2",
        toPlayerId: "p1",
        turn: 1,
        pickedUp: true,
      },
      {
        id: "d2",
        card: game.players[1].hand[0],
        fromPlayerId: "p1",
        toPlayerId: "p0",
        turn: 4,
        pickedUp: false,
      },
      {
        id: "d3",
        card: game.players[2].hand[1],
        fromPlayerId: "p2",
        toPlayerId: "p1",
        turn: 5,
        pickedUp: false,
      },
    ];
    const view = selectGameView(toGameView(game, "p0"), "p0", [], false);
    expect(view.received.map((card) => card.id)).toEqual(["d2"]);
    expect(view.opponents[0].received.map((card) => card.id)).toEqual([
      "d1",
      "d3",
    ]);
    expect(view.opponents[0].received[0].pickedUp).toBe(true);
    expect(view.opponents[0].fromName).toBe("Hery");
  });
  it("finds the current viewer without assuming they occupy seat zero", () => {
    const game = createGame(5);
    game.currentPlayerIndex = 3;
    const view = selectGameView(toGameView(game, "p3"), "p3", [], false);
    expect(view.me.id).toBe("p3");
    expect(view.myTurn).toBe(true);
    expect(view.previousPlayerName).toBe("Fara");
    expect(view.opponents.map((player) => player.id)).toEqual([
      "p0",
      "p1",
      "p2",
      "p4",
    ]);
  });
  it("only highlights a valid available selection and valid prepared groups", () => {
    const game = createGame(4, true),
      snapshot = toGameView(game, "p0");
    expect(
      selectGameView(snapshot, "p0", DEMO_GROUPS[0].slice(0, 3), false)
        .validSelection,
    ).toBe(true);
    expect(
      selectGameView(
        snapshot,
        "p0",
        [...DEMO_GROUPS[0].slice(0, 3), "0-spades-9"],
        false,
      ).validSelection,
    ).toBe(false);
    snapshot.players[0].melds = [
      { id: "run", cardIds: DEMO_GROUPS[0], kind: "run", useJokers: false },
    ];
    const view = selectGameView(snapshot, "p0", DEMO_GROUPS[0], false);
    expect(view.validSelection).toBe(false);
    expect([...view.validCards]).toEqual(
      expect.arrayContaining(DEMO_GROUPS[0]),
    );
    expect(view.melds[0]).toMatchObject({
      title: "Suite",
      natural: true,
      valid: true,
    });
  });
  it("derives joker suits from the drawn reference without replacing it", () => {
    const ref = {
      id: "reference",
      rank: 4 as const,
      suit: "spades" as const,
      copy: 0 as const,
    };
    expect(selectJokerSuits(ref)).toEqual({
      trueSuits: ["hearts", "diamonds"],
      falseSuits: ["spades", "clubs"],
    });
    expect(ref.suit).toBe("spades");
  });
  it("moves one unique exemplar without mutating cards or losing duplicates", () => {
    const hand = createGame().players[0].hand,
      original = hand.map((card) => card.id);
    expect(reorderBefore(hand, original[0], original[3]).slice(0, 4)).toEqual([
      original[1],
      original[2],
      original[0],
      original[3],
    ]);
    expect(reorderBefore(hand, original[0]).at(-1)).toBe(original[0]);
    expect(reorderBefore(hand, "missing")).toEqual(original);
    expect(reorderBefore(hand, original[0], original[0])).toEqual(original);
    expect(hand.map((card) => card.id)).toEqual(original);
  });
});

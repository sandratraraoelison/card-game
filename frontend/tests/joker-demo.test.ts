import { describe, expect, it } from "vitest";
import { createJokerWinDemo, jokerKind, validateFinish, validateMeld } from "@rami/game";
import { LocalGameService } from "../src/features/game/infrastructure/local-game-service";

describe("completed joker simulation", () => {
  for (const count of [4, 5] as const) {
    it(`wins with substitution and conserves all 104 cards with ${count} players`, () => {
      const state = createJokerWinDemo(count);
      const player = state.players[0];
      expect(state.phase).toBe("finished");
      expect(state.result).toMatchObject({ playerId: player.id, pattern: 13 });
      expect(state.result?.reason).toContain("avec jokers");
      expect(state.players).toHaveLength(count);
      expect(state.players.every(p => p.hand.length === 13)).toBe(true);
      expect(state.reference.id).toBe("0-spades-4");
      expect(state.discards).toHaveLength(1);
      expect(state.discards[0].card.id).toBe("0-diamonds-12");
      expect(state.stock).toHaveLength(102 - count * 13);
      const allCards = [state.reference, ...state.stock,
        ...state.players.flatMap(p => p.hand), ...state.discards.map(d => d.card)];
      expect(allCards).toHaveLength(104);
      expect(new Set(allCards.map(c => c.id)).size).toBe(104);
      expect(validateFinish(player.hand, player.melds, 13, state.reference)).toEqual({
        valid: true, natural: false,
      });

      const jokerRun = player.melds.find(m => m.useJokers)!;
      const runCards = jokerRun.cardIds.map(id => player.hand.find(c => c.id === id)!);
      expect(jokerKind(runCards[2], state.reference)).toBe("true");
      expect(validateMeld(runCards, "run", true, state.reference).valid).toBe(true);
      expect(validateMeld(runCards, "run", false, state.reference).valid).toBe(false);
      expect(player.melds.filter(m => !m.useJokers)).toHaveLength(3);
    });
  }

  it("initializes the local service with the finished simulation", () => {
    const service = new LocalGameService(5, true, "joker-win");
    try {
      const snapshot = service.getSnapshot();
      expect(snapshot.mode).toBe("local");
      expect(snapshot.demo).toBe(true);
      expect(snapshot.phase).toBe("finished");
      expect(snapshot.players[0].melds.some(m => m.useJokers)).toBe(true);
      expect(snapshot.players[1].hand).toBeUndefined();
    } finally {
      service.dispose();
    }
  });
});

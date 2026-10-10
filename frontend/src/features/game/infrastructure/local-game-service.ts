import {
  applyCommand,
  Card,
  CommandEnvelope,
  CommandResult,
  createGame,
  createJokerWinDemo,
  DEMO_GROUPS,
  GameService,
  GameView,
  jokerKind,
  toGameView,
} from "@rami/game";
export type LocalDemoScenario = "exposure" | "joker-win";
/** Owns local state and bot scheduling. Replace this adapter for NestJS. */
export class LocalGameService implements GameService {
  readonly mode = "local" as const;
  readonly playerId = "p0";
  private state;
  private snapshot: GameView;
  private listeners = new Set<() => void>();
  private timer?: ReturnType<typeof setTimeout>;
  private disposed = false;
  constructor(count: 4 | 5 = 4, demo = false, scenario?: LocalDemoScenario) {
    this.state = scenario === "joker-win" ? createJokerWinDemo(count) : createGame(count, demo);
    if (demo && scenario === "exposure") {
      const commands: import("@rami/game").GameCommand[] = [
        ...DEMO_GROUPS.slice(0, 3).map((cardIds, index) => ({
          type: "meld" as const,
          meld: { id: `demo-${index}`, cardIds, kind: index === 1 ? "set" as const : "run" as const, useJokers: false },
        })),
        { type: "expose" },
      ];
      for (const command of commands) {
        const applied = applyCommand(this.state, { gameId: this.state.id, playerId: this.playerId, expectedRevision: this.state.revision, commandId: crypto.randomUUID(), command });
        if (!applied.result.ok) throw new Error(applied.result.error);
        this.state = applied.state;
      }
    }
    this.snapshot = toGameView(this.state, this.playerId);
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  dispatch = async (envelope: CommandEnvelope): Promise<CommandResult> => {
    if (this.disposed) return { ok: false, error: "Cette partie est fermée." };
    const applied = applyCommand(this.state, envelope);
    if (applied.result.ok) {
      this.state = applied.state;
      this.snapshot = toGameView(this.state, this.playerId);
      this.listeners.forEach((listener) => listener());
      this.scheduleBot();
    }
    return applied.result;
  };
  private scheduleBot() {
    clearTimeout(this.timer);
    const p = this.state.players[this.state.currentPlayerIndex];
    if (this.state.phase === "finished" || !p.simulated || this.disposed)
      return;
    this.timer = setTimeout(() => {
      const score = (card: Card) =>
        p.hand.filter(
          (c) =>
            c.id !== card.id &&
            (c.rank === card.rank ||
              (c.suit === card.suit && Math.abs(c.rank - card.rank) <= 2)),
        ).length + (jokerKind(card, this.state.reference) === "true" ? 6 : 0);
      const leastUseful = [...p.hand].sort((a, b) => score(a) - score(b))[0];
      void this.dispatch({
        gameId: this.state.id,
        playerId: p.id,
        expectedRevision: this.state.revision,
        commandId: crypto.randomUUID(),
        command:
          this.state.phase === "draw"
            ? { type: "draw", source: "stock" }
            : { type: "discard", cardId: leastUseful.id },
      });
    }, 850);
  }
  dispose() {
    this.disposed = true;
    clearTimeout(this.timer);
    this.listeners.clear();
  }
}

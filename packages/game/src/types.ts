export const SUITS = ["spades", "clubs", "hearts", "diamonds"] as const;
export type Suit = (typeof SUITS)[number];
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
export interface Card {
  id: string;
  rank: Rank;
  suit: Suit;
  copy: 0 | 1;
}
export type JokerKind = "true" | "false" | "none";
export interface Meld {
  id: string;
  cardIds: string[];
  kind: "set" | "run";
  useJokers: boolean;
}
export interface RulesConfig {
  ace: "low" | "low-or-high";
  distinctSuitsInSets: boolean;
  referenceCard: "removed" | "returned";
  allowDiscardPickup: boolean;
}
export const DEFAULT_RULES: RulesConfig = {
  ace: "low-or-high",
  distinctSuitsInSets: true,
  referenceCard: "removed",
  allowDiscardPickup: true,
};
export interface Player {
  id: string;
  name: string;
  simulated: boolean;
  hand: Card[];
  melds: Meld[];
  exposedMeldIds: string[];
}
export interface Discard {
  id: string;
  card: Card;
  fromPlayerId: string;
  toPlayerId: string;
  turn: number;
  pickedUp: boolean;
}
export interface GameState {
  id: string;
  revision: number;
  mode: "local" | "remote";
  players: Player[];
  reference: Card;
  stock: Card[];
  discards: Discard[];
  currentPlayerIndex: number;
  phase: "draw" | "discard" | "finished";
  turn: number;
  rules: RulesConfig;
  result?: { playerId?: string; pattern?: 13; victory?: 'jokers-deal' | 'jokers-play'; reason: string };
  log: string[];
  demo: boolean;
}
export type GameCommand =
  | { type: "draw"; source: "stock" | "discard" }
  | { type: "discard"; cardId: string }
  | { type: "reorder"; cardIds: string[] }
  | { type: "meld"; meld: Meld }
  | { type: "unmeld"; meldId: string }
  | { type: "expose"; melds?: Meld[] }
  | { type: "declare"; pattern: 13; discardId?: string; melds?: Meld[] };
export interface CommandEnvelope {
  gameId: string;
  playerId: string;
  expectedRevision: number;
  commandId: string;
  command: GameCommand;
}
export type CommandResult = { ok: true } | { ok: false; error: string };
// Public transport contract: hide opponents' hands and stock order, except the revealed miette.
export interface PlayerView extends Omit<Player, "hand"> {
  hand?: Card[];
  cardCount: number;
  exposedCards: Card[];
}
export interface GameView extends Omit<GameState, "stock" | "players"> {
  stockCount: number;
  miette?: Card;
  players: PlayerView[];
}
export interface GameService {
  readonly mode: "local" | "remote";
  readonly playerId: string;
  getSnapshot(): GameView;
  subscribe(listener: () => void): () => void;
  dispatch(command: CommandEnvelope): Promise<CommandResult>;
  dispose(): void;
}
export interface RoomSummary {
  stake?: number;
  pot?: number;
  carryover?: number;
  finishCarryover?: number;
  exposurePrize?: number;
  finishPrize?: number;
  exposureWinnerId?: string;
  id: string;
  name: string;
  playerCount: number;
  capacity: 4 | 5;
  status: "waiting" | "playing";
}
export interface PlayerAccount {
  balance?: number;
  id: string;
  displayName: string;
  avatarUrl?: string;
}
export type ServerEvent =
  | { type: "game.snapshot"; snapshot: GameView }
  | { type: "command.rejected"; commandId: string; message: string };

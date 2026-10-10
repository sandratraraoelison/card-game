import type { OpponentView } from "../application/game-selectors";
import { CardBack } from "@/shared/components/cards/playing-card";

import { PlayerDiscards } from "./player-discards";

export function PlayerSeat({
  player,
  index,
  onHistory,
}: {
  player: OpponentView;
  index: number;
  onHistory: () => void;
}) {
  return (
    <div className={`opponent ${player.active ? "is-turn" : ""}`}>
      <div className="opponent-identity">
        <span className={`avatar avatar-${index}`}>{player.name[0]}</span>
        <div>
          <strong>
            {player.name} {player.active && <i className="turn-dot" />}
          </strong>
          <small>
            {player.simulated ? "Joueur simulé" : "Joueur"} · {player.cardCount}{" "}
            cartes
          </small>
        </div>
      </div>
      <div className="opponent-hand">
        {Array.from({ length: Math.min(5, player.cardCount) }, (_, i) => (
          <CardBack key={i} />
        ))}
      </div>
      <PlayerDiscards
        playerName={player.name}
        fromName={player.fromName}
        discards={player.received}
        onHistory={onHistory}
      />
    </div>
  );
}

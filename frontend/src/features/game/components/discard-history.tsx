import { previousPlayerIndex } from "@rami/game";
import type { GameView } from "@rami/game";
import { PlayingCard } from "@/shared/components/cards/playing-card";

export function DiscardHistory({ game }: { game: GameView }) {
  return (
    <div className="history-grid">
      {game.players.map((player) => (
        <div className="history-player" key={player.id}>
          <h3>Devant {player.name}</h3>
          <p>
            Défaussées par{" "}
            {
              game.players[
                previousPlayerIndex(game.players.indexOf(player), game.players.length)
              ].name
            }
          </p>
          <div>
            {game.discards
              .filter((d) => d.toPlayerId === player.id)
              .map((d) => (
                <figure key={d.id} className={d.pickedUp ? "picked-up" : ""}>
                  <PlayingCard card={d.card} small />
                  <figcaption>
                    Tour {d.turn}
                    {d.pickedUp ? " · reprise" : ""}
                  </figcaption>
                </figure>
              ))}
          </div>
          {!game.discards.some((d) => d.toPlayerId === player.id) && (
            <small>Aucune carte pour le moment.</small>
          )}
        </div>
      ))}
    </div>
  );
}

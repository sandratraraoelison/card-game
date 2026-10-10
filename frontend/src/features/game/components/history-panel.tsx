import type { GameView } from "@rami/game";
import { DiscardHistory } from "./discard-history";

export function HistoryPanel({ game }: { game: GameView }) {
  return (
    <section className="content-panel">
      <div className="section-heading">
        <h2>Les cartes déjà jouées</h2>
        <span>{game.discards.length} défausses</span>
      </div>
      <p className="muted">
        Chaque carte est placée devant le joueur suivant. Les cartes reprises
        restent signalées ici.
      </p>
      <DiscardHistory game={game} />
      <h3 className="mt-8 mb-3 font-semibold">Journal de la manche</h3>
      <ol className="journal">
        {game.log.map((line, index) => (
          <li key={`${index}-${line}`}>{line}</li>
        ))}
      </ol>
    </section>
  );
}

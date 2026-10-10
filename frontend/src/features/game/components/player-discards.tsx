import type { Discard } from "@rami/game";
import { PlayingCard } from "@/shared/components/cards/playing-card";
import styles from "./player-discards.module.css";

/** The whole chronological collection, including picked-up cards, for any seat. */
export function PlayerDiscards({
  playerName,
  fromName,
  discards,
  onHistory,
  takeableDiscardId,
  onTakeDiscard,
}: {
  playerName: string;
  fromName: string;
  discards: Discard[];
  onHistory: () => void;
  takeableDiscardId?: string;
  onTakeDiscard?: () => void;
}) {
  return (
    <section
      className={styles.collection}
      aria-label={`Cartes défaussées devant ${playerName}`}
    >
      <button
        className={styles.heading}
        onClick={onHistory}
        aria-label={`Défausses devant ${playerName}`}
      >
        {discards.length
          ? `${discards.length} défausse(s) de ${fromName}`
          : `↳ Défausses de ${fromName}`}{" "}
        ↗
      </button>
      {discards.length > 0 && (
        <ul
          className={styles.cards}
          aria-label={`Défausses de ${fromName}`}
          tabIndex={0}
        >
          {discards.map((discard) => (
            <li
              key={discard.id}
              className={discard.pickedUp ? styles.pickedUp : undefined}
              title={`De ${fromName} · Tour ${discard.turn}${discard.pickedUp ? " · Carte reprise" : ""}`}
            >
              <PlayingCard card={discard.card} small onClick={discard.id === takeableDiscardId ? onTakeDiscard : undefined} />
              <span>Tour {discard.turn}</span>
              {discard.id === takeableDiscardId && <strong>Prendre</strong>}
              {discard.pickedUp && <strong>Reprise</strong>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

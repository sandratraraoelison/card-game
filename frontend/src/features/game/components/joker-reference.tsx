import { Card, rankLabel, suitLabels } from "@rami/game";
import { selectJokerSuits } from "../application/game-selectors";
import { PlayingCard } from "@/shared/components/cards/playing-card";
import styles from "./joker-reference.module.css";

/** Displays the actual drawn reference; never fabricates a substituting joker. */
export function JokerReference({ card }: { card: Card }) {
  const { trueSuits, falseSuits } = selectJokerSuits(card);
  return (
    <div
      className={`joker-reference ${styles.reference}`}
      aria-label="Carte tirée de référence des jokers"
    >
      <span className="table-label">CARTE DE RÉFÉRENCE</span>
      <div className={`reference-card ${styles.card}`}>
        <PlayingCard card={card} />
        <span>✦</span>
      </div>
      <strong>Les {rankLabel(card.rank)} sont désignés</strong>
      <p>
        <span className="true-legend">Vrais</span>{" "}
        {trueSuits.map((suit) => suitLabels[suit]).join(" & ")}
        <br />
        <span className="false-legend">Faux</span>{" "}
        {falseSuits.map((suit) => suitLabels[suit]).join(" & ")}
      </p>
    </div>
  );
}

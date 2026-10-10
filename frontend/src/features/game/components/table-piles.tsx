import type { Card } from "@rami/game";
import { CardBack, PlayingCard } from "@/shared/components/cards/playing-card";
import { JokerReference } from "./joker-reference";
import styles from "./table-piles.module.css";

interface TablePilesProps {
  reference: Card;
  stockCount: number;
  miette?: Card;
  discardCard?: Card;
  discardFrom?: string;
  canDraw: boolean;
  canTakeDiscard: boolean;
  onDraw: (source: "stock" | "discard") => void;
}
export function TablePiles({
  reference,
  stockCount,
  miette,
  discardCard,
  discardFrom,
  canDraw,
  canTakeDiscard,
  onDraw,
}: TablePilesProps) {
  return (
    <div className={`table-piles ${styles.piles}`}>
      <div className={styles.slot}>
        <button
          className="deck-button"
          aria-label="Piocher une carte"
          disabled={!canDraw || stockCount <= 1}
          onClick={() => onDraw("stock")}
        >
          <CardBack />
          <span className="stock-count">{stockCount}</span>
        </button>
        <span className="table-label">PIOCHE</span>
        {miette && <div className="miette" aria-label="La miette, dernière carte non jouable">
          <PlayingCard card={miette} small />
          <span>La miette · non jouable</span>
        </div>}
      </div>
      <JokerReference card={reference} />
      <div className={styles.slot}>
        <button
          className="discard-pile"
          aria-label="Prendre la dernière défausse"
          disabled={!canTakeDiscard}
          onClick={() => onDraw("discard")}
        >
          {discardCard ? <PlayingCard card={discardCard} /> : <span>♧</span>}
        </button>
        <span className="table-label">
          DÉFAUSSE {discardFrom ? `· ${discardFrom}` : ""}
        </span>
      </div>
    </div>
  );
}

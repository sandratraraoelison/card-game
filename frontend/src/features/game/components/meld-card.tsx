import type { MeldView } from "../application/game-selectors";
import { PlayingCard } from "@/shared/components/cards/playing-card";

export function MeldCard({
  meld,
  index,
  onRemove,
  disabled = false,
}: {
  meld: MeldView;
  index: number;
  onRemove?: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`meld-group ${meld.valid ? "valid-combination" : ""}`}>
      <div className="meld-title">
        <strong>
          {meld.title} <small>{meld.natural ? "Naturel" : "Joker"}</small>
        </strong>
        {onRemove && (
          <button
            aria-label={`Retirer la combinaison ${index + 1}`}
            disabled={disabled}
            onClick={() => onRemove(meld.id)}
          >
            ×
          </button>
        )}
      </div>
      <div className="meld-cards">
        {meld.cards.map((card) => (
          <PlayingCard key={card.id} card={card} small />
        ))}
      </div>
    </div>
  );
}

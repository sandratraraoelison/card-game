import type { MeldView } from "../application/game-selectors";
import { MeldCard } from "./meld-card";
import { PlayingCard } from "@/shared/components/cards/playing-card";

export function MeldPanel({
  melds,
  suggestions,
  onAccept,
  disabled,
  onRemove,
  onExpose,
  onFinish,
}: {
  melds: MeldView[];
  suggestions: MeldView[];
  onAccept: (id: string) => void;
  disabled: boolean;
  onRemove: (id: string) => void;
  onExpose: () => void;
  onFinish: () => void;
}) {
  return (
    <section className="meld-section">
      <div className="section-heading">
        <h2>
          Vos combinaisons{" "}
          <span className="count-pill">
            {[...melds, ...suggestions].reduce(
              (count, meld) => count + meld.cards.length,
              0,
            )}{" "}
            cartes
          </span>
        </h2>
        <span className="muted">
          Groupes préparés et détectés · validation à la déclaration
        </span>
      </div>
      <div className="meld-grid">
        {Array.from({ length: Math.max(4, melds.length) }, (_, index) =>
          melds[index] ? (
            <MeldCard
              key={melds[index].id}
              meld={melds[index]}
              index={index}
              onRemove={onRemove}
              disabled={disabled}
            />
          ) : suggestions[index - melds.length] ? (
            <div
              className="suggested-meld valid-combination"
              key={suggestions[index - melds.length].id}
            >
              <div className="meld-title">
                <strong>
                  {suggestions[index - melds.length].title} · Détecté
                </strong>
              </div>
              <div className="meld-cards">
                {suggestions[index - melds.length].cards.map((card) => (
                  <PlayingCard key={card.id} card={card} small />
                ))}
              </div>
              <button
                className="button secondary"
                disabled={disabled}
                onClick={() => onAccept(suggestions[index - melds.length].id)}
              >
                Confirmer la combinaison
              </button>
            </div>
          ) : (
            <div className="empty-meld" key={`empty-${index}`}>
              <span>＋</span>
              <strong>{index === 0 ? "4 cartes" : "3 cartes"}</strong>
              <small>
                {
                  [
                    "Suite ou carré",
                    "Tri naturel requis à 13",
                    "Suite naturelle requise à 13",
                    "Suite ou tri",
                  ][index]
                }
              </small>
            </div>
          ),
        )}
      </div>
      <div className="finish-bar">
        <p>
          <span>✦</span> Une belle main ? Faites votre déclaration.
          <small>La carte restante sera défaussée automatiquement.</small>
        </p>
        <div>
          <button
            className="button secondary"
            disabled={disabled}
            onClick={onExpose}
          >
            Afficher 10 cartes
          </button>
          <button
            className="button primary"
            disabled={disabled}
            onClick={onFinish}
          >
            Terminer à 13 <span>✦</span>
          </button>
        </div>
      </div>
    </section>
  );
}

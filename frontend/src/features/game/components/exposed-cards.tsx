import type { Card } from "@rami/game";
import { PlayingCard } from "@/shared/components/cards/playing-card";

export function ExposedCards({
  playerName,
  cards,
}: {
  playerName: string;
  cards: Card[];
}) {
  if (!cards.length) return null;
  return (
    <section
      className="content-panel exposed-cards"
      aria-label={`Cartes exposées par ${playerName}`}
    >
      <h2 className="font-semibold">
        {playerName} · {cards.length} cartes exposées
      </h2>
      <p className="muted">
        Combinaisons naturelles · La manche continue. Seules 13 cartes
        permettent de gagner.
      </p>
      <div className="flex flex-wrap gap-2">
        {cards.map((card) => (
          <PlayingCard key={card.id} card={card} small />
        ))}
      </div>
    </section>
  );
}

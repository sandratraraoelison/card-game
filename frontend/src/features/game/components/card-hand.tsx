import type { RefObject } from "react";
import type { Card } from "@rami/game";
import type { useCardGestures } from "../hooks/use-card-gestures";
import { PlayingCard } from "@/shared/components/cards/playing-card";

export interface CardHandProps {
  cards: Card[];
  reference: Card;
  selected: string[];
  grouped: ReadonlySet<string>;
  valid: ReadonlySet<string>;
  handRef: RefObject<HTMLDivElement | null>;
  gestures: ReturnType<typeof useCardGestures>;
  onSelect: (id: string) => void;
  onDiscard: (id: string) => void;
  showAll?: boolean;
}
export function CardHand({
  cards,
  reference,
  selected,
  grouped,
  valid,
  handRef,
  gestures,
  onSelect,
  onDiscard,
  showAll = false,
}: CardHandProps) {
  return (
    <div className={`hand-cards${showAll ? " hand-cards-all" : ""}`} ref={handRef}>
      {cards.map((card) => (
        <PlayingCard
          key={card.id}
          card={card}
          reference={reference}
          selected={selected.includes(card.id)}
          grouped={grouped.has(card.id)}
          valid={valid.has(card.id)}
          dragging={gestures.drag?.cardId === card.id}
          dropBefore={
            gestures.drag?.beforeId === card.id && !gestures.drag.overTable
          }
          onClick={() => {
            if (!gestures.consumeClick()) onSelect(card.id);
          }}
          onDoubleClick={() => onDiscard(card.id)}
          onPointerDown={(event) => gestures.onPointerDown(event, card.id)}
          onPointerMove={gestures.onPointerMove}
          onPointerUp={gestures.onPointerUp}
          onPointerCancel={gestures.onPointerCancel}
        />
      ))}
    </div>
  );
}

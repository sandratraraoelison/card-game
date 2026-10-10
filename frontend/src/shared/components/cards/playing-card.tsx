import { Card, cardLabel, jokerKind } from "@rami/game";
import type { PointerEventHandler } from "react";
export function PlayingCard({
  card,
  reference,
  selected,
  grouped,
  small = false,
  onClick,
  onDoubleClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  valid = false,
  dragging = false,
  dropBefore = false,
}: {
  card: Card;
  reference?: Card;
  selected?: boolean;
  grouped?: boolean;
  small?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onPointerDown?: PointerEventHandler<HTMLButtonElement>;
  onPointerMove?: PointerEventHandler<HTMLButtonElement>;
  onPointerUp?: PointerEventHandler<HTMLButtonElement>;
  onPointerCancel?: PointerEventHandler<HTMLButtonElement>;
  valid?: boolean;
  dragging?: boolean;
  dropBefore?: boolean;
}) {
  const joker = reference ? jokerKind(card, reference) : "none";
  const label = `${cardLabel(card)}, exemplaire ${card.copy + 1}${joker === "true" ? ", vrai joker" : joker === "false" ? ", faux joker" : ""}${grouped ? ", en combinaison" : ""}`;
  const content = (
    <>
      {/* Local, original vector assets. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/cards/${card.suit}-${card.rank}.svg`}
        alt={label}
        width={100}
        height={144}
        draggable={false}
      />
      {joker !== "none" && (
        <span
          className={`joker-mark ${joker}`}
          title={
            joker === "true"
              ? "Vrai joker : substitution possible"
              : "Faux joker : valeur d’origine uniquement"
          }
        >
          {joker === "true" ? "VJ" : "FJ"}
        </span>
      )}
      {grouped && <span className="group-mark">✓</span>}
    </>
  );
  return onClick ? (
    <button
      type="button"
      aria-label={label}
      aria-pressed={!!selected}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onContextMenu={
        onPointerDown ? (event) => event.preventDefault() : undefined
      }
      data-card-id={card.id}
      className={`playing-card ${small ? "small" : ""} ${selected ? "selected" : ""} ${grouped ? "grouped" : ""} ${valid ? "valid-combination" : ""} ${dragging ? "drag-origin" : ""} ${dropBefore ? "drop-before" : ""} ${onPointerDown ? "gesture-card" : ""}`}
    >
      {content}
    </button>
  ) : (
    <span className={`playing-card static ${small ? "small" : ""}`}>
      {content}
    </span>
  );
}
export function CardBack() {
  return (
    <span className="card-back" aria-hidden="true">
      <span>✦</span>
    </span>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from "react";

type DragView = {
  cardId: string;
  x: number;
  y: number;
  overTable: boolean;
  beforeId?: string;
};
type Gesture = {
  cardId: string;
  pointerId: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  active: boolean;
  scrolling: boolean;
  timer?: ReturnType<typeof setTimeout>;
};
export type CardDrop =
  | { type: "discard"; cardId: string }
  | { type: "reorder"; cardId: string; beforeId?: string };

/** One pointer flow for mouse, pen and touch. Touch scrolling never becomes a discard. */
export function useCardGestures(
  handRef: RefObject<HTMLDivElement | null>,
  onDrop: (drop: CardDrop) => void,
) {
  const [drag, setDrag] = useState<DragView | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);

  const locate = useCallback(
    (g: Gesture): DragView => {
      const overTable = document
        .elementsFromPoint(g.x, g.y)
        .some((el) => el.closest("[data-discard-zone]"));
      const cards =
        handRef.current?.querySelectorAll<HTMLElement>("[data-card-id]") ?? [];
      const positions = Array.from(cards).map(el => ({ el, rect: el.getBoundingClientRect() }));
      // Choose the nearest row before comparing columns, including in the full-hand grid.
      const nearest = positions.reduce<typeof positions[number] | undefined>((best, card) => {
        const distance = Math.abs(g.y - (card.rect.top + card.rect.bottom) / 2);
        const bestDistance = best ? Math.abs(g.y - (best.rect.top + best.rect.bottom) / 2) : Infinity;
        return distance < bestDistance ? card : best;
      }, undefined);
      const rowTop = nearest?.rect.top;
      const beforeId = positions.find(({ el, rect }) =>
        el.dataset.cardId !== g.cardId && rowTop !== undefined &&
        (rect.top > rowTop + 15 || (Math.abs(rect.top - rowTop) <= 15 && g.x < rect.left + rect.width / 2))
      )?.el.dataset.cardId;
      return { cardId: g.cardId, x: g.x, y: g.y, overTable, beforeId };
    },
    [handRef],
  );
  function cancel() {
    if (gesture.current) {
      clearTimeout(gesture.current.timer);
      suppressClick.current ||=
        gesture.current.active || gesture.current.scrolling;
    }
    gesture.current = null;
    setDrag(null);
  }
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel();
    };
    const blur = () => cancel();
    window.addEventListener("keydown", escape);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", escape);
      window.removeEventListener("blur", blur);
      clearTimeout(gesture.current?.timer);
    };
  }, []);
  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    let frame: number;
    const tick = () => {
      const g = gesture.current;
      if (!g?.active) return;
      const hand = handRef.current,
        rect = hand?.getBoundingClientRect();
      const inHand =
        rect &&
        g.x >= rect.left &&
        g.x <= rect.right &&
        g.y >= rect.top &&
        g.y <= rect.bottom;
      // Reordering near a viewport edge must not scroll the hand away from the pointer.
      if (!inHand) {
        if (g.y < 65) window.scrollBy(0, -10);
        else if (g.y > window.innerHeight - 65) window.scrollBy(0, 10);
      }
      if (hand && rect && inHand) {
        if (g.x < rect.left + 35) hand.scrollLeft -= 9;
        else if (g.x > rect.right - 35) hand.scrollLeft += 9;
      }
      setDrag(locate(g));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [dragging, handRef, locate]);

  function onPointerDown(
    event: PointerEvent<HTMLButtonElement>,
    cardId: string,
  ) {
    if (!event.isPrimary || event.button !== 0 || gesture.current) return;
    suppressClick.current = false;
    const g: Gesture = {
      cardId,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      scrolling: false,
    };
    gesture.current = g;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (event.pointerType !== "mouse")
      g.timer = setTimeout(() => {
        if (gesture.current === g && !g.scrolling) {
          g.active = true;
          suppressClick.current = true;
          setDrag(locate(g));
        }
      }, 320);
  }
  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const g = gesture.current;
    if (!g || g.pointerId !== event.pointerId) return;
    const previousX = g.x;
    g.x = event.clientX;
    g.y = event.clientY;
    const moved = Math.hypot(g.x - g.startX, g.y - g.startY) > 8;
    if (!g.active && !g.scrolling && moved) {
      if (event.pointerType === "mouse") g.active = true;
      else if (g.startY - g.y > 16 && Math.abs(g.y - g.startY) > Math.abs(g.x - g.startX) * 1.3) {
        clearTimeout(g.timer);
        g.active = true;
      }
      else {
        if (Math.abs(g.x - g.startX) > 8) {
          clearTimeout(g.timer);
          g.scrolling = true;
        }
      }
    }
    if (g.scrolling) {
      suppressClick.current = true;
      if (handRef.current) handRef.current.scrollLeft += previousX - g.x;
    }
    if (g.active) {
      suppressClick.current = true;
      setDrag(locate(g));
    }
  }
  function onPointerUp(event: PointerEvent<HTMLButtonElement>) {
    const g = gesture.current;
    if (!g || g.pointerId !== event.pointerId) return;
    g.x = event.clientX;
    g.y = event.clientY;
    if (g.active) {
      const destination = locate(g),
        rect = handRef.current?.getBoundingClientRect();
      if (destination.overTable) onDrop({ type: "discard", cardId: g.cardId });
      else if (
        rect &&
        g.x >= rect.left &&
        g.x <= rect.right &&
        g.y >= rect.top &&
        g.y <= rect.bottom
      )
        onDrop({
          type: "reorder",
          cardId: g.cardId,
          beforeId: destination.beforeId,
        });
    }
    cancel();
  }
  return {
    drag,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: cancel,
    consumeClick: () => {
      if (!suppressClick.current) return false;
      suppressClick.current = false;
      return true;
    },
  };
}

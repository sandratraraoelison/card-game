"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { DEMO_GROUPS, GameCommand, GameService, SUITS } from "@rami/game";
import { reorderBefore, selectGameView } from "./game-selectors";

export interface GameFeedback {
  text: string;
  error: boolean;
}

/** Application boundary. Knows the service port, never its local or network implementation. */
export function useGameController(service: GameService) {
  const game = useSyncExternalStore(
    service.subscribe,
    service.getSnapshot,
    service.getSnapshot,
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<GameFeedback | null>(null);
  const [useJokers, setUseJokers] = useState(false);
  const [pending, setPending] = useState(false);
  const commandInFlight = useRef(false);
  const view = selectGameView(game, service.playerId, selected, useJokers);

  async function send(command: GameCommand, success?: string, clear = true) {
    if (commandInFlight.current) return false;
    commandInFlight.current = true;
    setPending(true);
    try {
      const current = service.getSnapshot();
      const result = await service.dispatch({
        gameId: current.id,
        playerId: service.playerId,
        expectedRevision: current.revision,
        commandId: crypto.randomUUID(),
        command,
      });
      setMessage(
        result.ok
          ? success
            ? { text: success, error: false }
            : null
          : { text: result.error, error: true },
      );
      if (result.ok && clear) setSelected([]);
      return result.ok;
    } catch {
      setMessage({
        text: "Le coup n’a pas pu être effectué. Réessayez.",
        error: true,
      });
      return false;
    } finally {
      commandInFlight.current = false;
      setPending(false);
    }
  }
  function reorder(cardId: string, beforeId?: string) {
    const ids = reorderBefore(view.hand, cardId, beforeId);
    if (ids.some((id, index) => id !== view.hand[index].id))
      void send({ type: "reorder", cardIds: ids }, undefined, false);
  }
  function move(direction: -1 | 1) {
    if (selected.length !== 1) {
      setMessage({
        text: "Sélectionnez une seule carte à déplacer.",
        error: true,
      });
      return;
    }
    const ids = view.hand.map((card) => card.id),
      index = ids.indexOf(selected[0]),
      target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    void send({ type: "reorder", cardIds: ids }, undefined, false);
  }
  async function guide() {
    if (!game.demo || service.mode !== "local") return;
    if (game.phase !== "discard") {
      setMessage({ text: "Piochez d’abord le roi de carreau.", error: true });
      return;
    }
    for (const [index, cardIds] of DEMO_GROUPS.entries()) {
      const player = service
        .getSnapshot()
        .players.find((player) => player.id === service.playerId)!;
      if (
        player.melds.some((meld) =>
          meld.cardIds.some((id) => cardIds.includes(id)),
        )
      )
        continue;
      if (
        !(await send({
          type: "meld",
          meld: {
            id: crypto.randomUUID(),
            cardIds,
            kind: index === 0 || index === 2 ? "run" : "set",
            useJokers: false,
          },
        }))
      )
        return;
    }
    setSelected(["0-diamonds-12"]);
    setMessage({
      text: "Les 13 cartes sont prêtes. La dame de carreau est sélectionnée pour la défausse : cliquez sur « Terminer à 13 ».",
      error: false,
    });
  }
  const actions = {
    toggle: (id: string) =>
      setSelected((ids) =>
        ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id],
      ),
    clearSelection: () => setSelected([]),
    setUseJokers,
    reorder,
    move,
    guide,
    draw: (source: "stock" | "discard") => {
      void send({ type: "draw", source });
    },
    discard: (cardId: string) => {
      void send({ type: "discard", cardId });
    },
    discardSelected: () => {
      if (selected.length !== 1)
        setMessage({
          text: "Sélectionnez exactement une carte à défausser.",
          error: true,
        });
      else void send({ type: "discard", cardId: selected[0] });
    },
    sort: () => {
      void send({
        type: "reorder",
        cardIds: [...view.hand]
          .sort(
            (a, b) =>
              SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) || a.rank - b.rank,
          )
          .map((card) => card.id),
      });
    },
    meld: (kind: "run" | "set") => {
      void send(
        {
          type: "meld",
          meld: { id: crypto.randomUUID(), cardIds: selected, kind, useJokers },
        },
        "Combinaison préparée. Vous pouvez encore la modifier.",
      );
    },
    unmeld: (meldId: string) => {
      void send({ type: "unmeld", meldId });
    },
    acceptSuggestion: (id: string) => {
      const meld = view.suggestions.find((item) => item.id === id);
      if (meld)
        void send(
          { type: "meld", meld: { ...meld, id: crypto.randomUUID() } },
          "Combinaison préparée.",
        );
    },
    expose: () => {
      void send(
        { type: "expose", melds: [...view.me.melds, ...view.suggestions] },
        "10 cartes exposées. La manche continue : piochez ou défaussez selon votre tour.",
        false,
      );
    },
    finish: () => {
      void send({
        type: "declare",
        pattern: 13,
        melds: [...view.me.melds, ...view.suggestions],
      });
    },
  };
  return { game, view, selected, message, useJokers, pending, actions };
}

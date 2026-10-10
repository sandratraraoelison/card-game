"use client";

import { useRef, useState } from "react";
import type { GameService } from "@rami/game";
import { useGameController } from "../application/use-game-controller";
import { useCardGestures } from "../hooks/use-card-gestures";
import { PlayingCard } from "@/shared/components/cards/playing-card";
import { GameShell, type GamePanel } from "./game-shell";
import { GameHeader } from "./game-header";
import { GameBoard } from "./game-board";
import { HandPanel } from "./hand-panel";
import { MeldPanel } from "./meld-panel";
import { ExposedCards } from "./exposed-cards";
import { ExposureNotice } from "./exposure-notice";
import { DemoGuide, RoundResult } from "./round-notices";
import { HistoryPanel } from "./history-panel";
import { RulesPanel } from "./rules-panel";

/** Screen composition only. A caller injects the service and round lifecycle. */
export default function GameTable({
  service,
  onRestart,
  onSimulateExposure,
  onSimulateJokerWin,
  canRestart = true,
  connected = true,
}: {
  service: GameService;
  onRestart: (count: 4 | 5, demo: boolean) => void;
  onSimulateExposure?: () => void;
  onSimulateJokerWin?: () => void;
  canRestart?: boolean;
  connected?: boolean;
}) {
  const { game, view, selected, message, useJokers, pending, actions } =
    useGameController(service);
  const [panel, setPanel] = useState<GamePanel>("game");
  const playerCount = game.players.length as 4 | 5;
  const handRef = useRef<HTMLDivElement>(null);
  const gestures = useCardGestures(handRef, (drop) => {
    if (drop.type === "discard") actions.discard(drop.cardId);
    else actions.reorder(drop.cardId, drop.beforeId);
  });
  const canPlay = view.myTurn && !pending && connected;
  const canDraw = canPlay && game.phase === "draw";
  const canDiscard = canPlay && game.phase === "discard";
  const draggedCard = view.hand.find(
    (card) => card.id === gestures.drag?.cardId,
  );
  return (
    <GameShell
      panel={panel}
      setPanel={setPanel}
      discardCount={game.discards.length}
      local={service.mode === "local"}
    >
      {gestures.drag && draggedCard && (
        <div
          className="drag-preview"
          aria-hidden="true"
          style={{ left: gestures.drag.x, top: gestures.drag.y }}
        >
          <PlayingCard card={draggedCard} />
        </div>
      )}
      <GameHeader
        playerCount={playerCount}
        onPlayerCountChange={(count) => {
          if (count !== playerCount) onRestart(count, game.demo);
        }}
        seatedCount={game.players.length}
        restart={onRestart}
        local={service.mode === "local"}
        canRestart={canRestart}
      />
      {panel === "rules" ? (
        <RulesPanel />
      ) : panel === "history" ? (
        <HistoryPanel game={game} />
      ) : (
        <>
          {service.mode === "local" && (
            <div className="flex flex-wrap gap-2">
              {onSimulateExposure && <button className="button secondary" onClick={onSimulateExposure}>Simuler 10 cartes · nouvelle manche guidée</button>}
              {onSimulateJokerWin && <button className="button secondary" onClick={onSimulateJokerWin}>Simuler une victoire avec joker</button>}
            </div>
          )}
          <GameBoard
            demo={game.demo}
            turnNumber={game.turn}
            opponents={view.opponents}
            reference={game.reference}
            stockCount={game.stockCount}
            discardCard={view.incoming?.card}
            discardFrom={view.incomingFrom}
            canDraw={canDraw}
            canTakeDiscard={canDraw && game.rules.allowDiscardPickup && !!view.top}
            takeableDiscardId={view.top?.id}
            onDraw={actions.draw}
            status={view.status}
            received={view.received}
            previousPlayerName={view.previousPlayerName}
            dragging={!!gestures.drag}
            overTable={!!gestures.drag?.overTable}
            canDiscard={canDiscard}
            onHistory={() => setPanel("history")}
            result={game.phase === "finished" ? (
            <RoundResult
              reason={game.result?.reason ?? "Manche terminée."}
              won={game.result?.playerId === service.playerId}
              onRestart={() => onRestart(playerCount, false)}
              canRestart={canRestart}
            />
            ) : game.players.filter(player => player.exposedCards.length === 10).map(player => <ExposureNotice key={`${player.id}-${player.exposedMeldIds.join("-")}`} playerName={player.name} cards={player.exposedCards} />)}
          />
          {game.demo && game.phase !== "finished" && (
            <DemoGuide
              disabled={!canPlay}
              onPrepare={() => void actions.guide()}
            />
          )}
          <HandPanel
            cards={view.hand}
            reference={game.reference}
            selected={selected}
            grouped={view.used}
            valid={view.validCards}
            handRef={handRef}
            gestures={gestures}
            onSelect={actions.toggle}
            onDiscard={actions.discard}
            canPlay={canPlay}
            canDiscard={canDiscard}
            validSelection={view.validSelection}
            useJokers={useJokers}
            message={message}
            actions={actions}
          />
          {game.players.map((player) => (
            <ExposedCards
              key={player.id}
              playerName={player.name}
              cards={player.exposedCards}
            />
          ))}
          <MeldPanel
            suggestions={view.suggestions.map((meld) => ({
              id: meld.id,
              cards: meld.cardIds.flatMap((id) =>
                view.hand.filter((card) => card.id === id),
              ),
              title:
                meld.kind === "run"
                  ? "Suite"
                  : meld.cardIds.length === 4
                    ? "Carré"
                    : "Tri",
              valid: true,
              natural: true,
            }))}
            onAccept={actions.acceptSuggestion}
            melds={view.melds}
            disabled={!canPlay}
            onRemove={actions.unmeld}
            onExpose={actions.expose}
            canExpose={!!view.exposureMelds}
            onFinish={actions.finish}
          />
        </>
      )}
    </GameShell>
  );
}

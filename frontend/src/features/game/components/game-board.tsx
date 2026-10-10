import type { Card, Discard } from "@rami/game";
import type { ReactNode } from "react";
import type { OpponentView } from "../application/game-selectors";
import { PlayerDiscards } from "./player-discards";
import { PlayerSeat } from "./player-seat";
import { TablePiles } from "./table-piles";

interface GameBoardProps {
  result?: ReactNode;
  demo: boolean;
  turnNumber: number;
  opponents: OpponentView[];
  reference: Card;
  stockCount: number;
  discardCard?: Card;
  discardFrom?: string;
  canDraw: boolean;
  canTakeDiscard: boolean;
  takeableDiscardId?: string;
  status: string;
  received: Discard[];
  previousPlayerName: string;
  dragging: boolean;
  overTable: boolean;
  canDiscard: boolean;
  onDraw: (source: "stock" | "discard") => void;
  onHistory: () => void;
}
export function GameBoard(props: GameBoardProps) {
  return (
    <section
      className={`game-board ${props.overTable ? "drag-over-table" : ""}`}
      aria-label="Table de jeu"
      data-discard-zone
    >
      <div className="board-meta">
        <span>
          <i /> {props.demo ? "MAIN GUIDÉE" : "TABLE LIBRE"}
        </span>
        <span>
          {props.opponents.length + 1} JOUEURS <b>·</b> TOUR{" "}
          {String(props.turnNumber).padStart(2, "0")}
        </span>
      </div>
      <div className={`opponents count-${props.opponents.length}`}>
        {props.opponents.map((player, index) => (
          <PlayerSeat
            key={player.id}
            player={player}
            index={index}
            onHistory={props.onHistory}
          />
        ))}
      </div>
      <TablePiles
        reference={props.reference}
        stockCount={props.stockCount}
        discardCard={props.discardCard}
        discardFrom={props.discardFrom}
        canDraw={props.canDraw}
        canTakeDiscard={props.canTakeDiscard}
        onDraw={props.onDraw}
      />
      {props.dragging && (
        <div
          className={`drop-table-hint ${props.overTable ? "over" : ""}`}
          aria-live="polite"
        >
          {props.canDiscard
            ? "Relâchez sur la table pour défausser"
            : "Défausse indisponible : attendez votre tour et piochez."}
        </div>
      )}
      <div className="turn-banner" role="status">
        <span className="turn-indicator" />
        {props.status}
      </div>
      <div className="your-discard">
        <span>DEVANT VOUS</span>
        <PlayerDiscards
          playerName="Vous"
          fromName={props.previousPlayerName}
          discards={props.received}
          onHistory={props.onHistory}
          takeableDiscardId={props.canTakeDiscard ? props.takeableDiscardId : undefined}
          onTakeDiscard={() => props.onDraw('discard')}
        />
      </div>
      {props.result}
    </section>
  );
}

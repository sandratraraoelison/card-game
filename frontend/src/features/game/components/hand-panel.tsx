import { useState } from "react";
import { Feedback } from "@/shared/components/ui/feedback";
import { CardHand, type CardHandProps } from "./card-hand";

interface HandActions {
  sort: () => void;
  move: (direction: -1 | 1) => void;
  clearSelection: () => void;
  meld: (kind: "run" | "set") => void;
  setUseJokers: (value: boolean) => void;
  discardSelected: () => void;
  reorder: (cardId: string, beforeId?: string) => void;
}
interface HandPanelProps extends CardHandProps {
  canPlay: boolean;
  canArrange: boolean;
  canDiscard: boolean;
  validSelection: boolean;
  useJokers: boolean;
  message: { text: string; error: boolean } | null;
  actions: HandActions;
}
export function HandPanel({
  canPlay,
  canArrange,
  canDiscard,
  validSelection,
  useJokers,
  message,
  actions,
  ...hand
}: HandPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const [arranging, setArranging] = useState(false);
  return (
    <section className="hand-section" aria-label="Votre main">
      <div className="section-heading">
        <div className="flex items-center gap-3">
          <span className="avatar you">V</span>
          <h2>
            Votre main{" "}
            <span className="count-pill">{hand.cards.length} cartes</span>
          </h2>
        </div>
        <div className="hand-tools">
          <button onClick={actions.sort} disabled={!canArrange}>
            ⇅ Trier
          </button>
          <button
            aria-label="Déplacer la carte à gauche"
            onClick={() => actions.move(-1)}
            disabled={!canArrange || hand.selected.length !== 1}
          >
            ←
          </button>
          <button
            aria-label="Déplacer la carte à droite"
            onClick={() => actions.move(1)}
            disabled={!canArrange || hand.selected.length !== 1}
          >
            →
          </button>
        </div>
      </div>
      <button
        type="button"
        className="hand-view-toggle button secondary"
        aria-pressed={showAll}
        onClick={() => { setShowAll(value => !value); setArranging(false); }}
      >
        {showAll ? "Vue normale" : "Voir toute la main"}
      </button>
      {showAll && <button
        type="button"
        className="hand-view-toggle button secondary"
        aria-pressed={arranging}
        disabled={!canArrange}
        onClick={() => { setArranging(value => !value); actions.clearSelection(); }}
      >
        {arranging ? "Terminer le rangement" : "Réorganiser les cartes"}
      </button>}
      <CardHand {...hand} showAll={showAll} onSelect={id => {
        if (showAll && arranging) {
          if (!canArrange) return;
          if (hand.selected.length === 1 && hand.selected[0] !== id) {
            actions.reorder(hand.selected[0], id);
            actions.clearSelection();
            return;
          }
        }
        hand.onSelect(id);
      }} />
      {showAll && arranging && <p className="hand-hint" role="status">
        Touchez la carte à déplacer, puis la carte devant laquelle la placer. Vous pouvez aussi maintenir et glisser entre les lignes.
      </p>}
      <div className="hand-hint">
        <span className="gesture-help">
          Glissez pour ranger · Double-clic pour défausser · Sur mobile :
          glissez vers le haut puis relâchez dans la zone de défausse. Maintenez pour ranger.
        </span>
        {validSelection && (
          <span className="valid-selection" role="status">
            ✓ Combinaison valide : vous pouvez la préparer.
          </span>
        )}
        <span>
          {hand.selected.length
            ? `${hand.selected.length} carte${hand.selected.length > 1 ? "s" : ""} sélectionnée${hand.selected.length > 1 ? "s" : ""}`
            : "Sélectionnez une carte puis utilisez ← ou → pour la déplacer."}
        </span>
        {hand.selected.length > 0 && (
          <button onClick={actions.clearSelection}>Tout désélectionner</button>
        )}
        <span className="ml-auto">
          VJ : vrai joker <b>·</b> FJ : faux joker
        </span>
      </div>
      <div className="action-bar">
        <div className="meld-actions">
          <button
            className="button secondary"
            onClick={() => actions.meld("run")}
            disabled={!canPlay}
          >
            ＋ Suite
          </button>
          <button
            className="button secondary"
            onClick={() => actions.meld("set")}
            disabled={!canPlay}
          >
            ＋ Tri / Carré
          </button>
          <label className="joker-toggle">
            <input
              type="checkbox"
              checked={useJokers}
              onChange={(event) => actions.setUseJokers(event.target.checked)}
            />{" "}
            Substituer les vrais jokers
          </label>
        </div>
        <button
          className="button primary"
          disabled={!canDiscard}
          onClick={actions.discardSelected}
        >
          Défausser <span>↗</span>
        </button>
      </div>
      {message && <Feedback {...message} />}
    </section>
  );
}

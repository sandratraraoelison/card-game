import { Feedback } from "@/shared/components/ui/feedback";
import { CardHand, type CardHandProps } from "./card-hand";

interface HandActions {
  sort: () => void;
  move: (direction: -1 | 1) => void;
  clearSelection: () => void;
  meld: (kind: "run" | "set") => void;
  setUseJokers: (value: boolean) => void;
  discardSelected: () => void;
}
interface HandPanelProps extends CardHandProps {
  canPlay: boolean;
  canDiscard: boolean;
  validSelection: boolean;
  useJokers: boolean;
  message: { text: string; error: boolean } | null;
  actions: HandActions;
}
export function HandPanel({
  canPlay,
  canDiscard,
  validSelection,
  useJokers,
  message,
  actions,
  ...hand
}: HandPanelProps) {
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
          <button onClick={actions.sort} disabled={!canPlay}>
            ⇅ Trier
          </button>
          <button
            aria-label="Déplacer la carte à gauche"
            onClick={() => actions.move(-1)}
            disabled={!canPlay}
          >
            ←
          </button>
          <button
            aria-label="Déplacer la carte à droite"
            onClick={() => actions.move(1)}
            disabled={!canPlay}
          >
            →
          </button>
        </div>
      </div>
      <CardHand {...hand} />
      <div className="hand-hint">
        <span className="gesture-help">
          Glissez pour ranger · Double-clic pour défausser · Sur mobile :
          maintenez puis glissez vers la table.
        </span>
        {validSelection && (
          <span className="valid-selection" role="status">
            ✓ Combinaison valide : vous pouvez la préparer.
          </span>
        )}
        <span>
          {hand.selected.length
            ? `${hand.selected.length} carte${hand.selected.length > 1 ? "s" : ""} sélectionnée${hand.selected.length > 1 ? "s" : ""}`
            : "Touchez les cartes pour les sélectionner."}
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

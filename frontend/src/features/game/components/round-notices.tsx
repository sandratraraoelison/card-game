"use client";

import { useEffect, useRef } from "react";
import styles from "./round-result.module.css";

export function RoundResult({
  reason,
  won,
  onRestart,
  canRestart = true,
}: {
  reason: string;
  won: boolean;
  onRestart: () => void;
  canRestart?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panel.current?.scrollIntoView({ block: "center", behavior: "instant" });
  }, []);
  return (
    <div ref={panel} className={`result-banner ${styles.panel}`} role="status">
      <span className={styles.emblem} aria-hidden="true">✦</span>
      <div>
        <strong>
          {won ? "Bien joué, la manche est terminée !" : "Fin de la manche"}
        </strong>
        <p>{reason}</p>
      </div>
      <button className="button primary" onClick={onRestart} disabled={!canRestart}>
        Rejouer ↗
      </button>
      {!canRestart && <small>En attente de l’hôte pour la prochaine manche.</small>}
    </div>
  );
}
export function DemoGuide({
  disabled,
  onPrepare,
}: {
  disabled: boolean;
  onPrepare: () => void;
}) {
  return (
    <div className="guide-banner">
      <span>
        ✦ <strong>Main guidée</strong> · 1. Piochez &nbsp; 2. Préparez &nbsp; 3.
        Terminez à 13
      </span>
      <button onClick={onPrepare} disabled={disabled}>
        Préparer les combinaisons ↗
      </button>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { Card } from "@rami/game";
import { PlayingCard } from "@/shared/components/cards/playing-card";
import styles from "./exposure-notice.module.css";

export function ExposureNotice({ playerName, cards }: { playerName: string; cards: Card[] }) {
  const [remaining, setRemaining] = useState(30);
  const [dismissed, setDismissed] = useState(false);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (dismissed) return;
    panel.current?.scrollIntoView({ block: "center", behavior: "instant" });
    const deadline = Date.now() + 30000;
    const timer = setInterval(() => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(seconds);
      if (!seconds) clearInterval(timer);
    }, 250);
    return () => clearInterval(timer);
  }, [dismissed]);
  if (dismissed || !remaining) return null;
  return <section ref={panel} className={styles.panel} aria-label={`Annonce des 10 cartes de ${playerName}`}>
    <h2>{playerName} expose 10 cartes</h2>
    <p role="status">Combinaisons naturelles · La manche continue.</p>
    <div className={styles.cards}>{cards.map(card => <PlayingCard key={card.id} card={card} />)}</div>
    <button className="button secondary" onClick={() => setDismissed(true)}>Fermer l’annonce</button>
    <small>Fermeture automatique dans {remaining} s</small>
  </section>;
}

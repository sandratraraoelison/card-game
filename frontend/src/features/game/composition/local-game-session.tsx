"use client";
import { useEffect, useRef, useState } from "react";
import { LocalGameService, type LocalDemoScenario } from "../infrastructure/local-game-service";
import GameTable from "../components/game-table";

export default function LocalGameSession() {
  const [service, setService] = useState<LocalGameService | null>(null);
  const serviceRef = useRef<LocalGameService | null>(null);
  useEffect(() => {
    const local = new LocalGameService();
    serviceRef.current = local;
    // Browser-only initialization avoids dealing or starting timers during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setService(local);
    return () => serviceRef.current?.dispose();
  }, []);
  function restart(count: 4 | 5, demo: boolean, scenario?: LocalDemoScenario) {
    serviceRef.current?.dispose();
    const local = new LocalGameService(count, demo, scenario);
    serviceRef.current = local;
    setService(local);
  }
  if (!service)
    return (
      <main className="loading">
        <span className="brand-icon">♠</span>
        <h1>Rami Malagasy</h1>
        <p>Préparation de votre table…</p>
      </main>
    );
  return (
    <GameTable
      key={service.getSnapshot().id}
      service={service}
      onRestart={restart}
      onSimulateExposure={() => restart(service.getSnapshot().players.length as 4 | 5, true, "exposure")}
      onSimulateJokerWin={() => restart(service.getSnapshot().players.length as 4 | 5, true, "joker-win")}
    />
  );
}

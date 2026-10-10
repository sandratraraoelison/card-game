import { formatAriary } from '@rami/game';
import styles from './online-round-result.module.css';

export function OnlineRoundResult({ reason, winnerName, players, carryover, finishCarryover, nextExposurePrize, nextFinishPrize, ready, busy, onReady }: {
  reason: string; winnerName?: string;
  players: { id: string; name: string; net: number; ready: boolean }[];
  carryover: number; finishCarryover: number; nextExposurePrize: number; nextFinishPrize: number;
  ready: boolean; busy: boolean; onReady: () => void;
}) {
  const hasReport = carryover > 0 || finishCarryover > 0;
  return <main className={styles.screen}>
    <section className={styles.panel} aria-label="Résultat de la manche">
      <span className={styles.emblem}>✦</span>
      <h1>{winnerName ? `${winnerName} remporte la manche` : 'Manche nulle'}</h1>
      <p>{reason}</p>
      <h2>{hasReport ? 'Avec report de prime' : 'Sans report de prime'}</h2>
      <div className={styles.prizes}>
        <div><span>Report des 10 cartes</span><strong>{formatAriary(carryover)}</strong></div>
        <div><span>Report de la victoire</span><strong>{formatAriary(finishCarryover)}</strong></div>
      </div>
      <h2>Prochaine manche</h2>
      <p>10 cartes : {formatAriary(nextExposurePrize)} · Victoire : {formatAriary(nextFinishPrize)}</p>
      <ul className={styles.players}>{players.map(player => <li key={player.id}>
        <div><strong>{player.name}</strong><span>{player.net > 0 ? `Gain : +${formatAriary(player.net)}` : player.net < 0 ? `Perte : −${formatAriary(Math.abs(player.net))}` : 'Ni gain ni perte : 0 Ar'}</span></div>
        <span>{player.ready ? '✓ Prêt' : 'En attente'}</span>
      </li>)}</ul>
      <p role="status">{players.filter(player => player.ready).length}/{players.length} joueurs prêts. La partie démarre quand tout le monde est prêt.</p>
      <button className="button primary" disabled={busy || ready} onClick={onReady}>{ready ? 'Vous êtes prêt' : 'Prêt'}</button>
    </section>
  </main>;
}

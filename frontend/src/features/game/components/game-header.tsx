import Link from 'next/link';

export function GameHeader({
  playerCount,
  onPlayerCountChange,
  seatedCount,
  restart,
  local,
  canRestart = true,
}: {
  playerCount: 4 | 5;
  onPlayerCountChange: (count: 4 | 5) => void;
  seatedCount: number;
  restart: (count: 4 | 5, demo: boolean) => void;
  local: boolean;
  canRestart?: boolean;
}) {
  return (
    <>
      {" "}
      <div className="page-heading">
        <div>
          <div className="eyebrow">INSTALLEZ-VOUS, LES CARTES SONT PRÊTES</div>
          <h1>
            À votre table<span>.</span>
          </h1>
          <p>Le rami malgache, à votre rythme.</p>
        </div>
        <div className="new-game">
          <label className="sr-only" htmlFor="players">
            Nombre de joueurs
          </label>
          <select
            id="players"
            disabled={!local}
            title="Changer le nombre de joueurs démarre une nouvelle manche."
            value={playerCount}
            onChange={(e) =>
              onPlayerCountChange(Number(e.target.value) as 4 | 5)
            }
          >
            <option value={4}>4 joueurs</option>
            <option value={5}>5 joueurs</option>
          </select>
          <button
            className="button secondary"
            disabled={!canRestart}
            onClick={() => restart(playerCount, false)}
          >
            ↻ <span>Nouvelle manche</span>
          </button>
          {local && <Link className="button primary" href="/online">Jouer en ligne</Link>}
        </div>
      </div>
      {local && (
        <div className="simulation-notice">
          <span>ⓘ</span>
          <p>
            <strong>Vous jouez avec {seatedCount - 1} joueurs simulés.</strong>{" "}
            Cette partie reste dans votre navigateur et n’est pas synchronisée
            en ligne.
          </p>
          <button onClick={() => restart(playerCount, true)}>
            Essayer la main guidée ↗
          </button>
        </div>
      )}
    </>
  );
}

import type { ReactNode } from "react";
import Link from "next/link";
export type GamePanel = "game" | "history" | "rules";
export function GameShell({
  panel,
  setPanel,
  discardCount,
  children,
  local,
}: {
  panel: GamePanel;
  setPanel: (panel: GamePanel) => void;
  discardCount: number;
  children: ReactNode;
  local: boolean;
}) {
  return (
    <div className="app-shell">
      {" "}
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Rami Malagasy, accueil">
          <span className="brand-icon">♠</span>
          <span>
            rami<span className="brand-sub">MALAGASY</span>
          </span>
        </Link>
        <div className="nav-label">VOTRE ESPACE</div>
        <nav aria-label="Navigation principale">
          <button
            className={panel === "game" ? "nav-item active" : "nav-item"}
            onClick={() => setPanel("game")}
          >
            <span>▦</span> Table de jeu <span className="nav-arrow">↗</span>
          </button>
          <button
            className={panel === "history" ? "nav-item active" : "nav-item"}
            onClick={() => setPanel("history")}
          >
            <span>◷</span> Historique{" "}
            <span className="nav-count">{discardCount}</span>
          </button>
          <button
            className={panel === "rules" ? "nav-item active" : "nav-item"}
            onClick={() => setPanel("rules")}
          >
            <span>▤</span> Règles du jeu
          </button>
        </nav>
        <div className="coming-soon">
          <span className="nav-label">LA SUITE DE L’AVENTURE</span>
          <p>
            <Link href="/online">♧ &nbsp; Salons multijoueurs</Link>
          </p>
          <p>
            ♙ &nbsp; Comptes joueurs <small>À venir</small>
          </p>
        </div>
        <div className="sidebar-note">
          <span>✦</span>
          <h3>
            Le plaisir de jouer,
            <br />
            tout simplement.
          </h3>
          <p>
            Un jeu de cartes, un peu de stratégie et l’esprit de Madagascar.
          </p>
          <div className="flag">
            <i />
            <i />
            <i />
          </div>
        </div>
        <div className="profile">
          <span className="avatar you">V</span>
          <div>
            <strong>Vous</strong>
            <small>{local ? "Profil local · Invité" : "Profil joueur"}</small>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        {" "}
        <header className="topbar">
          <div className="breadcrumb">
            Le salon <span>/</span> <strong>Table de rami</strong>
          </div>
          <span className="local-badge">
            <i /> {local ? "Démonstration locale" : "Mode distant"}
          </span>
        </header>
        <main className="main-content">
          {children}{" "}
          <footer className="page-footer">
            <span>
              RAMI MALAGASY <b>·</b> Le jeu nous rassemble.
            </span>
            <span>
              {local
                ? "État local · Aucune connexion multijoueur"
                : "Partie hébergée par le serveur"}
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}

"use client";
import { useState } from 'react';
import type { RoomSummary, RoomView } from '@rami/game';
import { formatAriary, MAX_STAKE, roundPrizes } from '@rami/game';
import styles from './online-lobby.module.css';

export function GuestLogin({ busy, onLogin }: { busy: boolean; onLogin: (name: string) => void }) {
  const [name, setName] = useState('');
  return <form className={styles.card} onSubmit={e => { e.preventDefault(); onLogin(name); }}>
    <h2>Rejoindre la communauté</h2>
    <p>Choisissez un pseudo pour jouer avec vos amis. Votre session permet de retrouver votre place après une interruption.</p>
    <label>Pseudo<input required maxLength={32} value={name} onChange={e => setName(e.target.value)} autoComplete="nickname" /></label>
    <button className="button primary" disabled={busy || !name.trim()}>Se connecter en invité</button>
  </form>;
}

export function RoomLobby({ rooms, busy, onCreate, onJoin }: {
  rooms: RoomSummary[]; busy: boolean;
  onCreate: (name: string, count: 4 | 5, stake: number) => void; onJoin: (id: string) => void;
}) {
  const [name, setName] = useState('Ma table');
  const [count, setCount] = useState<4 | 5>(4);
  const [code, setCode] = useState('');
  const [stake, setStake] = useState('1000');
  const [mode, setMode] = useState<'create' | 'join'>('create');
  return <div className={styles.lobby}>
    <nav className={styles.menu} aria-label="Choisir une action pour le salon">
      <button type="button" className={`button ${mode === 'create' ? 'primary' : 'secondary'}`} aria-pressed={mode === 'create'} onClick={() => setMode('create')}>Créer un salon</button>
      <button type="button" className={`button ${mode === 'join' ? 'primary' : 'secondary'}`} aria-pressed={mode === 'join'} onClick={() => setMode('join')}>Rejoindre un salon</button>
    </nav>
    {mode === 'create' ? <form className={styles.card} onSubmit={e => { e.preventDefault(); onCreate(name, count, Number(stake)); }}>
      <h2>Créer un salon</h2>
      <p>Crédits fictifs, sans paiement. Deux mises récompensent le premier joueur qui affiche 10 cartes ; le reste récompense la victoire à 13. Les gains sont versés en fin de manche. Sans exposition de 10 cartes, son prix est reporté à la manche suivante. Une manche nulle reporte les prix non remportés, sans remboursement des mises. Une victoire directe à 13 peut aussi remporter le prix des 10 cartes si elle inclut 10 cartes naturelles valides.</p>
      <label>Mise par joueur (Ar)<input type="number" inputMode="numeric" required min={0} max={MAX_STAKE} step={1} value={stake} onChange={e => setStake(e.target.value)} /></label>
      <p>Pot prévu : {formatAriary(Number(stake) * count)}</p>
      <p>Premier à 10 cartes : {formatAriary(roundPrizes(count, Number(stake)).exposurePrize)} · Victoire à 13 : {formatAriary(roundPrizes(count, Number(stake)).finishPrize)}</p>
      <label>Nom du salon<input required maxLength={60} value={name} onChange={e => setName(e.target.value)} /></label>
      <label>Nombre de joueurs<select value={count} onChange={e => setCount(Number(e.target.value) as 4 | 5)}><option value={4}>4 joueurs</option><option value={5}>5 joueurs</option></select></label>
      <button className="button primary" disabled={busy || !name.trim()}>Créer le salon</button>
    </form> : <div className={styles.card}>
      <form onSubmit={e => { e.preventDefault(); onJoin(code.trim()); }}>
        <h2>Rejoindre des amis</h2>
        <label>Code du salon<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="123456" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} /></label>
        <button className="button secondary" disabled={busy || !code.trim()}>Rejoindre avec le code</button>
      </form>
      <h2>Salons ouverts</h2>
      {!rooms.length && <p>Aucun salon pour le moment. Créez votre table.</p>}
      <ul className={styles.rooms}>{rooms.map(room => <li key={room.id}>
        <span>{room.name} · {room.playerCount}/{room.capacity} · Mise {formatAriary(room.stake ?? 0)}</span>
        <button className="button secondary" disabled={busy || room.playerCount >= room.capacity} onClick={() => onJoin(room.id)} aria-label={`Rejoindre ${room.name}`}>Rejoindre</button>
      </li>)}</ul>
    </div>}
  </div>;
}

export function WaitingRoom({ room, playerId, busy, onStart, onLeave }: {
  room: RoomView; playerId: string; busy: boolean; onStart: () => void; onLeave: () => void;
}) {
  return <section className={styles.card} aria-label="Salle d’attente">
    <h2>{room.name}</h2>
    <p>Mise par joueur : {formatAriary(room.stake ?? 0)} · Pot prévu : {formatAriary((room.stake ?? 0) * room.capacity)}. Crédits fictifs, prélevés au démarrage de chaque manche.</p>
    <p>Premier à 10 cartes : {formatAriary(room.exposurePrize ?? 0)} · Victoire à 13 : {formatAriary(room.finishPrize ?? 0)} · Report 10 : {formatAriary(room.carryover ?? 0)} · Report victoire : {formatAriary(room.finishCarryover ?? 0)}</p>
    <p>Partagez ce code avec vos amis :</p>
    <label>Code du salon<input readOnly value={room.id} onFocus={e => e.target.select()} /></label>
    <p>{room.members.length}/{room.capacity} joueurs inscrits</p>
    <ul>{room.members.map(p => <li key={p.id}>{p.displayName}{p.id === playerId ? ' (vous)' : ''}{p.id === room.hostId ? ' · hôte' : ''} · {formatAriary(p.balance ?? 0)}</li>)}</ul>
    {room.hostId === playerId ? <button className="button primary" disabled={busy || room.members.length !== room.capacity} onClick={onStart}>Démarrer la partie</button> : <p>En attente du démarrage par l’hôte.</p>}
    <button className="button secondary" disabled={busy} onClick={onLeave}>Quitter le salon</button>
  </section>;
}

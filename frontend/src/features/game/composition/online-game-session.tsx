"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { GameView, RoomView } from '@rami/game';
import { useOnlineLobby } from '../application/use-online-lobby';
import type { LobbyService } from '@rami/game';
import { NestLobbyService } from '../infrastructure/nest-lobby-service';
import { NestGameService } from '../infrastructure/nest-game-service';
import { GuestLogin, RoomLobby, WaitingRoom } from '../components/online-lobby';
import GameTable from '../components/game-table';
import styles from '../components/online-lobby.module.css';

function ConnectedGame({ game, roomId, playerId, lobby, receive, onRestart, canRestart, connected }: {
  game: GameView; roomId: string; playerId: string; lobby: LobbyService;
  receive: (room: RoomView) => void; onRestart: () => void; canRestart: boolean; connected: boolean;
}) {
  const [initialGame] = useState(game);
  const [service, setService] = useState<NestGameService>();
  useEffect(() => {
    const adapter = new NestGameService(playerId, initialGame, roomId, lobby, receive);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setService(adapter);
    return () => adapter.dispose();
  }, [initialGame, playerId, roomId, lobby, receive]);
  useEffect(() => { service?.receive(game); }, [service, game]);
  return service ? <GameTable service={service} onRestart={onRestart} canRestart={canRestart} connected={connected} /> : <p>Connexion à la table…</p>;
}

function OnlineScreen({ service }: { service: LobbyService }) {
  const lobby = useOnlineLobby(service);
  const { session, room, busy, connected } = lobby;
  const isHost = room?.hostId === session?.player.id;
  return <>
    <div className={styles.toolbar}>
      <Link href="/">← Simulation locale</Link>
      <strong>Jeu en ligne</strong>
      {session && <><span>{session.player.displayName}</span><span role="status">{connected ? 'Connecté au serveur' : 'Reconnexion en cours…'}</span></>}
      {room?.game && <><span>{room.name}</span><button className="button secondary" disabled={busy || room.game.phase !== 'finished'} onClick={() => void lobby.leave()}>Quitter le salon</button></>}
    </div>
    {lobby.error && <p role="alert" className={styles.error}>{lobby.error}</p>}
    {session && room?.game ? <ConnectedGame key={room.game.id} game={room.game} roomId={room.id} playerId={session.player.id} lobby={service} receive={lobby.receive} onRestart={() => void lobby.start()} canRestart={!!isHost && room.game.phase === 'finished' && !busy && connected} connected={connected} /> :
      <main className={styles.shell}>
        <h1>Une table entre amis.</h1>
        {!session ? <GuestLogin busy={busy} onLogin={name => void lobby.login(name)} /> : room ?
          <WaitingRoom room={room} playerId={session.player.id} busy={busy || !connected} onStart={() => void lobby.start()} onLeave={() => void lobby.leave()} /> :
          <RoomLobby rooms={lobby.rooms} busy={busy} onCreate={(name, count) => void lobby.create(name, count)} onJoin={id => void lobby.join(id)} />}
      </main>}
  </>;
}

export default function OnlineGameSession() {
  const [service, setService] = useState<NestLobbyService>();
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL ?? `${window.location.protocol}//${window.location.hostname}:3001/api`;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setService(new NestLobbyService(base));
  }, []);
  return service ? <OnlineScreen service={service} /> : <main className={styles.shell}>Connexion…</main>;
}

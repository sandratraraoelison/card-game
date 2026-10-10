"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { GameView, RoomView } from '@rami/game';
import { formatAriary, roundPrizes } from '@rami/game';
import { useOnlineLobby } from '../application/use-online-lobby';
import type { LobbyService } from '@rami/game';
import { NestLobbyService } from '../infrastructure/nest-lobby-service';
import { NestGameService } from '../infrastructure/nest-game-service';
import { GuestLogin, RoomLobby, WaitingRoom } from '../components/online-lobby';
import GameTable from '../components/game-table';
import { OnlineRoundResult } from '../components/online-round-result';
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
  const nextPrizes = roundPrizes(room?.capacity ?? 4, room?.stake ?? 0, room?.carryover ?? 0, room?.finishCarryover ?? 0);
  return <>
    <div className={styles.toolbar}>
      <Link href="/">← Simulation locale</Link>
      <strong>Jeu en ligne</strong>
      {session && room?.game?.phase !== 'finished' && <span>Solde fictif : {formatAriary(room?.members.find(member => member.id === session.player.id)?.balance ?? lobby.balance ?? session.player.balance ?? 0)}</span>}
      {room && <span>Mise : {formatAriary(room.stake ?? 0)} · Pot : {formatAriary(room.pot ?? 0)}</span>}
      {room && <span>10 cartes : {formatAriary(room.exposurePrize ?? 0)} · Victoire à 13 : {formatAriary(room.finishPrize ?? 0)}</span>}
      {room?.exposureWinnerId && <span>Premier à 10 : {room.members.find(member => member.id === room.exposureWinnerId)?.displayName}</span>}
      {room?.game?.phase === 'finished' && <span>{room.game.result?.playerId ? `${room.members.find(member => member.id === room.game?.result?.playerId)?.displayName} gagne ${formatAriary(room.game.result?.victory ? (room.exposurePrize ?? 0) + (room.finishPrize ?? 0) : room.finishPrize ?? 0)}  · Reports : 10 cartes ${formatAriary(room.carryover ?? 0)}, victoire ${formatAriary(room.finishCarryover ?? 0)}` : `Manche nulle · Reports : 10 cartes ${formatAriary(room.carryover ?? 0)}, victoire ${formatAriary(room.finishCarryover ?? 0)}`}</span>}
      {session && <><span>{session.player.displayName}</span><span role="status">{connected ? 'Connecté au serveur' : 'Reconnexion en cours…'}</span></>}
      {room?.game && <><span>{room.name}</span><button className="button secondary" disabled={busy || room.game.phase !== 'finished'} onClick={() => void lobby.leave()}>Quitter le salon</button></>}
    </div>
    {lobby.error && <p role="alert" className={styles.error}>{lobby.error}</p>}
    {session && room?.game?.phase === 'finished' ? <OnlineRoundResult
      reason={room.game.result?.reason ?? 'Manche terminée.'}
      winnerName={room.members.find(member => member.id === room.game?.result?.playerId)?.displayName}
      carryover={room.carryover ?? 0} finishCarryover={room.finishCarryover ?? 0}
      nextExposurePrize={nextPrizes.exposurePrize} nextFinishPrize={nextPrizes.finishPrize}
      players={room.members.map(member => ({ id: member.id, name: member.displayName, ready: !!room.readyPlayerIds?.includes(member.id), net: (room.game?.result?.victory ? (member.id === room.game.result.playerId ? (room.exposurePrize ?? 0) + (room.finishPrize ?? 0) : 0) : (member.id === room.exposureWinnerId ? room.exposurePrize ?? 0 : 0) + (member.id === room.game?.result?.playerId ? room.finishPrize ?? 0 : 0)) - (room.stake ?? 0) }))}
      ready={!!room.readyPlayerIds?.includes(session.player.id)} busy={busy || !connected} onReady={() => void lobby.ready()}
    /> : session && room?.game ? <ConnectedGame key={room.game.id} game={room.game} roomId={room.id} playerId={session.player.id} lobby={service} receive={lobby.receive} onRestart={() => void lobby.ready()} canRestart={false} connected={connected} /> :
      <main className={styles.shell}>
        <h1>Une table entre amis.</h1>
        {!session ? <GuestLogin busy={busy} onLogin={name => void lobby.login(name)} /> : room ?
          <WaitingRoom room={room} playerId={session.player.id} busy={busy || !connected} onStart={() => void lobby.start()} onLeave={() => void lobby.leave()} /> :
          <RoomLobby rooms={lobby.rooms} busy={busy} onCreate={(name, count, stake) => void lobby.create(name, count, stake)} onJoin={id => void lobby.join(id)} />}
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

"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RoomSummary, RoomView } from '@rami/game';
import { NetworkError, type LobbyService } from '@rami/game';

export function useOnlineLobby(service: LobbyService) {
  const [identity, setIdentity] = useState(() => service.restore());
  const [room, setRoom] = useState<RoomView>();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [error, setError] = useState('');
  const [connectionError, setConnectionError] = useState('');
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const sequence = useRef(0);
  const inFlight = useRef(false);
  const session = identity?.session;
  const roomId = identity?.roomId;
  const receive = useCallback((next: RoomView) => {
    sequence.current++;
    setRoom(current => current?.id === next.id && current.revision > next.revision ? current : next);
    setConnected(true);
  }, []);

  useEffect(() => {
    if (!session) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      const version = sequence.current;
      try {
        const data = roomId ? await service.get(roomId) : await service.list();
        if (stopped || version !== sequence.current) return;
        if (roomId) receive(data as RoomView); else setRooms(data as RoomSummary[]);
        setConnected(true);
        setConnectionError('');
      } catch (error) {
        if (stopped || version !== sequence.current) return;
        setConnected(false);
        setConnectionError(error instanceof Error ? error.message : 'Connexion indisponible.');
        if (error instanceof NetworkError && error.status === 401) {
          service.forget(); setIdentity(undefined); setRoom(undefined);
        }
        if (roomId && session && error instanceof NetworkError && [403, 404].includes(error.status)) {
          setIdentity({ session }); setRoom(undefined);
        }
      } finally {
        if (!stopped) timer = setTimeout(poll, 1000);
      }
    }
    void poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, [service, session, roomId, receive]);

  async function run(task: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    sequence.current++;
    setBusy(true); setError('');
    try { await task(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Action impossible.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  function enter(next: RoomView) {
    if (!session) return;
    receive(next);
    setIdentity({ session, roomId: next.id });
  }
  return {
    session, room, rooms, error: error || connectionError, connected, busy, receive,
    login: (name: string) => run(async () => { setIdentity({ session: await service.login(name) }); }),
    create: (name: string, capacity: 4 | 5) => run(async () => enter(await service.create(name, capacity))),
    join: (id: string) => run(async () => enter(await service.join(id))),
    start: () => run(async () => { if (roomId) receive(await service.start(roomId)); }),
    leave: () => run(async () => {
      if (roomId && session) { await service.leave(roomId); sequence.current++; setRoom(undefined); setIdentity({ session }); }
    }),
  };
}

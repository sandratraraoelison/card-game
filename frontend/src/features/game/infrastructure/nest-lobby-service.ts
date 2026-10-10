import type { CommandEnvelope, CommandResult, GuestSession, RoomSummary, RoomView } from '@rami/game';
import { NetworkError, type LobbyService, type SavedOnlineSession } from '@rami/game';

const STORAGE_KEY = 'rami-online-session-v1';
export class NestLobbyService implements LobbyService {
  private saved?: SavedOnlineSession;
  constructor(private readonly baseUrl: string) {}
  restore() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
      if (typeof parsed?.session?.token === 'string' && typeof parsed.session.player?.id === 'string') this.saved = parsed;
    } catch { /* Storage can be unavailable in private browsing. */ }
    return this.saved;
  }
  private save(roomId?: string) {
    if (!this.saved) return;
    this.saved = { session: this.saved.session, roomId };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.saved)); } catch { /* The current session still works. */ }
  }
  forget() {
    this.saved = undefined;
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* Optional persistence. */ }
  }
  private async request<T>(route: string, method = 'GET', body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${route}`, {
        method, cache: 'no-store', signal: AbortSignal.timeout(10000),
        headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(this.saved ? { Authorization: `Bearer ${this.saved.session.token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch { throw new NetworkError('Connexion au serveur interrompue. Nouvelle tentative automatique.'); }
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new NetworkError(typeof error.message === 'string' ? error.message : 'Le serveur a refusé la requête.', response.status);
    }
    return response.status === 204 ? undefined as T : response.json();
  }
  async login(displayName: string) {
    const session = await this.request<GuestSession>('/sessions', 'POST', { displayName });
    this.saved = { session };
    this.save();
    return session;
  }
  list() { return this.request<RoomSummary[]>('/rooms'); }
  get(id: string) { return this.request<RoomView>(`/rooms/${encodeURIComponent(id)}`); }
  async create(name: string, capacity: 4 | 5) {
    const room = await this.request<RoomView>('/rooms', 'POST', { name, capacity });
    this.save(room.id);
    return room;
  }
  async join(id: string) {
    const room = await this.request<RoomView>(`/rooms/${encodeURIComponent(id)}/join`, 'POST');
    this.save(room.id);
    return room;
  }
  async leave(id: string) { await this.request(`/rooms/${encodeURIComponent(id)}/members/me`, 'DELETE'); this.save(); }
  start(id: string) { return this.request<RoomView>(`/rooms/${encodeURIComponent(id)}/game/start`, 'POST'); }
  command(id: string, command: CommandEnvelope) {
    return this.request<{ result: CommandResult; room: RoomView }>(`/rooms/${encodeURIComponent(id)}/game/commands`, 'POST', command);
  }
}

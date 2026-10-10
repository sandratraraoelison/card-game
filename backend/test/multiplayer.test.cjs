const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { createApp } = require('../dist/app');
const { SqliteRooms } = require('../dist/modules/multiplayer/infrastructure/sqlite-store');
const { createGame, DEMO_GROUPS } = require('@rami/game');

async function server(databasePath = ':memory:') {
  const { app } = await createApp({ NODE_ENV: 'test', DATABASE_PATH: databasePath });
  await app.listen(0, '127.0.0.1');
  const base = `${await app.getUrl()}/api`;
  return { app, async request(route, token, method = 'GET', body) {
    const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: response.status === 204 ? undefined : await response.json() };
  } };
}
async function guests(request, count) {
  return Promise.all(Array.from({ length: count }, async (_, i) => {
    const result = await request('/sessions', undefined, 'POST', { displayName: `Joueur ${i}` });
    assert.equal(result.status, 201);
    return result.body;
  }));
}
const move = (room, guest, command, revision = room.game.revision) => ({ gameId: room.game.id, playerId: guest.player.id, expectedRevision: revision, commandId: randomUUID(), command });

for (const count of [4, 5]) test(`${count} real HTTP clients join, play, retry, reconnect and keep hands private`, async () => {
  const { app, request } = await server();
  try {
    const players = await guests(request, count + 1);
    const owner = players[0];
    const created = await request('/rooms', owner.token, 'POST', { name: 'Table réseau', capacity: count });
    const id = created.body.id;
    const route = `/rooms/${id}`;
    assert.equal((await request(`${route}/game/start`, owner.token, 'POST')).status, 409);
    for (const p of players.slice(1, count)) assert.equal((await request(`${route}/join`, p.token, 'POST')).status, 201);
    assert.equal((await request(`${route}/join`, players[count].token, 'POST')).status, 409);
    assert.equal((await request(route, players[count].token)).status, 403);
    assert.equal((await request(`${route}/game/start`, players[1].token, 'POST')).status, 403);
    const start = await request(`${route}/game/start`, owner.token, 'POST');
    assert.equal(start.status, 201);
    let room = start.body;
    assert.equal(room.game.mode, 'remote');
    assert.equal(room.game.players.length, count);
    assert.equal(room.game.players.some(p => p.simulated), false);
    for (const p of players.slice(0, count)) {
      const view = (await request(route, p.token)).body.game;
      assert.equal(view.stock, undefined);
      assert.equal(view.players.find(m => m.id === p.player.id).hand.length, 13);
      for (const opponent of view.players.filter(m => m.id !== p.player.id)) {
        assert.equal(opponent.hand, undefined);
        assert.deepEqual(opponent.melds, []);
      }
    }
    const post = (guest, envelope) => request(`${route}/game/commands`, guest.token, 'POST', envelope);
    const spoof = move(room, owner, { type: 'draw', source: 'stock' });
    assert.equal((await post(players[1], spoof)).status, 403);
    assert.equal((await post(players[1], move(room, players[1], { type: 'draw', source: 'stock' }))).body.result.ok, false);
    assert.equal((await post(owner, { ...spoof, command: { type: 'cheat' } })).status, 400);
    assert.equal((await post(owner, { ...spoof, command: { type: 'declare', pattern: 10 } })).status, 400);
    assert.equal((await post(owner, { ...spoof, command: { type: 'expose', melds: 'invalid' } })).status, 400);
    assert.equal((await post(owner, { ...spoof, command: { type: 'draw', source: 'stock', hand: [] } })).status, 400);
    const simultaneous = await Promise.all([post(owner, spoof), post(owner, spoof)]);
    assert.equal(simultaneous.every(r => r.body.result.ok), true);
    room = simultaneous[1].body.room;
    assert.equal(room.game.revision, 1);
    assert.equal(room.game.players[0].hand.length, 14);
    assert.equal((await post(owner, { ...spoof, command: { type: 'draw', source: 'discard' } })).status, 409);
    assert.equal((await post(owner, move(room, owner, { type: 'draw', source: 'stock' }, 0))).body.result.ok, false);
    const cardId = room.game.players[0].hand[0].id;
    const discarded = await post(owner, move(room, owner, { type: 'discard', cardId }));
    assert.equal(discarded.body.result.ok, true);
    room = discarded.body.room;
    assert.equal(room.game.currentPlayerIndex, count - 1);
    assert.equal(room.game.discards[0].toPlayerId, players[count - 1].player.id);
    const next = players[count - 1];
    assert.equal((await post(next, move(room, next, { type: 'draw', source: 'discard' }))).body.result.ok, true);
    assert.equal((await request(`${route}/members/me`, owner.token, 'DELETE')).status, 409);
    const reconnect = await request(`${route}/join`, owner.token, 'POST');
    assert.equal(reconnect.body.game.revision, 3);
    assert.equal(reconnect.body.game.players[0].hand.length, 13);
  } finally { await app.close(); }
});

test('SQLite restores sessions, room state and command receipts after restarting the app', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'rami-test-'));
  let running;
  try {
    running = await server(path.join(directory, 'game.sqlite'));
    const players = await guests(running.request, 4);
    const owner = players[0];
    const room = (await running.request('/rooms', owner.token, 'POST', { name: 'Persistant', capacity: 4 })).body;
    for (const p of players.slice(1)) await running.request(`/rooms/${room.id}/join`, p.token, 'POST');
    const started = (await running.request(`/rooms/${room.id}/game/start`, owner.token, 'POST')).body;
    const command = move(started, owner, { type: 'draw', source: 'stock' });
    await running.request(`/rooms/${room.id}/game/commands`, owner.token, 'POST', command);
    await running.app.close();
    running = await server(path.join(directory, 'game.sqlite'));
    const retried = await running.request(`/rooms/${room.id}/game/commands`, owner.token, 'POST', command);
    assert.equal(retried.body.result.ok, true);
    assert.equal(retried.body.room.game.revision, 1);
    assert.equal(retried.body.room.game.players[0].hand.length, 14);
  } finally {
    if (running) await running.app.close();
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
    assert.ok(path.basename(directory).startsWith('rami-test-'));
    rmSync(directory, { recursive: true, force: true });
  }
});

test('waiting room transfers ownership on departure and rejects invalid capacities', async () => {
  const { app, request } = await server();
  try {
    const [owner, guest] = await guests(request, 2);
    assert.equal((await request('/rooms', owner.token, 'POST', { name: 'Bad', capacity: 3 })).status, 400);
    const room = (await request('/rooms', owner.token, 'POST', { name: 'Lobby', capacity: 5 })).body;
    await request(`/rooms/${room.id}/join`, guest.token, 'POST');
    assert.equal((await request(`/rooms/${room.id}/members/me`, owner.token, 'DELETE')).status, 204);
    assert.equal((await request(`/rooms/${room.id}`, guest.token)).body.hostId, guest.player.id);
  } finally { await app.close(); }
});

test('two different concurrent commands at one revision cannot both commit', async () => {
  const { app, request } = await server();
  try {
    const players = await guests(request, 4);
    const owner = players[0];
    let room = (await request('/rooms', owner.token, 'POST', { name: 'Concurrent', capacity: 4 })).body;
    for (const p of players.slice(1)) await request(`/rooms/${room.id}/join`, p.token, 'POST');
    room = (await request(`/rooms/${room.id}/game/start`, owner.token, 'POST')).body;
    const results = await Promise.all([1, 2].map(() => request(`/rooms/${room.id}/game/commands`, owner.token, 'POST', move(room, owner, { type: 'draw', source: 'stock' }))));
    assert.equal(results.filter(r => r.body.result.ok).length, 1);
    const final = (await request(`/rooms/${room.id}`, owner.token)).body;
    assert.equal(final.game.revision, 1);
    assert.equal(final.game.players[0].hand.length, 14);
  } finally { await app.close(); }
});

test('ten cards stay public without winning, then thirteen wins and only the host can rematch', async () => {
  const { app, request } = await server();
  try {
    const players = await guests(request, 4);
    const owner = players[0];
    let room = (await request('/rooms', owner.token, 'POST', { name: 'Déclarations', capacity: 4 })).body;
    for (const p of players.slice(1)) await request(`/rooms/${room.id}/join`, p.token, 'POST');
    // Test-only deterministic deal. There is deliberately no public demo/seed endpoint.
    app.get(SqliteRooms).transact(room.id, stored => {
      const game = createGame(4, true);
      game.mode = 'remote'; game.demo = false;
      game.players = game.players.map((p, i) => ({ ...p, id: players[i].player.id, name: players[i].player.displayName, simulated: false }));
      stored.game = game;
    });
    room = (await request(`/rooms/${room.id}`, owner.token)).body;
    const groups = DEMO_GROUPS.map((cardIds, index) => ({ id: `group-${index}`, cardIds, kind: index === 0 || index === 2 ? 'run' : 'set', useJokers: false }));
    const send = async command => {
      const response = await request(`/rooms/${room.id}/game/commands`, owner.token, 'POST', move(room, owner, command));
      assert.equal(response.body.result.ok, true);
      room = response.body.room;
    };
    await send({ type: 'expose', melds: groups.slice(0, 3) });
    const observer = (await request(`/rooms/${room.id}`, players[1].token)).body.game;
    assert.equal(observer.phase, 'draw');
    assert.equal(observer.players[0].hand, undefined);
    assert.equal(observer.players[0].exposedCards.length, 10);
    await send({ type: 'draw', source: 'stock' });
    await send({ type: 'declare', pattern: 13, melds: groups });
    assert.equal(room.game.phase, 'finished');
    assert.equal(room.game.result.playerId, owner.player.id);
    assert.equal(room.game.discards[0].card.id, '0-diamonds-12');
    const previousId = room.game.id;
    assert.equal((await request(`/rooms/${room.id}/game/start`, players[1].token, 'POST')).status, 403);
    const replay = (await request(`/rooms/${room.id}/game/start`, owner.token, 'POST')).body;
    assert.notEqual(replay.game.id, previousId);
    assert.equal(replay.game.phase, 'draw');
    assert.equal(replay.game.revision, 0);
    assert.equal(replay.game.players.length, 4);
  } finally { await app.close(); }
});

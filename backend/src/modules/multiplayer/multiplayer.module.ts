import { type DynamicModule, Module } from '@nestjs/common';
import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import { Sessions } from './application/sessions';
import { Rooms } from './application/rooms';
import { Games } from './application/games';
import type { Clock, IdentitySource } from './application/ports';
import { SqliteRooms, SqliteSessions, SqliteStore } from './infrastructure/sqlite-store';
import { GamesController, RoomsController, SessionsController } from './transport/controllers';
import { RequestLimitGuard, SessionGuard } from './transport/http';

const identity: IdentitySource = { id: randomUUID, token: () => randomBytes(32).toString('hex'), hash: value => createHash('sha256').update(value).digest('hex') };
const clock: Clock = { now: Date.now };
@Module({})
export class MultiplayerModule {
  static register(databasePath: string): DynamicModule {
    return {
      module: MultiplayerModule,
      controllers: [SessionsController, RoomsController, GamesController],
      providers: [
        { provide: SqliteStore, useFactory: () => new SqliteStore(databasePath) },
        { provide: SqliteRooms, useFactory: (db: SqliteStore) => new SqliteRooms(db), inject: [SqliteStore] },
        { provide: SqliteSessions, useFactory: (db: SqliteStore) => new SqliteSessions(db), inject: [SqliteStore] },
        { provide: Sessions, useFactory: (repo: SqliteSessions) => new Sessions(repo, identity, clock), inject: [SqliteSessions] },
        { provide: Rooms, useFactory: (repo: SqliteRooms) => new Rooms(repo, identity, clock), inject: [SqliteRooms] },
        { provide: Games, useFactory: (repo: SqliteRooms) => new Games(repo, identity, clock, () => randomInt(0, 2 ** 32) / 2 ** 32), inject: [SqliteRooms] },
        SessionGuard, RequestLimitGuard,
      ],
    };
  }
}

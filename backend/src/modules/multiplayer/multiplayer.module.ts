import { type DynamicModule, Module } from '@nestjs/common';
import { Sessions } from './application/sessions';
import { Rooms } from './application/rooms';
import { Games } from './application/games';
import { secureRandom, systemClock, systemIdentity } from './infrastructure/system';
import { SqliteRooms, SqliteSessions, SqliteStore } from './infrastructure/sqlite-store';
import { GamesController, RoomsController, SessionsController } from './transport/controllers';
import { RequestLimitGuard, SessionGuard } from './transport/http';

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
        { provide: Sessions, useFactory: (repo: SqliteSessions) => new Sessions(repo, systemIdentity, systemClock), inject: [SqliteSessions] },
        { provide: Rooms, useFactory: (repo: SqliteRooms) => new Rooms(repo, systemIdentity, systemClock), inject: [SqliteRooms] },
        { provide: Games, useFactory: (repo: SqliteRooms) => new Games(repo, systemIdentity, systemClock, secureRandom), inject: [SqliteRooms] },
        SessionGuard, RequestLimitGuard,
      ],
    };
  }
}

import { Module, type DynamicModule } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module';
import { MultiplayerModule } from './modules/multiplayer/multiplayer.module';

@Module({})
export class AppModule {
  static register(databasePath: string): DynamicModule {
    return { module: AppModule, imports: [HealthModule, MultiplayerModule.register(databasePath)] };
  }
}

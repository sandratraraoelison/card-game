import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, UseFilters, UseGuards } from '@nestjs/common';
import type { PlayerAccount } from '@rami/game';
import { Sessions } from '../application/sessions';
import { Rooms } from '../application/rooms';
import { Games } from '../application/games';
import { ApplicationErrorFilter, RequestLimitGuard, SessionGuard } from './http';
import { capacity, envelope, object, text } from './validation';

interface AuthenticatedRequest { player: PlayerAccount }
@Controller('sessions')
@UseFilters(ApplicationErrorFilter)
@UseGuards(RequestLimitGuard)
export class SessionsController {
  constructor(private readonly sessions: Sessions) {}
  @Post()
  create(@Body() body: unknown) { return this.sessions.create(text(object(body, ['displayName']).displayName, 32)); }
  @Get('me')
  @UseGuards(SessionGuard)
  me(@Req() request: AuthenticatedRequest) { return request.player; }
}
@Controller('rooms')
@UseFilters(ApplicationErrorFilter)
@UseGuards(RequestLimitGuard, SessionGuard)
export class RoomsController {
  constructor(private readonly rooms: Rooms) {}
  @Get()
  list() { return this.rooms.list(); }
  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    const b = object(body, ['name', 'capacity']);
    return this.rooms.create(request.player, text(b.name, 60), capacity(b.capacity));
  }
  @Get(':id')
  view(@Param('id') id: string, @Req() request: AuthenticatedRequest) { return this.rooms.view(id, request.player.id); }
  @Post(':id/join')
  join(@Param('id') id: string, @Req() request: AuthenticatedRequest) { return this.rooms.join(id, request.player); }
  @Delete(':id/members/me')
  @HttpCode(204)
  leave(@Param('id') id: string, @Req() request: AuthenticatedRequest) { this.rooms.leave(id, request.player.id); }
}
@Controller('rooms/:id/game')
@UseFilters(ApplicationErrorFilter)
@UseGuards(RequestLimitGuard, SessionGuard)
export class GamesController {
  constructor(private readonly games: Games, private readonly rooms: Rooms) {}
  @Post('start')
  start(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    this.games.start(id, request.player.id);
    return this.rooms.view(id, request.player.id);
  }
  @Post('commands')
  @HttpCode(200)
  command(@Param('id') id: string, @Req() request: AuthenticatedRequest, @Body() body: unknown) {
    const result = this.games.command(id, request.player.id, envelope(body));
    return { result, room: this.rooms.view(id, request.player.id) };
  }
}

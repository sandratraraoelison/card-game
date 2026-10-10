import { ArgumentsHost, Catch, type ExceptionFilter, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { ApplicationError } from '../domain/models';
import { Sessions } from '../application/sessions';

@Catch(ApplicationError)
export class ApplicationErrorFilter implements ExceptionFilter {
  catch(error: ApplicationError, host: ArgumentsHost) {
    host.switchToHttp().getResponse().status(error.status).json({ statusCode: error.status, message: error.message });
  }
}
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessions: Sessions) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;
    if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ') || authorization.length > 256) throw new ApplicationError(401, 'Session requise.');
    request.player = this.sessions.authenticate(authorization.slice(7));
    return true;
  }
}

/** Bound abuse and memory use; deploy behind a trusted proxy/firewall in production. */
@Injectable()
export class RequestLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, { count: number; until: number }>();
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const now = Date.now();
    const signup = request.method === 'POST' && request.path.endsWith('/sessions');
    const key = `${request.ip}:${signup ? 'signup' : 'requests'}`;
    for (const [id, bucket] of this.buckets) if (bucket.until <= now) this.buckets.delete(id);
    const bucket = this.buckets.get(key) ?? { count: 0, until: now + 60000 };
    if (this.buckets.size >= 10000 && !this.buckets.has(key)) throw new ApplicationError(429, 'Serveur occupé. Réessayez plus tard.');
    this.buckets.set(key, bucket);
    if (++bucket.count > (signup ? 30 : 1200)) throw new ApplicationError(429, 'Trop de requêtes. Réessayez dans une minute.');
    return true;
  }
}

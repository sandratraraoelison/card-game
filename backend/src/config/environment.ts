export function readEnvironment(env: NodeJS.ProcessEnv = process.env) {
  const port = Number(env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT doit être un entier entre 1 et 65535.');
  }
  const corsOrigins = (env.CORS_ORIGINS ?? (env.NODE_ENV === 'production' ? '' : 'http://localhost:3000'))
    .split(',').map(origin => origin.trim()).filter(Boolean);
  for (const origin of corsOrigins) {
    const parsed = new URL(origin);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) {
      throw new Error('CORS_ORIGINS doit contenir des origines HTTP(S) exactes, sans chemin ni slash final.');
    }
  }
  const databasePath = env.DATABASE_PATH ?? (env.NODE_ENV === 'test' ? ':memory:' : './data/rami.sqlite');
  if (!databasePath.trim()) throw new Error('DATABASE_PATH ne peut pas être vide.');
  const trustProxyHops = Number(env.TRUST_PROXY_HOPS ?? 0);
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0 || trustProxyHops > 10) throw new Error('TRUST_PROXY_HOPS doit être compris entre 0 et 10.');
  return { port, corsOrigins, databasePath, trustProxyHops };
}

export interface RedisConnectionOptions {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export function parseRedisUrl(url?: string): RedisConnectionOptions {
  try {
    const u = new URL(url || 'redis://localhost:6379');
    return {
      host: u.hostname,
      port: Number(u.port || 6379),
      username: u.username || undefined,
      password: u.password || undefined,
    };
  } catch {
    return { host: 'localhost', port: 6379 };
  }
}


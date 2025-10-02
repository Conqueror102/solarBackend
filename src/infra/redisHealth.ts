// src/infra/checkRedis.ts
import { redis } from '../config/redis.js';

export async function checkRedisConnectivity() {
  try {
    await redis.connect(); // no-op if already connected
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

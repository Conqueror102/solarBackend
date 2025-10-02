// src/utils/throttle.ts
import { redis } from '../config/redis.js';

export async function throttleOnce(
  key: string,
  ttlSec: number
): Promise<{ allowed: boolean; ttlRemainingSec?: number }> {
  const ok = await redis.set(key, '1', 'EX', ttlSec, 'NX'); // ioredis positional flags
  if (ok) return { allowed: true };

  const ttlRemaining = await redis.ttl(key);
  return { allowed: false, ttlRemainingSec: ttlRemaining >= 0 ? ttlRemaining : undefined };
}

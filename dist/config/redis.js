// src/config/redis.ts
import IORedis from 'ioredis';
const url = process.env.REDIS_URL;
if (!url) {
    throw new Error("REDIS_URL is not set");
}
const isTls = url.startsWith('rediss://');
const backoff = (attempt) => Math.min(1000 * 2 ** attempt, 15000) + Math.floor(Math.random() * 300); // jitter
export const redis = new IORedis(url, {
    ...(isTls ? { tls: {} } : {}),
    lazyConnect: true,
    // Reconnect sanely (and include ECONNRESET)
    retryStrategy: backoff,
    reconnectOnError: (err) => /READONLY|ECONNRESET|ETIMEDOUT|EAI_AGAIN/i.test(err.message),
    // Don’t fail commands during reconnects
    maxRetriesPerRequest: null,
    keepAlive: 10000,
});
redis.on('error', (e) => console.error('[ioredis] error:', e?.message));
redis.on('end', () => console.warn('[ioredis] connection ended'));
redis.on('reconnecting', (ms) => console.warn(`[ioredis] reconnecting in ${ms}ms`));
let heartbeat = null;
export async function ensureRedisConnected() {
    try {
        await redis.connect(); // no-op if already connected
        console.log('Redis PING =', await redis.ping());
        if (!heartbeat) {
            heartbeat = setInterval(() => { redis.ping().catch(() => { }); }, 30000);
            heartbeat.unref?.();
        }
    }
    catch (e) {
        console.error('Redis connect failed:', e.message);
    }
}

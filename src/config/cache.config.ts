import { CacheModuleOptions } from "@nestjs/cache-manager";
import * as redisStore from "cache-manager-redis-store";

export const cacheConfig: CacheModuleOptions = {
  store: redisStore,
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  ttl: 60 * 5, // Time to live in seconds (5 minutes)
};

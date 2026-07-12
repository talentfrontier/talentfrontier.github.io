import { Global, Module } from "@nestjs/common";
import { ConnectionOptions, Queue } from "bullmq";
import { QUEUE } from "./queues.constants";

export const REDIS_CONNECTION = "REDIS_CONNECTION";
export const queueToken = (name: string) => `QUEUE_${name}`;

/**
 * BullMQ connection options parsed from REDIS_URL. Queues and workers each
 * open their own connection from these options (BullMQ's recommended setup;
 * `maxRetriesPerRequest: null` is required for workers).
 */
export function redisConnectionOptions(url: string): ConnectionOptions {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    ...(parsed.protocol === "rediss:" && { tls: {} }),
    maxRetriesPerRequest: null,
  };
}

const connectionProvider = {
  provide: REDIS_CONNECTION,
  useFactory: () =>
    redisConnectionOptions(process.env.REDIS_URL ?? "redis://localhost:6379"),
};

const queueProviders = Object.values(QUEUE).map((name) => ({
  provide: queueToken(name),
  inject: [REDIS_CONNECTION],
  useFactory: (connection: ConnectionOptions) =>
    new Queue(name, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: 1_000,
        removeOnFail: 5_000,
      },
    }),
}));

@Global()
@Module({
  providers: [connectionProvider, ...queueProviders],
  exports: [REDIS_CONNECTION, ...queueProviders.map((p) => p.provide)],
})
export class QueuesModule {}

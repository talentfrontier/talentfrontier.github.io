export const configuration = () => ({
  env: process.env.NODE_ENV ?? "development",
  port: Number(process.env.API_PORT ?? 4000),
  webUrl: process.env.WEB_URL ?? "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  jwt: {
    secret: process.env.JWT_SECRET ?? "dev-secret",
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret",
    expiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "30d",
  },
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    },
  },
  storage: {
    driver: process.env.STORAGE_DRIVER ?? "s3",
    s3: {
      bucket: process.env.S3_BUCKET,
      region: process.env.S3_REGION,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
    supabase: {
      url: process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      bucket: process.env.SUPABASE_STORAGE_BUCKET ?? "media",
    },
  },
  ai: {
    openaiKey: process.env.OPENAI_API_KEY,
    anthropicKey: process.env.ANTHROPIC_API_KEY,
    geminiKey: process.env.GOOGLE_GEMINI_API_KEY,
    fluxKey: process.env.FLUX_API_KEY,
    stabilityKey: process.env.STABILITY_API_KEY,
    runwayKey: process.env.RUNWAY_API_KEY,
    higgsfieldKey: process.env.HIGGSFIELD_API_KEY,
    pikaKey: process.env.PIKA_API_KEY,
    elevenlabsKey: process.env.ELEVENLABS_API_KEY,
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    prices: {
      STARTER: process.env.STRIPE_PRICE_STARTER,
      PROFESSIONAL: process.env.STRIPE_PRICE_PROFESSIONAL,
      BUSINESS: process.env.STRIPE_PRICE_BUSINESS,
      ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE,
    },
  },
});

import dotenv from "dotenv";

dotenv.config();

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  nodeEnv: requireEnv("NODE_ENV", "development"),
  port: Number(requireEnv("PORT", "4000")),
  corsOrigins: requireEnv("CORS_ORIGINS", "http://localhost:3000"),
  dbHost: requireEnv("DB_HOST", "localhost"),
  dbPort: Number(requireEnv("DB_PORT", "5432")),
  dbName: requireEnv("DB_NAME", "civicpulse"),
  dbUser: requireEnv("DB_USER", "postgres"),
  dbPassword: requireEnv("DB_PASSWORD"),
  dbSsl: requireEnv("DB_SSL", "false") === "true",
  demoAuthPassword: requireEnv("DEMO_AUTH_PASSWORD", "civicpulse123"),
  rateLimitWindowMs: Number(requireEnv("RATE_LIMIT_WINDOW_MS", "60000")),
  rateLimitMaxRequests: Number(requireEnv("RATE_LIMIT_MAX_REQUESTS", "120")),
};

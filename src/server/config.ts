import "dotenv/config";

function readInt(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: readInt("PORT", 3000),
  jsonLimit: process.env.JSON_LIMIT || "50mb",
  ollamaHost: process.env.OLLAMA_HOST || "http://localhost:11434",
  ollamaTimeoutMs: readInt("OLLAMA_TIMEOUT_MS", 180000),
  database: {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    name: process.env.DB_NAME || "thegu",
    port: readInt("DB_PORT", 5433),
  },
};

export const isProduction = config.nodeEnv === "production";

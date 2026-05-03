import pkg from "pg";
import { config } from "./config";

const { Pool } = pkg;

export const pool = new Pool({
  host: config.database.host,
  user: config.database.user,
  password: config.database.password,
  database: config.database.name,
  port: config.database.port,
});

export async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS analysis_cache (
        groupkey TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        timestamp BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS report_cache (
        groupkey TEXT PRIMARY KEY,
        report TEXT NOT NULL,
        timestamp BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS legal_context_cache (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        text TEXT NOT NULL,
        embedding DOUBLE PRECISION[] NOT NULL,
        updated_at BIGINT NOT NULL
      );
    `);
  } finally {
    client.release();
  }
}

export async function closeDatabase() {
  await pool.end();
}

import pkg from "pg";
import { config } from "./config";

const { Pool } = pkg;

type QueryResultRow = Record<string, unknown>;

const analysisCache = new Map<string, { data: string; timestamp: number }>();
const reportCache = new Map<string, { report: string; timestamp: number }>();
const legalContextCache = new Map<string, { id: string; source: string; text: string; embedding: number[]; updated_at: number }>();

let databaseMode: "connected" | "memory" = "connected";

export const pool = new Pool({
  host: config.database.host,
  user: config.database.user,
  password: config.database.password,
  database: config.database.name,
  port: config.database.port,
});

function normalize(sql: string) {
  return sql.replace(/\s+/g, " ").trim().toUpperCase();
}

function queryInMemory(text: string, params: unknown[] = []) {
  const sql = normalize(text);

  if (sql.startsWith("SELECT 1")) {
    return { rows: [{ "?column?": 1 }], rowCount: 1 };
  }

  if (sql.includes("INSERT INTO ANALYSIS_CACHE")) {
    const [groupKey, data, timestamp] = params as [string, string, number];
    analysisCache.set(groupKey, { data, timestamp });
    return { rows: [], rowCount: 1 };
  }

  if (sql.includes("SELECT DATA FROM ANALYSIS_CACHE")) {
    const [groupKey] = params as [string];
    const record = analysisCache.get(groupKey);
    return { rows: record ? [{ data: record.data }] : [], rowCount: record ? 1 : 0 };
  }

  if (sql.includes("INSERT INTO REPORT_CACHE")) {
    const [groupKey, report, timestamp] = params as [string, string, number];
    reportCache.set(groupKey, { report, timestamp });
    return { rows: [], rowCount: 1 };
  }

  if (sql.includes("SELECT REPORT FROM REPORT_CACHE")) {
    const [groupKey] = params as [string];
    const record = reportCache.get(groupKey);
    return { rows: record ? [{ report: record.report }] : [], rowCount: record ? 1 : 0 };
  }

  if (sql.includes("SELECT ID FROM LEGAL_CONTEXT_CACHE")) {
    const [id, source, body] = params as [string, string, string];
    const record = legalContextCache.get(id);
    const matches = record && record.source === source && record.text === body;
    return { rows: matches ? [{ id: record.id }] : [], rowCount: matches ? 1 : 0 };
  }

  if (sql.includes("INSERT INTO LEGAL_CONTEXT_CACHE")) {
    const [id, source, body, embedding, updatedAt] = params as [string, string, string, number[], number];
    legalContextCache.set(id, {
      id,
      source,
      text: body,
      embedding,
      updated_at: updatedAt,
    });
    return { rows: [], rowCount: 1 };
  }

  if (sql.includes("SELECT ID, SOURCE, TEXT, EMBEDDING FROM LEGAL_CONTEXT_CACHE")) {
    return { rows: Array.from(legalContextCache.values()), rowCount: legalContextCache.size };
  }

  if (sql.startsWith("CREATE TABLE IF NOT EXISTS")) {
    return { rows: [], rowCount: 0 };
  }

  throw new Error(`Unsupported in-memory query: ${sql}`);
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  if (databaseMode === "memory") {
    return queryInMemory(text, params) as unknown as { rows: T[]; rowCount: number };
  }

  try {
    const result = await pool.query(text, params);
    return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
  } catch (error) {
    databaseMode = "memory";
    console.warn("[DATABASE_FALLBACK] Switching to in-memory cache mode.", error);
    return queryInMemory(text, params) as unknown as { rows: T[]; rowCount: number };
  }
}

export function getDatabaseStatus() {
  return databaseMode;
}

export async function initDatabase() {
  try {
    await query(`
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
  } catch (error) {
    databaseMode = "memory";
    console.warn("[DATABASE_INIT_FALLBACK] Running without external database.", error);
  }
}

export async function closeDatabase() {
  if (databaseMode === "connected") {
    await pool.end();
  }
}

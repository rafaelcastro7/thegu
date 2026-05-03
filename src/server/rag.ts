import { LEGAL_KNOWLEDGE_BASE } from "../lib/legalKnowledgeBase";
import { cosineSimilarity } from "../lib/vector";
import { pool } from "./database";
import { getEmbedding } from "./ollama";

const EMBED_MODEL = "nomic-embed-text";

interface LegalContextRow {
  id: string;
  source: string;
  text: string;
  embedding: unknown;
}

function parseEmbedding(value: unknown): number[] {
  if (Array.isArray(value)) return value.map(Number);
  if (typeof value !== "string") return [];

  return value
    .replace(/^\{|\}$/g, "")
    .split(",")
    .map((part) => Number.parseFloat(part))
    .filter((part) => Number.isFinite(part));
}

function relevanceBonus(text: string, redFlags: string[]) {
  const flags = redFlags.join(" ").toLowerCase();
  const normalizedText = text.toLowerCase();
  let bonus = 0;

  if (flags.includes("fraccionamiento") && normalizedText.includes("fraccionamiento")) bonus += 0.2;
  if (flags.includes("bunching") && normalizedText.includes("bunching")) bonus += 0.3;
  if (flags.includes("modalidad") && normalizedText.includes("modalidad")) bonus += 0.2;
  if (flags.includes("competencia") && normalizedText.includes("competencia")) bonus += 0.1;
  if (flags.includes("planeacion") && normalizedText.includes("planeacion")) bonus += 0.1;

  return bonus;
}

async function ensureLegalContextIndex() {
  for (const item of LEGAL_KNOWLEDGE_BASE) {
    const existing = await pool.query(
      "SELECT id FROM legal_context_cache WHERE id = $1 AND source = $2 AND text = $3",
      [item.id, item.source, item.text]
    );

    if (existing.rowCount && existing.rowCount > 0) continue;

    const embedding = await getEmbedding(EMBED_MODEL, item.text);
    await pool.query(
      `INSERT INTO legal_context_cache (id, source, text, embedding, updated_at)
       VALUES ($1, $2, $3, $4::double precision[], $5)
       ON CONFLICT (id)
       DO UPDATE SET source = EXCLUDED.source, text = EXCLUDED.text, embedding = EXCLUDED.embedding, updated_at = EXCLUDED.updated_at`,
      [item.id, item.source, item.text, embedding, Date.now()]
    );
  }
}

export async function getPersistentLegalContext(query: string, redFlags: string[] = []) {
  await ensureLegalContextIndex();

  const queryEmbedding = await getEmbedding(EMBED_MODEL, query);
  const { rows } = await pool.query<LegalContextRow>(
    "SELECT id, source, text, embedding FROM legal_context_cache"
  );

  const ranked = rows
    .map((row) => {
      const embedding = parseEmbedding(row.embedding);
      const similarity = embedding.length ? cosineSimilarity(queryEmbedding, embedding) : 0;
      const bonus = relevanceBonus(row.text, redFlags);

      return {
        ...row,
        score: similarity + bonus,
      };
    })
    .sort((a, b) => b.score - a.score);

  return ranked
    .slice(0, 3)
    .filter((item) => item.score > 0.35)
    .map((item) => `### ${item.source}\n${item.text}\n(Relevancia Forense: ${(item.score * 100).toFixed(1)}%)`)
    .join("\n\n---\n\n");
}

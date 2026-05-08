import { getEmbedding } from "./gemini";
import { LEGAL_KNOWLEDGE_BASE, LegalContext } from "./legalKnowledgeBase";
import { cosineSimilarity } from "./vector";

let indexedKnowledgeBase: LegalContext[] = [];

function getQuickLegalContext(query: string, redFlags: string[]) {
  const terms = `${query} ${redFlags.join(' ')}`.toLowerCase();
  const matches = LEGAL_KNOWLEDGE_BASE
    .map((item) => {
      const text = `${item.source} ${item.text}`.toLowerCase();
      let score = 0;
      for (const token of terms.split(/\s+/).filter(Boolean)) {
        if (text.includes(token)) score += 1;
      }
      score += getBonus(item.text, redFlags) * 10;
      return { ...item, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .filter((item) => item.score > 0);

  return matches
    .map((item) => `### ${item.source}\n${item.text}\n(Relevancia Forense: ${(Math.min(item.score / 10, 0.99) * 100).toFixed(1)}%)`)
    .join("\n\n---\n\n");
}

async function initializeLocalIndex() {
  if (indexedKnowledgeBase.length > 0) return;

  const indexed: LegalContext[] = [];
  for (const item of LEGAL_KNOWLEDGE_BASE) {
    try {
      const embedding = await getEmbedding(item.text);
      indexed.push({ ...item, embedding });
    } catch (error) {
      console.warn("Skipping local RAG index for item:", item.id, error);
    }
  }

  indexedKnowledgeBase = indexed;
}

function getBonus(text: string, redFlags: string[]) {
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

async function getLocalLegalContext(query: string, redFlags: string[]) {
  await initializeLocalIndex();

  const queryEmbedding = await getEmbedding(query);
  const results = indexedKnowledgeBase
    .map((doc) => {
      const similarity = doc.embedding ? cosineSimilarity(queryEmbedding, doc.embedding) : 0;
      return {
        ...doc,
        score: similarity + getBonus(doc.text, redFlags),
      };
    })
    .sort((a, b) => b.score - a.score);

  return results
    .slice(0, 3)
    .filter((item) => item.score > 0.35)
    .map((item) => `### ${item.source}\n${item.text}\n(Relevancia Forense: ${(item.score * 100).toFixed(1)}%)`)
    .join("\n\n---\n\n");
}

export async function getLegalContext(query: string, redFlags: string[] = []): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch("/api/rag/legal-context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, redFlags }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      const payload = await response.json();
      if (typeof payload.context === "string") return payload.context;
    }
  } catch (error) {
    console.warn("Persistent RAG unavailable; falling back to local RAG.", error);
  }

  try {
    return await Promise.race<string>([
      getLocalLegalContext(query, redFlags),
      new Promise<string>((resolve) => {
        setTimeout(() => resolve(getQuickLegalContext(query, redFlags)), 2000);
      }),
    ]);
  } catch {
    return getQuickLegalContext(query, redFlags);
  }
}

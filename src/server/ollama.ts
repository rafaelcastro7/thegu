import { config } from "./config";

export interface OllamaEmbeddingResponse {
  embedding: number[];
}

export interface OllamaGenerateResponse {
  response?: string;
}

export async function callOllama<T>(endpoint: string, payload: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.ollamaTimeoutMs);

  try {
    const response = await fetch(`${config.ollamaHost}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Ollama request failed (${response.status}): ${body}`);
    }

    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getEmbedding(model: string, prompt: string) {
  const result = await callOllama<OllamaEmbeddingResponse>("/api/embeddings", {
    model,
    prompt,
  });

  return result.embedding;
}

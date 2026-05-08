import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fetchContractsFromSecop } from "../lib/secop";
import { config, isProduction } from "./config";
import { pool } from "./database";
import { asyncHandler, handleApiError, HttpError, readLimit, requireString } from "./http";
import { callOllama } from "./ollama";
import { getPersistentLegalContext } from "./rag";

function parseStoredJson(value: unknown) {
  if (typeof value !== "string") return value;
  return JSON.parse(value);
}

function requireObject(value: unknown, field: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, `${field} must be an object`);
  }

  return value;
}

function requireStringArray(value: unknown, field: string) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new HttpError(400, `${field} must be a string array`);
  }

  return value;
}

function buildSecopSourceUrl(processRef: string) {
  return `https://www.secop.gov.co/Consultas/busqueda/detalle-del-proceso.aspx?IdProcess=${encodeURIComponent(processRef)}`;
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.replace(/\s+/g, " ").trim() || "Fuente SECOP";
}

export async function createApp() {
  const app = express();
  app.use(express.json({ limit: config.jsonLimit }));

  app.post("/api/logs", (req, res) => {
    const action = typeof req.body?.action === "string" ? req.body.action : "UNKNOWN";
    const details = req.body?.details ?? {};
    const timestamp = typeof req.body?.timestamp === "string" ? req.body.timestamp : new Date().toISOString();
    const user = typeof req.body?.user === "string" ? req.body.user : "anonymous";

    console.log(`[AUDIT] [${timestamp}] ACTION: ${action} | USER: ${user} | DETAILS: ${JSON.stringify(details)}`);
    res.json({ status: "ok" });
  });

  app.get("/api/health", asyncHandler(async (_req, res) => {
    await pool.query("SELECT 1");
    res.json({
      status: "ok",
      database: "connected",
      ollamaHost: config.ollamaHost,
    });
  }));

  app.get("/api/secop/contracts", asyncHandler(async (req, res) => {
    const entity = requireString(req.query.entity, "entity", 120);
    const limit = readLimit(req.query.limit, 50, 100);
    const contracts = await fetchContractsFromSecop(entity, limit);
    res.json(contracts);
  }));

  app.get("/api/secop/source", asyncHandler(async (req, res) => {
    const url = typeof req.query.url === "string" && req.query.url.trim().length > 0
      ? req.query.url.trim()
      : null;
    const processId = typeof req.query.processId === "string" && req.query.processId.trim().length > 0
      ? req.query.processId.trim()
      : null;
    const sourceUrl = url || (processId ? buildSecopSourceUrl(processId) : null);

    if (!sourceUrl) {
      throw new HttpError(400, "url or processId is required");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(sourceUrl, {
        headers: {
          "user-agent": "GobIA-Auditor/1.0",
          "accept": "text/html,application/xhtml+xml",
        },
        signal: controller.signal,
      });

      const html = await response.text();
      const bodyText = stripHtml(html);
      const title = extractTitle(html);

      res.json({
        url: sourceUrl,
        title,
        fetchedAt: new Date().toISOString(),
        statusCode: response.status,
        excerpt: bodyText.slice(0, 2000),
        bodyText: bodyText.slice(0, 20000),
      });
    } finally {
      clearTimeout(timeout);
    }
  }));

  app.post("/api/cache/analysis", asyncHandler(async (req, res) => {
    const groupKey = requireString(req.body?.groupKey, "groupKey", 300);
    const data = requireObject(req.body?.data, "data");

    await pool.query(
      "INSERT INTO analysis_cache (groupkey, data, timestamp) VALUES ($1, $2, $3) ON CONFLICT (groupkey) DO UPDATE SET data = EXCLUDED.data, timestamp = EXCLUDED.timestamp",
      [groupKey, JSON.stringify(data), Date.now()]
    );

    res.json({ status: "ok" });
  }));

  app.get("/api/cache/analysis/:groupKey", asyncHandler(async (req, res) => {
    const groupKey = requireString(req.params.groupKey, "groupKey", 300);
    const { rows } = await pool.query("SELECT data FROM analysis_cache WHERE groupkey = $1", [groupKey]);

    if (rows.length === 0) {
      throw new HttpError(404, "Not found");
    }

    res.json(parseStoredJson(rows[0].data));
  }));

  app.post("/api/cache/report", asyncHandler(async (req, res) => {
    const groupKey = requireString(req.body?.groupKey, "groupKey", 300);
    const report = requireString(req.body?.report, "report", 500000);

    await pool.query(
      "INSERT INTO report_cache (groupkey, report, timestamp) VALUES ($1, $2, $3) ON CONFLICT (groupkey) DO UPDATE SET report = EXCLUDED.report, timestamp = EXCLUDED.timestamp",
      [groupKey, report, Date.now()]
    );

    res.json({ status: "ok" });
  }));

  app.get("/api/cache/report/:groupKey", asyncHandler(async (req, res) => {
    const groupKey = requireString(req.params.groupKey, "groupKey", 300);
    const { rows } = await pool.query("SELECT report FROM report_cache WHERE groupkey = $1", [groupKey]);

    if (rows.length === 0) {
      throw new HttpError(404, "Not found");
    }

    res.json({ report: rows[0].report });
  }));

  app.post("/api/ollama/embeddings", asyncHandler(async (req, res) => {
    const model = requireString(req.body?.model, "model", 100);
    const prompt = requireString(req.body?.prompt, "prompt", 50000);
    const payload = await callOllama("/api/embeddings", { model, prompt });
    res.json(payload);
  }));

  app.post("/api/ollama/generate", asyncHandler(async (req, res) => {
    const model = requireString(req.body?.model, "model", 100);
    const prompt = requireString(req.body?.prompt, "prompt", 100000);
    const stream = req.body?.stream === true;
    const options = req.body?.options && typeof req.body.options === "object" ? req.body.options : undefined;
    const payload = await callOllama("/api/generate", { model, prompt, stream, options });
    res.json(payload);
  }));

  app.post("/api/rag/legal-context", asyncHandler(async (req, res) => {
    const query = requireString(req.body?.query, "query", 10000);
    const redFlags = requireStringArray(req.body?.redFlags, "redFlags");
    const context = await getPersistentLegalContext(query, redFlags);
    res.json({ context });
  }));

  // ── Chat assistant: Claude → Gemini → Ollama fallback chain ──────────────
  app.post("/api/chat/assistant", asyncHandler(async (req, res) => {
    const systemPrompt = requireString(req.body?.systemPrompt, "systemPrompt", 20000);
    const userMessage = requireString(req.body?.userMessage, "userMessage", 4000);
    const history: { role: string; content: string }[] = Array.isArray(req.body?.history)
      ? req.body.history.slice(-8)
      : [];

    // 1. Try Anthropic Claude (fastest, highest quality)
    if (config.anthropicApiKey) {
      try {
        const messages = [
          ...history.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
          { role: "user", content: userMessage },
        ];
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": config.anthropicApiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 600,
            system: systemPrompt,
            messages,
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (response.ok) {
          const data = await response.json() as { content?: { text: string }[] };
          const text = data?.content?.[0]?.text?.trim();
          if (text) { res.json({ response: text, provider: "claude" }); return; }
        }
      } catch (err) {
        console.warn("[CHAT] Claude API failed, trying Gemini", err);
      }
    }

    // 2. Try Google Gemini Flash (fast + free tier)
    if (config.geminiApiKey) {
      try {
        const contents = [
          ...history.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
          { role: "user", parts: [{ text: userMessage }] },
        ];
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${config.geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents,
              generationConfig: { maxOutputTokens: 600, temperature: 0.3 },
            }),
            signal: AbortSignal.timeout(15000),
          }
        );

        if (response.ok) {
          const data = await response.json() as { candidates?: { content?: { parts?: { text: string }[] } }[] };
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) { res.json({ response: text, provider: "gemini" }); return; }
        }
      } catch (err) {
        console.warn("[CHAT] Gemini API failed, trying Ollama", err);
      }
    }

    // 3. Fallback to Ollama local
    try {
      const ollamaModels = ["qwen3:4b", "tinyllama:latest"];
      const conversationText = [
        ...history.map(m => `${m.role === "assistant" ? "Asistente" : "Usuario"}: ${m.content}`),
        `Usuario: ${userMessage}`,
        "Asistente:",
      ].join("\n");

      const prompt = `${systemPrompt}\n\n---\n${conversationText}`;
      let ollamaText = "";

      for (const model of ollamaModels) {
        try {
          const ollamaResp = await callOllama("generate", {
            model,
            prompt: `/no_think\n${prompt}`,
            stream: false,
            options: { num_predict: 500, temperature: 0.3 },
          });
          ollamaText = ((ollamaResp as { response?: string }).response || "").trim();
          if (ollamaText) break;
        } catch {
          continue;
        }
      }

      if (ollamaText) { res.json({ response: ollamaText, provider: "ollama" }); return; }
    } catch (err) {
      console.error("[CHAT] All providers failed", err);
    }

    res.json({
      response: "Lo siento, ningún proveedor de IA está disponible ahora mismo. Verifica que Ollama esté corriendo, o configura ANTHROPIC_API_KEY / GEMINI_API_KEY en el archivo .env.",
      provider: "none",
    });
  }));

  app.use("/api", (_req, _res, next) => {
    next(new HttpError(404, "API route not found"));
  });

  app.use(handleApiError);

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  return app;
}

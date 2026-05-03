import { expect, test } from "@playwright/test";

test("backend health and cache APIs are operational", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();
  expect(await health.json()).toEqual(expect.objectContaining({
    status: "ok",
    database: "connected",
  }));

  const groupKey = `E2E-${Date.now()}`;
  const analysis = {
    groupKey,
    data: {
      providerName: "Proveedor E2E",
      risk: "Red",
      riskScore: 88,
    },
  };

  const saveAnalysis = await request.post("/api/cache/analysis", { data: analysis });
  expect(saveAnalysis.ok()).toBeTruthy();

  const loadAnalysis = await request.get(`/api/cache/analysis/${encodeURIComponent(groupKey)}`);
  expect(loadAnalysis.ok()).toBeTruthy();
  expect(await loadAnalysis.json()).toEqual(expect.objectContaining(analysis.data));

  const saveReport = await request.post("/api/cache/report", {
    data: { groupKey, report: "Informe E2E OK" },
  });
  expect(saveReport.ok()).toBeTruthy();

  const loadReport = await request.get(`/api/cache/report/${encodeURIComponent(groupKey)}`);
  expect(loadReport.ok()).toBeTruthy();
  expect(await loadReport.json()).toEqual({ report: "Informe E2E OK" });
});

test("backend SECOP proxy returns live contracts", async ({ request }) => {
  const response = await request.get("/api/secop/contracts", {
    params: {
      entity: "SENA",
      limit: "3",
    },
  });

  expect(response.ok()).toBeTruthy();
  const contracts = await response.json();
  expect(Array.isArray(contracts)).toBeTruthy();
  expect(contracts.length).toBeGreaterThan(0);
  expect(contracts[0]).toEqual(expect.objectContaining({
    nombre_entidad: expect.any(String),
    objeto_del_contrato: expect.any(String),
  }));
});

test("persistent legal RAG returns ranked context", async ({ request }) => {
  const response = await request.post("/api/rag/legal-context", {
    data: {
      query: "contratos con objetos similares y posible fraccionamiento contractual",
      redFlags: ["fraccionamiento", "competencia"],
    },
  });

  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(payload.context).toContain("Relevancia Forense");
  expect(payload.context.toLowerCase()).toContain("fraccionamiento");
});

test("local generation endpoint can produce non-empty text with fallback model", async ({ request }) => {
  const response = await request.post("/api/ollama/generate", {
    data: {
      model: "tinyllama:latest",
      prompt: "Responde con una sola palabra: OK",
      stream: false,
      options: {
        num_predict: 40,
        temperature: 0,
      },
    },
  });

  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(payload.response.trim().length).toBeGreaterThan(0);
});

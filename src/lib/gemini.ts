import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY;

export const ai = new GoogleGenAI({ apiKey: API_KEY! });

// Simple In-memory cache for embeddings
const embeddingCache = new Map<string, number[]>();

async function withRetry<T>(fn: () => Promise<T>, retries = 5, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Better detection of 429 errors in different SDK versions
    const errorStr = JSON.stringify(error).toLowerCase();
    const isQuotaError = 
      errorStr.includes('429') || 
      errorStr.includes('quota') || 
      errorStr.includes('resource_exhausted') ||
      error?.status === 429;

    if (isQuotaError && retries > 0) {
      const waitTime = delay + Math.random() * 2000;
      console.warn(`[GOB-IA] Quota exceeded. Throttling... Retrying in ${Math.round(waitTime)}ms. Attempts left: ${retries}`);
      await new Promise(r => setTimeout(r, waitTime));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function getEmbedding(text: string) {
  if (!text) return null;
  if (embeddingCache.has(text)) return embeddingCache.get(text);

  try {
    return await withRetry(async () => {
      const result = await ai.models.embedContent({
        model: "gemini-embedding-2-preview",
        contents: [{ parts: [{ text }] }],
      });
      const embedding = result.embeddings?.[0]?.values;
      if (embedding) {
        embeddingCache.set(text, embedding);
      }
      return embedding;
    });
  } catch (error) {
    console.error("Embedding Final Failure:", error);
    // Fallback vector to keep the system running locally without API
    return new Array(768).fill(0).map(() => Math.random());
  }
}

export function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    mA += vecA[i] * vecA[i];
    mB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(mA) * Math.sqrt(mB));
}

export async function generateForensicReport(result: any, legalContext: string, lang: 'ES' | 'EN' = 'ES') {
  const isEs = lang === 'ES';
  const prompt = `
    ROLE: ${isEs ? 'Auditor Senior de la Contraloría General / Experto en Analítica Forense' : 'Senior Auditor of the Comptroller General / Forensic Analytics Expert'}
    GOAL: ${isEs ? 'Ejecutar un análisis exhaustivo y emitir un Dictamen Técnico-Jurídico de alta densidad sobre posibles irregularidades en contratación.' : 'Execute an exhaustive analysis and issue a high-density Technical-Legal Opinion on potential procurement irregularities.'}
    LANGUAGE: ${isEs ? 'SPANISH (ES)' : 'ENGLISH (EN)'}

    AUDIT PARAMETERS:
    - Target: ${result.providerName}
    - Exposure: $${result.totalValue.toLocaleString(isEs ? 'es-CO' : 'en-US')} COP
    - Dataset: ${result.contracts?.length || 0} items identified in SECOP II.
    - Similarity Index: ${(result.similarityScore * 100).toFixed(2)}% (Semantic overlap)
    - Timeframe: ${result.maxDayDiff} days between related events.
    - RISK INDEX: ${result.riskScore}/100 [CRITICAL THRESHOLD]
    - ALERTS DETECTED: ${result.redFlags.join(', ')}

    RAW CONTRACT DATA (SAMPLE):
    ${result.contracts.slice(0, 15).map((c: any) => `ID: ${c.numero_de_contrato}, Obj: ${c.objeto_del_contrato}, Val: ${c.valor_total_con_adiciones}, Date: ${c.fecha_de_firma}`).join('\n')}

    INSTRUCTIONS:
    1. Be extremely rigorous. Use professional judicial and audit language.
    2. THE REPORT MUST BE LONG AND EXHAUSTIVE (at least 800-1000 words).
    3. Include a "MATRIZ DE HALLAZGOS" using Markdown TABLES comparing: Contract ID, Object, Value, and Signing Date.
    4. Explicitly cite the Legal context provided.
    5. Perform a "Cross-Check" between the contract objects. If they are similar (e.g., "Suministro de papelería" vs "Adquisición de insumos de oficina"), explain why this constitutes risky splitting.
    6. Include a section on "ECONOMIC IMPACT" analyzing the concentration of wealth in a single provider.
    7. Mention specific articles from Law 80 of 1993 and Law 1474 of 2011 (Anti-corruption Statute) relevant to the findings.

    STRUCTURE (MANDATORY MARKDOWN):
    # ${isEs ? 'INFORME TÉCNICO DE AUDITORÍA FORENSE NEURAL' : 'NEURAL FORENSIC AUDIT TECHNICAL REPORT'}
    **${isEs ? 'PROTOCOLO DE SEGURIDAD' : 'SECURITY PROTOCOL'}: PRO-GOV-AI-2026**

    ## 1. ${isEs ? 'RESUMEN EJECUTIVO DE RIESGO FISCAL' : 'EXECUTIVE SUMMARY OF FISCAL RISK'}
    (Detailed summary of the total exposure and the gravity of the detected similarity).

    ## 2. ${isEs ? 'ANÁLISIS DE LA ENTIDAD Y EL PROVEEDOR' : 'ENTITY AND PROVIDER ANALYSIS'}
    (History and context of the relationship).

    ## 3. ${isEs ? 'MATRIZ DE EVIDENCIA (TABLA DE CONTRATOS)' : 'EVIDENCE MATRIX (CONTRACT TABLE)'}
    | ${isEs ? 'ID Contrato' : 'Contract ID'} | ${isEs ? 'Objeto' : 'Object'} | ${isEs ? 'Valor' : 'Value'} | ${isEs ? 'Fecha' : 'Date'} |
    |---|---|---|---|
    (Fill this table with the inferred contracts based on the findings).

    ## 4. ${isEs ? 'CORRELACIÓN SEMÁNTICA Y VECTORIAL' : 'SEMANTIC AND VECTORIAL CORRELATION'}
    (Explain why the ${ (result.similarityScore * 100).toFixed(1) }% score is an indicator of collusion or splitting).

    ## 5. ${isEs ? 'CUMPLIMIENTO NORMATIVO Y HALLAZGOS JURÍDICOS' : 'LEGAL COMPLIANCE AND FINDINGS'}
    (Incorporate Law 80, Law 1474 and the provided Context: ${legalContext}).

    ## 6. ${isEs ? 'ACCIONES ADMINISTRATIVAS RECOMENDADAS' : 'RECOMMENDED ADMINISTRATIVE ACTIONS'}
    (Specific, high-impact recommendations for the supervisor).

    STYLE: Official, high-impact, forensic. NO PREAMBLES or "Sure, here is the report". Just the markdown.
  `;

  const response = await withRetry(() => ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      temperature: 0.1,
    }
  }));

  return response.text;
}

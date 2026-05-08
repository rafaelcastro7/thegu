import { generateForensicReport } from './gemini';
import { getCachedReport, cacheReport } from './firebase';
import type { AnalysisResult } from './analysis';

export enum ModelProvider {
  OLLAMA = 'OLLAMA_LOCAL',
  LOCAL_LLAMA = 'LOCAL_LLAMA', // We'll use a T5 model for local text generation
  CUSTOM_ON_PREM = 'CUSTOM_ON_PREM'
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: ModelProvider;
  status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'LOADING';
  latency: number;
  costPerToken: number;
  tokensUsed: number;
  enabled: boolean;
}

export interface NeuralMetrics {
  totalCalls: number;
  totalTokens: number;
  avgLatency: number;
  burnRate: number; 
  errorRate: number;
}

class NeuralManager {
  private models: ModelConfig[] = [
    { id: 'qwen3-4b', name: 'Qwen3 4B (Ollama)', provider: ModelProvider.OLLAMA, status: 'ONLINE', latency: 450, costPerToken: 0, tokensUsed: 0, enabled: true },
    { id: 't5-local', name: 'LaMini-T5 (Browser Node)', provider: ModelProvider.LOCAL_LLAMA, status: 'OFFLINE', latency: 120, costPerToken: 0, tokensUsed: 0, enabled: true },
    { id: 'custom-audit-v1', name: 'Custom Auditor (On-Prem)', provider: ModelProvider.CUSTOM_ON_PREM, status: 'ONLINE', latency: 850, costPerToken: 0.0005, tokensUsed: 0, enabled: false },
  ];

  private metrics: NeuralMetrics = {
    totalCalls: 0,
    totalTokens: 0,
    avgLatency: 0,
    burnRate: 0,
    errorRate: 0
  };

  private activeProvider: ModelProvider = ModelProvider.OLLAMA;
  private localPipeline: any = null;

  getModels() { return [...this.models]; }
  getMetrics() { return { ...this.metrics }; }
  getActiveProvider() { return this.activeProvider; }

  setActiveProvider(provider: ModelProvider) {
    this.activeProvider = provider;
  }

  toggleModel(id: string) {
    const model = this.models.find(m => m.id === id);
    if (model) model.enabled = !model.enabled;
  }

  async processRequest(prompt: string, options: any = {}) {
    this.metrics.totalCalls++;
    const startTime = Date.now();
    
    const tokens = Math.ceil(prompt.length / 4);
    this.metrics.totalTokens += tokens;

    const model = this.models.find(m => m.provider === this.activeProvider) || this.models[0];
    
    if (this.activeProvider === ModelProvider.LOCAL_LLAMA) {
      try {
        if (!this.localPipeline) {
          const { pipeline, env } = await import('@huggingface/transformers');
          env.allowLocalModels = false;
          env.useBrowserCache = true;

          const modelToUpdate = this.models.find(m => m.provider === ModelProvider.LOCAL_LLAMA);
          if (modelToUpdate) modelToUpdate.status = 'LOADING';
          
          this.localPipeline = await pipeline('text2text-generation', 'Xenova/LaMini-Flan-T5-77M');
          
          if (modelToUpdate) modelToUpdate.status = 'ONLINE';
        }
        
        const output = await this.localPipeline(prompt, { max_new_tokens: 50 });
        const latency = Date.now() - startTime;
        this.updateMetrics(tokens, latency, model);
        return output[0].generated_text;
      } catch (err) {
        console.error("Local Model Failed:", err);
        this.metrics.errorRate++;
        const modelToUpdate = this.models.find(m => m.provider === ModelProvider.LOCAL_LLAMA);
        if (modelToUpdate) modelToUpdate.status = 'OFFLINE';
        throw new Error('Local model unavailable. Switch to OLLAMA provider.');
      }
    }

    if (this.activeProvider === ModelProvider.OLLAMA) {
      if (options?.type === 'FORENSIC') {
        const groupKey = options.result.groupKey;
        
        // 1. Check Cloud Cache
        const cachedReport = await getCachedReport(groupKey);
        if (cachedReport) {
          const latency = Date.now() - startTime;
          this.updateMetrics(0, latency, model); // Zero tokens for cache hit
          return cachedReport;
        }

        // 2. Generate new if not cached
        const report = await Promise.race<string>([
          generateForensicReport(options.result, options.lang),
          new Promise<string>((_, reject) => {
            setTimeout(() => reject(new Error('FORENSIC_REPORT_TIMEOUT')), 25000);
          }),
        ]).catch(() => buildEmergencyForensicReport(options.result, options.lang));
        const latency = Date.now() - startTime;
        this.updateMetrics(tokens, latency, model);
        
        // 3. Save to Cloud Cache
        await cacheReport(groupKey, report);
        
        return report;
      }
    }

    // Non-FORENSIC OLLAMA calls (SYSTEM, TRAINING, etc.) are no-ops — they exist only for side-effect logging.
    const latency = Date.now() - startTime;
    this.updateMetrics(tokens, latency, model);
    return "";
  }

  private updateMetrics(tokens: number, latency: number, model: ModelConfig) {
    model.tokensUsed += tokens;
    this.metrics.avgLatency = (this.metrics.avgLatency * 0.9) + (latency * 0.1);
    this.metrics.burnRate += tokens * model.costPerToken;
  }
}

export const neuralManager = new NeuralManager();

function buildEmergencyForensicReport(result: AnalysisResult, lang: 'ES' | 'EN' = 'ES') {
  const isEs = lang === 'ES';
  const flags = result.redFlags.slice(0, 5);
  const entities = Array.from(new Set(result.contracts.map((contract) => contract.nombre_entidad))).slice(0, 4);

  if (!isEs) {
    return [
      '# Forensic Audit Report',
      '',
      '## Executive Summary',
      `The system prioritized **${result.providerName}** with a risk score of **${result.riskScore.toFixed(1)}/100** after reviewing **${result.contracts.length}** related contracts and an estimated exposure of **$${result.totalValue.toLocaleString()}**.`,
      '',
      '## Key Signals',
      ...(flags.length > 0 ? flags.map((flag) => `- ${flag}`) : ['- No explicit textual signal was available in the fallback mode.']),
      '',
      '## Traceability',
      `Reviewed entities: ${entities.join(', ') || 'Not available'}.`,
      `Time window observed: ${result.maxDayDiff} day(s).`,
      `Average semantic similarity: ${(result.similarityScore * 100).toFixed(1)}%.`,
      '',
      '## Immediate Recommendation',
      'Prioritize documentary validation of the flagged contracts, verify the process references, and confirm whether the procurement need should have been consolidated under a more competitive procedure.',
    ].join('\n');
  }

  return [
    '# Informe de Auditoría Forense',
    '',
    '## Resumen Ejecutivo',
    `El sistema priorizó a **${result.providerName}** con un puntaje de riesgo de **${result.riskScore.toFixed(1)}/100** tras revisar **${result.contracts.length}** contratos relacionados y una exposición estimada de **$${result.totalValue.toLocaleString()}**.`,
    '',
    '## Señales principales',
    ...(flags.length > 0 ? flags.map((flag) => `- ${flag}`) : ['- No hubo una señal textual explícita disponible en el modo de contingencia.']),
    '',
    '## Trazabilidad',
    `Entidades observadas: ${entities.join(', ') || 'No disponible'}.`,
    `Ventana temporal observada: ${result.maxDayDiff} día(s).`,
    `Similitud semántica promedio: ${(result.similarityScore * 100).toFixed(1)}%.`,
    '',
    '## Recomendación inmediata',
    'Priorizar validación documental de los contratos señalados, verificar referencias del proceso y confirmar si la necesidad pública debía consolidarse bajo un procedimiento con mayor competencia.',
  ].join('\n');
}

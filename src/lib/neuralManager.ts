
import { pipeline, env } from '@huggingface/transformers';
import { generateForensicReport } from './gemini';

// Configuration for Transformers.js
env.allowLocalModels = false; // Force fetching from HF Hub for now to simplify
env.useBrowserCache = true;

export enum ModelProvider {
  GEMINI = 'GEMINI_CLOUD',
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
    { id: 'gemini-3-flash', name: 'Gemini 3 Flash (Cloud)', provider: ModelProvider.GEMINI, status: 'ONLINE', latency: 450, costPerToken: 0.0001, tokensUsed: 0, enabled: true },
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

  private activeProvider: ModelProvider = ModelProvider.GEMINI;
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
        return `[LOCAL ERR] Fallback: Simulated result for ${prompt.substring(0, 20)}`;
      }
    }

    if (this.activeProvider === ModelProvider.GEMINI) {
      if (options?.type === 'FORENSIC') {
        const report = await generateForensicReport(options.result, prompt, options.lang);
        const latency = Date.now() - startTime;
        this.updateMetrics(tokens, latency, model);
        return report;
      }
    }

    const latency = model.latency + Math.random() * 200;
    await new Promise(r => setTimeout(r, latency));
    
    this.updateMetrics(tokens, latency, model);
    return `[${this.activeProvider}] Processed via remote node. Entropy: ${Math.random().toFixed(4)}`;
  }

  private updateMetrics(tokens: number, latency: number, model: ModelConfig) {
    model.tokensUsed += tokens;
    this.metrics.avgLatency = (this.metrics.avgLatency * 0.9) + (latency * 0.1);
    this.metrics.burnRate += tokens * model.costPerToken;
  }
}

export const neuralManager = new NeuralManager();

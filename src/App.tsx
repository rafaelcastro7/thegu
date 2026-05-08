/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, ShieldAlert, BarChart3, FileText, Database, Loader2, 
  AlertTriangle, CheckCircle2, ChevronRight, Gavel, Info, X, 
  Target, Cpu, Scale, Download, Filter, Copy, Check, Settings, 
  History, Activity, Zap, ExternalLink, RefreshCw, ChevronDown, ChevronUp,
  Trash2, Fingerprint, Files, ArrowRight, Terminal, Monitor, Globe, Landmark, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AgentOffice } from './components/AgentOffice';
import { cn } from './lib/utils';
import { MiniVerse } from './components/MiniVerse';
import { fetchContractsByEntity, groupContractsByProvider, Contract } from './lib/secop';
import { analyzeContractGroup, AnalysisResult, AnalysisConfig } from './lib/analysis';
import { runCollaborativeAudit, AGENT_PERSONAS, performAutonomousTraining } from './lib/agents';
import { CortexDashboard } from './components/CortexDashboard';
import { KnowledgeBase } from './components/KnowledgeBase';
import { TechnicalFindings } from './components/TechnicalFindings';
import { runIntelligenceAudit, learnFromFindings } from './lib/intelligence';
import { translations, Language } from './lib/i18n';
import { getCachedAnalysis, cacheAnalysis } from './lib/firebase';
import { AuditChatMessage, chatAboutFinding, generateAdaptiveAuditQA, SuggestedAuditQA } from './lib/gemini';
import { NOTORIOUS_ENTITIES } from './lib/intelligence';
import { LEGAL_KNOWLEDGE_BASE } from './lib/legalKnowledgeBase';
import { primeAuditExperience } from './lib/localAgents';

interface NeuralMemorySnapshot {
  totalAudits?: number;
  detectedPatterns?: string[];
  systemBiasAdjustment?: number;
}

interface AuditPanelBridge {
  connectedFindings: number;
  highRiskFindings: number;
  totalExposure: number;
  learnedPatterns: number;
  matchedPatterns: number;
  focusProvider: string | null;
  focusRisk: AnalysisResult['risk'] | null;
  focusRiskScore: number | null;
  latestAgent: string | null;
  latestStatus: string | null;
  latestMessage: string | null;
}

interface SourcePreview {
  url: string;
  title: string;
  fetchedAt: string;
  statusCode: number;
  excerpt: string;
  bodyText: string;
}

const NEURAL_MEMORY_KEY = 'gob_ia_neural_memory';

function readStoredNeuralMemory() {
  if (typeof localStorage === 'undefined') return null;

  try {
    const saved = localStorage.getItem(NEURAL_MEMORY_KEY);
    return saved ? JSON.parse(saved) as NeuralMemorySnapshot : null;
  } catch {
    localStorage.removeItem(NEURAL_MEMORY_KEY);
    return null;
  }
}

function getRiskFromScore(score: number): AnalysisResult['risk'] {
  if (score >= 75) return 'Red';
  if (score >= 45) return 'Orange';
  return 'Green';
}

function getMemoryPatterns(memory: NeuralMemorySnapshot | null | undefined) {
  return Array.isArray(memory?.detectedPatterns) ? memory.detectedPatterns.filter(Boolean) : [];
}

function getMatchingMemoryPatterns(result: AnalysisResult, patterns: string[]) {
  return patterns.filter(pattern => {
    const normalizedPattern = pattern.toLowerCase();
    return result.redFlags.some(flag => {
      const normalizedFlag = flag.toLowerCase();
      return normalizedFlag.includes(normalizedPattern) || normalizedPattern.includes(normalizedFlag);
    });
  });
}

function formatCompactCop(value: number) {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

function parseContractValue(value: string) {
  const numeric = Number.parseFloat(String(value || '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeDisplayName(value: string) {
  const normalized = value?.trim().replace(/\s+/g, ' ');
  return normalized || 'ENTIDAD_DESCONOCIDA';
}

function uniqueEntityNames(contracts: Contract[]) {
  return Array.from(new Set(contracts.map(contract => normalizeDisplayName(contract.nombre_entidad))));
}

function uniqueDepartmentNames(contracts: Contract[]) {
  return Array.from(
    new Set(
      contracts
        .map(contract => normalizeDisplayName(contract.departamento))
        .filter(value => value !== 'N/A' && value !== 'ENTIDAD_DESCONOCIDA')
    )
  );
}

function summarizeList(items: string[], limit = 2) {
  const filtered = items.filter(Boolean);
  if (filtered.length <= limit) return filtered.join(' / ');
  return `${filtered.slice(0, limit).join(' / ')} +${filtered.length - limit}`;
}

function formatAuditDate(value: string, lang: Language) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return lang === 'ES' ? 'Sin fecha' : 'No date';

  return date.toLocaleDateString(lang === 'ES' ? 'es-CO' : 'en-CA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getContractSourceUrl(contract: Contract) {
  return contract.url_proceso || `https://www.secop.gov.co/Consultas/busqueda/detalle-del-proceso.aspx?IdProcess=${encodeURIComponent(contract.referencia_proceso || contract.id_contrato)}`;
}

function getContractDisplayId(contract: Contract) {
  return contract.id_adjudicacion || contract.referencia_proceso || contract.id_contrato;
}

function buildSourceEvidenceRows(contract: Contract, lang: Language) {
  return [
    { label: lang === 'ES' ? 'Entidad' : 'Entity', value: contract.nombre_entidad },
    { label: lang === 'ES' ? 'Proveedor' : 'Provider', value: contract.nombre_del_contratista },
    { label: lang === 'ES' ? 'NIT entidad' : 'Entity tax ID', value: contract.nit_entidad || 'N/A' },
    { label: lang === 'ES' ? 'NIT proveedor' : 'Provider tax ID', value: contract.documento_proveedor || 'N/A' },
    { label: lang === 'ES' ? 'Departamento' : 'Department', value: contract.departamento || 'N/A' },
    { label: lang === 'ES' ? 'Ciudad' : 'City', value: contract.ciudad || 'N/A' },
    { label: lang === 'ES' ? 'Modalidad' : 'Modality', value: contract.modalidad_de_contratacion || 'N/A' },
    { label: lang === 'ES' ? 'Estado' : 'Status', value: contract.estado_contrato || 'N/A' },
    { label: lang === 'ES' ? 'Fecha' : 'Date', value: contract.fecha_de_firma || 'N/A' },
    { label: lang === 'ES' ? 'Valor' : 'Amount', value: contract.valor_del_contrato || 'N/A' },
    { label: lang === 'ES' ? 'Proceso' : 'Process', value: contract.referencia_proceso || 'N/A' },
    { label: lang === 'ES' ? 'Adjudicacion' : 'Award', value: contract.id_adjudicacion || 'N/A' },
  ];
}

function buildInstantAuditSummary(result: AnalysisResult, lang: Language) {
  const isEs = lang === 'ES';
  const leadFlag = result.redFlags[0];
  const entityList = summarizeList(uniqueEntityNames(result.contracts), 3) || (isEs ? 'Sin entidad visible' : 'No visible entity');

  if (!isEs) {
    return [
      '# Immediate Audit Summary',
      '',
      '## Executive Snapshot',
      `The case for **${result.providerName}** was prioritized with a risk score of **${result.riskScore.toFixed(1)}/100** after reviewing **${result.contracts.length}** contract(s) worth **${formatCompactCop(result.totalValue)}**.`,
      '',
      '## Why it was prioritized',
      `- Lead signal: ${leadFlag || 'Aggregated contract pattern under review.'}`,
      `- Semantic similarity: ${(result.similarityScore * 100).toFixed(1)}%.`,
      `- Observed time window: ${result.maxDayDiff} day(s).`,
      '',
      '## Coverage',
      `Reviewed entities: ${entityList}.`,
      '',
      '## Next action',
      'Open the evidence dossier, validate the process reference, and contrast the flagged contracts against their SECOP source before escalating.',
    ].join('\n');
  }

  return [
    '# Resumen Inmediato de Auditoría',
    '',
    '## Lectura ejecutiva',
    `El expediente de **${result.providerName}** fue priorizado con un puntaje de riesgo de **${result.riskScore.toFixed(1)}/100** tras revisar **${result.contracts.length}** contrato(s) por **${formatCompactCop(result.totalValue)}**.`,
    '',
    '## Por qué quedó priorizado',
    `- Señal líder: ${leadFlag || 'Patrón agregado del grupo contractual en revisión.'}`,
    `- Similitud semántica observada: ${(result.similarityScore * 100).toFixed(1)}%.`,
    `- Ventana temporal observada: ${result.maxDayDiff} día(s).`,
    '',
    '## Cobertura',
    `Entidades observadas: ${entityList}.`,
    '',
    '## Siguiente paso',
    'Abra el dossier probatorio, valide la referencia del proceso y contraste los contratos señalados con su fuente SECOP antes de escalar el caso.',
  ].join('\n');
}

export default function App() {
  const [lang, setLang] = useState<Language>('ES');
  const t = translations[lang];
  const isEs = lang === 'ES';

  const [entitySearch, setEntitySearch] = useState('CARDIQUE');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<AnalysisResult | null>(null);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [agentLogs, setAgentLogs] = useState<any[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [filterRisk, setFilterRisk] = useState<'All' | 'Red' | 'Orange' | 'Green'>('All');
  const [sortBy, setSortBy] = useState<'value' | 'similarity' | 'recent' | 'risk'>('risk');
  const [copied, setCopied] = useState(false);
  const [systemHealth, setSystemHealth] = useState(98.42);
  const [activeView, setActiveView] = useState<'AUDIT' | 'SYSTEM'>('AUDIT');
  const [systemTab, setSystemTab] = useState<'OVERVIEW' | 'SOURCES' | 'FLOW' | 'KNOWLEDGE'>('OVERVIEW');
  const [neuralMemory, setNeuralMemory] = useState<NeuralMemorySnapshot | null>(() => readStoredNeuralMemory());
  const [statusMessage, setStatusMessage] = useState(isEs ? 'Listo para auditar' : 'Ready to audit');
  const [progress, setProgress] = useState(0);
  const [activeChatFinding, setActiveChatFinding] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [expandedContract, setExpandedContract] = useState<string | null>(null);
  const [showEvidenceDossier, setShowEvidenceDossier] = useState(false);
  const [focusedEvidenceId, setFocusedEvidenceId] = useState<string | null>(null);
  const [suggestedAuditQA, setSuggestedAuditQA] = useState<SuggestedAuditQA[]>([]);
  const [suggestedAuditLoading, setSuggestedAuditLoading] = useState(false);
  const [sourceContract, setSourceContract] = useState<Contract | null>(null);
  const [sourcePreview, setSourcePreview] = useState<SourcePreview | null>(null);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [showEscalationGuide, setShowEscalationGuide] = useState(false);
  const [showFindingsOverview, setShowFindingsOverview] = useState(false);

  const auditPanelBridge = useMemo<AuditPanelBridge>(() => {
    const sortedByRisk = [...results].sort((a, b) => b.riskScore - a.riskScore);
    const focus = selectedResult || sortedByRisk[0] || null;
    const patterns = getMemoryPatterns(neuralMemory);
    const matchedPatterns = results.reduce((total, result) => {
      return total + getMatchingMemoryPatterns(result, patterns).length;
    }, 0);
    const latestLog = agentLogs.length > 0 ? agentLogs[agentLogs.length - 1] : null;

    return {
      connectedFindings: results.length,
      highRiskFindings: results.filter(result => result.risk === 'Red').length,
      totalExposure: results.reduce((total, result) => total + result.totalValue, 0),
      learnedPatterns: patterns.length,
      matchedPatterns,
      focusProvider: focus?.providerName || null,
      focusRisk: focus?.risk || null,
      focusRiskScore: focus?.riskScore ?? null,
      latestAgent: latestLog?.agent || null,
      latestStatus: latestLog?.status || null,
      latestMessage: latestLog?.message || null,
    };
  }, [agentLogs, neuralMemory, results, selectedResult]);
  
  const handleRetroactiveAudit = (memorySnapshot: NeuralMemorySnapshot | null = neuralMemory) => {
    setLoading(true);
    setStatusMessage(lang === 'ES' ? 'Actualizando hallazgos con aprendizaje reciente...' : 'Refreshing findings with recent learning...');
    const memoryPatterns = getMemoryPatterns(memorySnapshot);

    setTimeout(() => {
      setResults(prev => {
        const updated = prev.map(res => {
          const intel = runIntelligenceAudit(res.detailedFindings.map(f => f.contract));
          const matchedMemory = getMatchingMemoryPatterns(res, memoryPatterns);
          const memoryBoost = Math.min(12, matchedMemory.length * 4);
          const riskScore = Math.min(100, res.riskScore + (intel.riskScore * 0.3) + memoryBoost);
          const learningFlags = matchedMemory.length > 0
            ? [lang === 'ES' ? `La revisión histórica confirmó ${matchedMemory.length} patrón(es) recurrente(s)` : `Historical review confirmed ${matchedMemory.length} recurring pattern(s)`]
            : [];

          return {
            ...res,
            riskScore,
            risk: getRiskFromScore(riskScore),
            redFlags: Array.from(new Set([...res.redFlags, ...intel.flags, ...learningFlags]))
          };
        });
        
        localStorage.setItem('GOB_IA_CACHE_V1', JSON.stringify({
          results: updated,
          health: systemHealth,
        }));
        
        return updated;
      });
      setLoading(false);
      setStatusMessage(lang === 'ES' ? 'Hallazgos actualizados' : 'Findings updated');
    }, 1500);
  };


  const [config, setConfig] = useState<AnalysisConfig>({
    similarityThreshold: 0.85,
    dayWindow: 90,
    valueThreshold: 50000000
  });

  useEffect(() => {
    // Persistence: Hydrate results from localStorage on mount
    const saved = localStorage.getItem('GOB_IA_CACHE_V1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.results && Array.isArray(parsed.results)) {
          setResults(parsed.results);
          setSystemHealth(parsed.health || 98.42);
        }
      } catch (e) {
        console.warn("Cache corruption detected. Clearing...");
        localStorage.removeItem('GOB_IA_CACHE_V1');
      }
    }

    const bootstrapDiscovery = async () => {
      // Check if we already have data to avoid re-searching
      const existing = localStorage.getItem('GOB_IA_CACHE_V1');
      if (existing) return;

      // Prioritize the top 10 most historically opaque entities
      const topEntities = NOTORIOUS_ENTITIES.slice(0, 10);
      
      setLoading(true);
      setStatusMessage(lang === 'ES' ? 'Iniciando revisión automática...' : 'Starting automated review...');
      
      const registry = new Set<string>();
      
      for (let i = 0; i < topEntities.length; i++) {
        const entity = topEntities[i];
        setProgress(Math.round((i / topEntities.length) * 100));

        if (i > 0) await new Promise(r => setTimeout(r, 1200));

        if (registry.has(entity)) continue;
        registry.add(entity);

        try {
          const phaseMessage = lang === 'ES' 
            ? `[Fase ${i+1}/${topEntities.length}] Escrutinio Forense: ${entity}...`
            : `[Phase ${i+1}/${topEntities.length}] Forensic Scrutiny: ${entity}...`;
            
          setStatusMessage(phaseMessage);
          
          // Download 50 contracts to find enough "troublesome" patterns
          const contracts = await fetchContractsByEntity(entity, 50);
          const groups = groupContractsByProvider(contracts);
          
          const analyzed: AnalysisResult[] = [];
          for (const [key, list] of groups) {
            // Filter: Ignore irrelevant noise (single low-value contracts)
            const totalVal = list.reduce((sum, c) => sum + (parseFloat(c.valor_del_contrato) || 0), 0);
            if (list.length < 2 && totalVal < config.valueThreshold) continue;

             const subMessage = lang === 'ES' 
              ? `Escrutinio: ${list[0].nombre_del_contratista || 'Anónimo'}`
              : `Scrutiny: ${list[0].nombre_del_contratista || 'Anonymous'}`;
            setStatusMessage(subMessage);
            
            let res = await getCachedAnalysis(key);
            if (!res) {
              res = await analyzeContractGroup(key, list, config);
              await cacheAnalysis(res);
            }
            
            // "Quiero que todos los que tengamos sean con problemas"
            // Filter: Only keep high-risk findings (Red/Orange)
            if (res.risk !== 'Green' || res.riskScore > 40) {
              analyzed.push({ ...res, loadType: 'FULL' } as AnalysisResult);
            }
            
            await new Promise(r => setTimeout(r, 200));
          }

          setResults(prev => {
            const nextResults = [...prev, ...analyzed];
            const uniqueMap = new Map(nextResults.map(r => [r.groupKey, r]));
            const sortedResults = Array.from(uniqueMap.values()).sort((a, b) => b.riskScore - a.riskScore);
            
            localStorage.setItem('GOB_IA_CACHE_V1', JSON.stringify({
              results: sortedResults,
              health: systemHealth,
              timestamp: Date.now()
            }));

            return sortedResults;
          });
        } catch (e) {
          console.warn(`Entity ${entity} scan interrupted.`);
        }
      }
      setProgress(100);
      setLoading(false);
      setStatusMessage(lang === 'ES' ? 'Monitoreo inicial completado' : 'Initial monitoring completed');
    };

    bootstrapDiscovery();
  }, []);

  useEffect(() => {
    const anchor = document.getElementById('chat-bottom');
    if (anchor) {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [chatLoading, chatMessages, suggestedAuditQA]);

  const filteredResults = useMemo(() => {
    let list = [...results];
    if (filterRisk !== 'All') {
      list = list.filter(r => r.risk === filterRisk);
    }
    list.sort((a, b) => {
      if (sortBy === 'risk') return b.riskScore - a.riskScore;
      if (sortBy === 'value') return b.totalValue - a.totalValue;
      if (sortBy === 'similarity') return b.similarityScore - a.similarityScore;
      return b.maxDayDiff - a.maxDayDiff;
    });
    return list;
  }, [results, filterRisk, sortBy]);

  const auditedEntities = useMemo(() => {
    const entityMap = new Map<string, {
      name: string;
      contracts: number;
      exposure: number;
      redFindings: number;
      providers: Set<string>;
      departments: Set<string>;
      lastDate: string | null;
    }>();

    results.forEach(result => {
      const touchedEntities = new Set<string>();

      result.contracts.forEach(contract => {
        const entityName = normalizeDisplayName(contract.nombre_entidad);
        const current = entityMap.get(entityName) || {
          name: entityName,
          contracts: 0,
          exposure: 0,
          redFindings: 0,
          providers: new Set<string>(),
          departments: new Set<string>(),
          lastDate: null,
        };

        current.contracts += 1;
        current.exposure += parseContractValue(contract.valor_del_contrato);
        current.providers.add(result.providerName);

        if (contract.departamento && contract.departamento !== 'N/A') {
          current.departments.add(contract.departamento);
        }

        if (!current.lastDate || new Date(contract.fecha_de_firma).getTime() > new Date(current.lastDate).getTime()) {
          current.lastDate = contract.fecha_de_firma;
        }

        entityMap.set(entityName, current);
        touchedEntities.add(entityName);
      });

      if (result.risk === 'Red') {
        touchedEntities.forEach(entityName => {
          const current = entityMap.get(entityName);
          if (current) current.redFindings += 1;
        });
      }
    });

    return Array.from(entityMap.values())
      .map(entity => ({
        name: entity.name,
        contracts: entity.contracts,
        exposure: entity.exposure,
        redFindings: entity.redFindings,
        providerCount: entity.providers.size,
        departments: Array.from(entity.departments),
        lastDate: entity.lastDate,
      }))
      .sort((a, b) => {
        if (b.redFindings !== a.redFindings) return b.redFindings - a.redFindings;
        if (b.exposure !== a.exposure) return b.exposure - a.exposure;
        return b.contracts - a.contracts;
      });
  }, [results]);

  const auditCoverage = useMemo(() => {
    const totalContracts = results.reduce((sum, result) => sum + result.contracts.length, 0);
    const providerCount = new Set(results.map(result => result.providerName)).size;
    const departments = new Set(auditedEntities.flatMap(entity => entity.departments));

    return {
      totalContracts,
      providerCount,
      entityCount: auditedEntities.length,
      departmentCount: departments.size,
    };
  }, [auditedEntities, results]);

  async function handleSearch(targetSearch?: string) {
    const searchVal = targetSearch || entitySearch;
    if (!searchVal) return;
    
    setLoading(true);
    setStatusMessage(lang === 'ES' ? 'Preparando consulta...' : 'Preparing query...');
    setResults([]);
    setAiReport(null);
    setSelectedResult(null);

    try {
      setStatusMessage(lang === 'ES' ? 'Consultando SECOP II...' : 'Querying SECOP II...');
      const contracts = await fetchContractsByEntity(searchVal, 10);
      
      if (contracts.length === 0) {
        setStatusMessage(lang === 'ES' ? "No se encontraron registros" : "No records found");
        setLoading(false);
        return;
      }

      setStatusMessage(lang === 'ES' ? `${contracts.length} contratos cargados para análisis` : `${contracts.length} contracts loaded for analysis`);
      const groups = groupContractsByProvider(contracts);
      
      const analyzed: AnalysisResult[] = [];
      for (const [key, list] of groups) {
        const subMessage = lang === 'ES' 
          ? `Sincronizando: ${list[0].nombre_del_contratista || 'Nodo'}`
          : `Syncing: ${list[0].nombre_del_contratista || 'Node'}`;
        setStatusMessage(subMessage);
        
        // Cloud Cache Check
        let res = await getCachedAnalysis(key);
        if (!res) {
          res = await analyzeContractGroup(key, list, config);
          await cacheAnalysis(res);
        }
        analyzed.push(res);
        await new Promise(r => setTimeout(r, 800));
      }
      
      setResults(analyzed);
      setStatusMessage(lang === 'ES' ? 'Consulta completada' : 'Query completed');
    } catch (error) {
      console.error(error);
      setStatusMessage(lang === 'ES' ? 'No fue posible completar la consulta' : 'The query could not be completed');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateReport(result: AnalysisResult) {
    setSelectedResult(result);
    setReportLoading(false);
    setAiReport(buildInstantAuditSummary(result, lang));
    setAgentLogs([]);
    setStatusMessage(lang === 'ES' ? 'Abriendo expediente y refinando síntesis...' : 'Opening the case and refining the report...');

    void (async () => {
      try {
        const { report, logs, memory } = await runCollaborativeAudit(result, lang, (updatedLogs, updatedMemory) => {
          setAgentLogs(updatedLogs);
          setNeuralMemory(updatedMemory);
        });
        setAiReport(report);
        setAgentLogs(logs);
        setNeuralMemory(memory);
        void primeAuditExperience({
          result,
          lang,
          onLog: (entry) => setAgentLogs((prev) => [...prev, entry].slice(-60)),
        });
        setStatusMessage(lang === 'ES' ? 'Expediente actualizado con síntesis profunda' : 'Case file updated with deep synthesis');
      } catch (error) {
        console.error(error);
        setStatusMessage(lang === 'ES' ? 'Se mantiene el resumen inmediato por contingencia del motor local' : 'The immediate summary is being kept while the local engine recovers');
      }
    })();
  }

  async function openInteractiveAudit(finding: any) {
    if (!selectedResult) return;
    setActiveChatFinding(finding);
    setChatMessages([]);
    setSuggestedAuditQA([]);
    setSuggestedAuditLoading(true);

    try {
      void primeAuditExperience({
        result: selectedResult,
        lang,
        onLog: (entry) => setAgentLogs((prev) => [...prev, entry].slice(-60)),
      });
      const suggestions = await generateAdaptiveAuditQA(selectedResult, finding, [], lang);
      setSuggestedAuditQA(suggestions);
    } catch (error) {
      console.error(error);
      setSuggestedAuditQA([]);
    } finally {
      setSuggestedAuditLoading(false);
    }
  }

  function applySuggestedAuditQA(item: SuggestedAuditQA) {
    const nextMessages: AuditChatMessage[] = [
      { role: 'user', content: item.question },
      { role: 'ai', content: item.answer },
    ];

    setChatMessages(nextMessages);
    if (selectedResult && activeChatFinding) {
      setSuggestedAuditLoading(true);
      generateAdaptiveAuditQA(selectedResult, activeChatFinding, nextMessages, lang)
        .then(setSuggestedAuditQA)
        .catch((error) => {
          console.error(error);
          setSuggestedAuditQA([]);
        })
        .finally(() => setSuggestedAuditLoading(false));
    }
  }

  async function handleSendMessage(text: string) {
    if (!activeChatFinding || !selectedResult || !text.trim()) return;
    const suggestionMatch = suggestedAuditQA.find(item => item.question.trim().toLowerCase() === text.trim().toLowerCase());
    if (suggestionMatch) {
      applySuggestedAuditQA(suggestionMatch);
      return;
    }

    const userMsg = { role: 'user' as const, content: text };
    const historyBefore = [...chatMessages];
    setChatMessages(prev => [...prev, userMsg]);
    setChatLoading(true);
    try {
      const response = await chatAboutFinding(selectedResult, activeChatFinding, text, lang);
      const nextMessages = [...historyBefore, userMsg, { role: 'ai' as const, content: response }];
      setChatMessages(nextMessages);
      setSuggestedAuditLoading(true);
      try {
        const nextSuggestions = await generateAdaptiveAuditQA(selectedResult, activeChatFinding, nextMessages, lang);
        setSuggestedAuditQA(nextSuggestions);
      } catch (error) {
        console.error(error);
      } finally {
        setSuggestedAuditLoading(false);
      }
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'ai' as const, content: lang === 'ES' ? 'Error al procesar consulta.' : 'Query error.' }]);
    } finally {
      setChatLoading(false);
    }
  }

  async function handleOpenSource(contract: Contract) {
    setSourceContract(contract);
    setSourcePreview(null);
    setSourceError(null);
    setSourceLoading(true);

    try {
      const params = new URLSearchParams();
      if (contract.url_proceso) params.set('url', contract.url_proceso);
      if (contract.referencia_proceso || contract.id_contrato) {
        params.set('processId', contract.referencia_proceso || contract.id_contrato);
      }

      const response = await fetch(`/api/secop/source?${params.toString()}`);
      if (!response.ok) {
        throw new Error(lang === 'ES' ? 'No fue posible recuperar la fuente SECOP.' : 'The SECOP source could not be loaded.');
      }

      const payload = await response.json() as SourcePreview;
      setSourcePreview(payload);
    } catch (error) {
      console.error(error);
      setSourceError(lang === 'ES' ? 'No fue posible recuperar la fuente SECOP en este momento.' : 'The SECOP source could not be loaded right now.');
    } finally {
      setSourceLoading(false);
    }
  }

  function closeSourcePreview() {
    setSourceContract(null);
    setSourcePreview(null);
    setSourceError(null);
    setSourceLoading(false);
  }

  const handleTrain = async (entity: string) => {
    const { logs, memory } = await performAutonomousTraining(entity);
    setAgentLogs(prev => [...prev, ...logs].slice(-50));
    setNeuralMemory(memory);
    setStatusMessage(lang === 'ES' ? `Aprendizaje actualizado con ${entity}` : `Learning updated with ${entity}`);
    return memory;
  };

  const handleSelfLearning = async () => {
    const learnedRule = learnFromFindings(results);
    if (!learnedRule) {
      setStatusMessage(lang === 'ES' ? 'No se detectaron nuevos patrones recurrentes' : 'No new recurring patterns were detected');
      return null;
    }

    setNeuralMemory(prev => {
      const next = {
        totalAudits: prev?.totalAudits || 0,
        systemBiasAdjustment: Math.min((prev?.systemBiasAdjustment || 0) + 0.01, 1),
        detectedPatterns: Array.from(new Set([...(prev?.detectedPatterns || []), ...(learnedRule.memoryPatterns || [learnedRule.name])])),
      };
      localStorage.setItem(NEURAL_MEMORY_KEY, JSON.stringify(next));
      return next;
    });

    setAgentLogs(prev => [
      ...prev,
      {
        agent: 'SYSTEM',
        status: 'COMPLETED',
        timestamp: new Date().toISOString(),
        message: lang === 'ES'
          ? `Nuevo patrón incorporado: ${learnedRule.name}`
          : `New pattern incorporated: ${learnedRule.name}`,
      }
    ].slice(-50));

    setStatusMessage(lang === 'ES' ? 'Nuevo patrón incorporado al sistema' : 'A new pattern was incorporated into the system');
    return learnedRule;
  };

  const handleCopyReport = () => {
    if (!aiReport) return;
    navigator.clipboard.writeText(aiReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadElementAsPdf = async (elementId: string, fileName: string) => {
    setLoading(true);
    setStatusMessage(lang === 'ES' ? 'Preparando documento PDF...' : 'Preparing PDF document...');
    
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);

      const element = document.getElementById(elementId);
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(fileName);
    } catch (error) {
      console.error('PDF Generation Error:', error);
    } finally {
      setLoading(false);
      setStatusMessage(lang === 'ES' ? 'Documento listo' : 'Document ready');
    }
  };

  const handleDownloadPDF = async () => {
    if (!aiReport || !selectedResult) return;
    await downloadElementAsPdf(
      'report-paper',
      `AUDITORIA_FORENSE_${selectedResult.providerName.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`
    );
  };

  const handleExportCSV = () => {
    setShowFindingsOverview(true);
    return;

    if (results.length === 0) return;
    const headers = ["Proveedor", "NIT", "Riesgo", "Valor Total", "Similitud %", "Contratos", "Ventana Días"];
    const rows = results.map(r => [
      r.providerName,
      r.groupKey.split('-')[1],
      r.risk,
      r.totalValue,
      (r.similarityScore * 100).toFixed(2),
      r.contracts.length,
      r.maxDayDiff
    ]);
    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit_payload_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const heroEntityRows = auditedEntities.slice(0, 6);
  const monitoredEntities = auditedEntities.length > 0
    ? auditedEntities.map(entity => entity.name).slice(0, 6)
    : NOTORIOUS_ENTITIES.slice(0, 6);

  const openSourceRegistry = [
    {
      icon: Globe,
      title: isEs ? 'Cobertura nacional SECOP II' : 'National SECOP II coverage',
      description: isEs
        ? 'El motor se apoya en datos públicos de alta relevancia para mapear entidades, proveedores, modalidades, fechas, NIT y cuantías en tiempo casi real.'
        : 'The engine relies on high-value public data to map entities, providers, procurement modes, dates, tax IDs, and amounts in near real time.',
      tags: isEs
        ? ['Entidad contratante', 'Proveedor', 'NIT', 'Fecha', 'Objeto contractual', 'Precio base']
        : ['Contracting entity', 'Provider', 'Tax ID', 'Date', 'Contract object', 'Base amount'],
    },
    {
      icon: BookOpen,
      title: isEs ? 'Fundamento jurídico vivo' : 'Living legal foundation',
      description: isEs
        ? `Una capa jurídica indexada con ${LEGAL_KNOWLEDGE_BASE.length} referencias convierte cada alerta en una explicación defendible y útil para control fiscal.`
        : `An indexed legal layer with ${LEGAL_KNOWLEDGE_BASE.length} references turns each alert into a defensible explanation for oversight work.`,
      tags: isEs
        ? ['Ley 80/1993', 'Decreto 1082/2015', 'Ley 1474/2011', 'Ley 2195/2022', 'CCE', 'OCDE']
        : ['Law 80/1993', 'Decree 1082/2015', 'Law 1474/2011', 'Law 2195/2022', 'CCE', 'OECD'],
    },
    {
      icon: Database,
      title: isEs ? 'Memoria operativa persistente' : 'Persistent operating memory',
      description: isEs
        ? 'La persistencia de análisis y reportes acelera nuevas revisiones, conserva consistencia y prepara el camino para monitoreo continuo.'
        : 'Persisted analyses and reports accelerate new reviews, preserve consistency, and prepare the path for continuous monitoring.',
      tags: isEs
        ? ['Cache de análisis', 'Cache de reportes', 'RAG persistente', 'PostgreSQL']
        : ['Analysis cache', 'Report cache', 'Persistent RAG', 'PostgreSQL'],
    },
  ];

  const systemFlow = [
    {
      icon: Database,
      title: isEs ? '1. Ingesta abierta' : '1. Open ingestion',
      text: isEs
        ? 'El usuario busca una entidad y el sistema descarga contratos recientes o lotes priorizados desde SECOP II.'
        : 'The user searches an entity and the system downloads recent contracts or prioritized batches from SECOP II.',
    },
    {
      icon: Files,
      title: isEs ? '2. Agrupación por proveedor' : '2. Grouping by provider',
      text: isEs
        ? 'Los procesos se consolidan por proveedor/NIT para observar fraccionamiento, repetición y concentración económica.'
        : 'Processes are consolidated by provider/tax ID to expose split contracting, repetition, and economic concentration.',
    },
    {
      icon: Cpu,
      title: isEs ? '3. Inferencia semántica y estadística' : '3. Semantic and statistical inference',
      text: isEs
        ? 'Embeddings locales, reglas forenses y ventanas temporales convierten el lote en un puntaje de riesgo auditable.'
        : 'Local embeddings, forensic rules, and temporal windows convert each batch into an auditable risk score.',
    },
    {
      icon: Gavel,
      title: isEs ? '4. Explicación jurídica y reporte' : '4. Legal explanation and report',
      text: isEs
        ? 'El hallazgo queda acompañado por contexto normativo, evidencia puntual y un informe narrado para el auditor.'
        : 'Each finding is accompanied by regulatory context, pinpoint evidence, and a narrated report for the auditor.',
    },
  ];

  const riskSignals = [
    {
      title: isEs ? 'Identidad semántica' : 'Semantic identity',
      text: isEs
        ? 'Detecta contratos con objetos casi iguales aunque estén redactados distinto.'
        : 'Detects contracts with nearly identical purposes even when written differently.',
    },
    {
      title: isEs ? 'Aglomeración temporal' : 'Temporal clustering',
      text: isEs
        ? 'Señala proveedores con múltiples firmas concentradas en días o semanas.'
        : 'Flags providers with multiple signatures concentrated in days or weeks.',
    },
    {
      title: isEs ? 'Bunching de cuantías' : 'Amount bunching',
      text: isEs
        ? 'Busca montos casi idénticos justo por debajo de umbrales competitivos.'
        : 'Looks for nearly identical amounts just below competitive thresholds.',
    },
    {
      title: isEs ? 'Modalidades no competitivas' : 'Non-competitive modes',
      text: isEs
        ? 'Mide abuso de contratación directa, mínima cuantía y otras modalidades de baja competencia.'
        : 'Measures overuse of direct contracting, low-value procedures, and other low-competition modalities.',
    },
  ];

  const systemFacts = [
    isEs ? 'Arquitectura pensada para crecer desde pilotos hasta operación institucional.' : 'Architecture designed to grow from pilots into institutional operations.',
    isEs ? 'Backend con integración a SECOP II, persistencia y contexto jurídico reutilizable.' : 'Backend with SECOP II integration, persistence, and reusable legal context.',
    isEs ? 'IA local para scoring, explicación y generación de reportes con mayor control operativo.' : 'Local AI for scoring, explanations, and report generation with stronger operational control.',
    isEs ? 'Salidas listas para priorización ejecutiva, trabajo de auditoría y presentación institucional.' : 'Outputs ready for executive prioritization, audit work, and institutional presentation.',
  ];

  return (
    <div className="min-h-screen bg-[#F2F2F2] text-[#333333] font-sans flex flex-col antialiased">
      {/* Official Gov Header Rail */}
      <header className="gov-header h-12 flex items-center justify-between px-8 z-[100] shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-[#FCD059]" />
            <div className="w-1 h-6 bg-[#004884]" />
            <div className="w-1 h-6 bg-[#D12C26]" />
            <span className="text-[11px] font-black tracking-widest ml-2">GOBIA</span>
          </div>
          <div className="h-4 w-px bg-white/20" />
          <h1 className="text-[10px] font-bold tracking-widest text-white/90 uppercase">
            GOBIA AUDITOR | ANALITICA DE CONTRATACION PUBLICA
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setLang(lang === 'ES' ? 'EN' : 'ES')}
            className="text-[10px] font-black border border-white/20 px-3 py-1 hover:bg-white/10 transition-colors"
          >
            {lang}
          </button>
        </div>
      </header>

      {/* Institutional Nav */}
      <nav className="gov-navbar sticky top-0 z-[90] h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#004884] flex items-center justify-center">
              <ShieldAlert className="text-white" size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-[#004884] leading-none mb-1">AUDITORÍA GUBERNAMENTAL</p>
              <p className="text-[14px] font-black text-[#333333] leading-none tracking-tight">PLATAFORMA ANTIFRAUDE</p>
            </div>
          </div>

          <div className="h-8 w-px bg-[#E6E6E6] mx-4" />

          <div className="flex items-center gap-2">
            {[
              { id: 'AUDIT', icon: Target, label: isEs ? 'PANEL DE AUDITORIA' : 'AUDIT PANEL' },
              { id: 'SYSTEM', icon: BookOpen, label: isEs ? 'SISTEMA' : 'SYSTEM' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as any)}
                className={cn(
                  "px-4 py-2 text-[11px] font-bold uppercase transition-all flex items-center gap-2 border-b-2",
                  activeView === item.id 
                    ? "border-[#004884] text-[#004884] bg-[#f0f7ff]" 
                    : "border-transparent text-[#666666] hover:text-[#004884] hover:bg-gray-50"
                )}
              >
                <item.icon size={14} />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex flex-col items-end mr-4">
              <p className="header-label !mb-0">{t.header.status}</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <p className="text-[10px] font-bold text-emerald-600 uppercase tabular-nums">{statusMessage}</p>
              </div>
           </div>
           <button 
             data-testid="advanced-console-button"
             onClick={() => setShowSettings(true)}
             title={lang === 'ES' ? 'Configuracion avanzada' : 'Advanced configuration'}
             className="w-10 h-10 flex items-center justify-center text-[#666666] hover:text-[#004884] hover:bg-gray-100 transition-all border border-[#E6E6E6]"
           >
             <Settings size={18} />
           </button>
        </div>
      </nav>

      {/* Search & Hero Context */}
      <div className="bg-white border-b border-[#E6E6E6] py-12">
        <div className="max-w-6xl mx-auto px-8 space-y-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="flex-1 space-y-4">
              <h2 className="text-4xl font-black text-[#004884] tracking-tighter leading-tight uppercase">
                {t.dashboard.title}
              </h2>
              <p className="text-lg text-gray-500 font-medium max-w-xl">
                {t.dashboard.subtitle}
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <button onClick={() => { setActiveView('SYSTEM'); setSystemTab('OVERVIEW'); }} className="gov-button-outline flex items-center gap-2">
                  <FileText size={14} /> {isEs ? 'Ver capa informativa' : 'Open information layer'}
                </button>
                <button onClick={() => { setActiveView('SYSTEM'); setSystemTab('KNOWLEDGE'); }} className="gov-button-outline flex items-center gap-2">
                  <BookOpen size={14} /> {isEs ? 'Ver reglas y fundamentos' : 'Open rules and foundations'}
                </button>
              </div>
            </div>
            
            <div className="w-full md:w-96 space-y-4">
              <div className="relative group">
                <input 
                  data-testid="search-input"
                  type="text"
                  value={entitySearch}
                  onChange={(e) => setEntitySearch(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={t.header.search_placeholder}
                  className="w-full h-14 bg-gray-50 border-2 border-[#E6E6E6] px-6 text-sm font-bold focus:border-[#004884] outline-none transition-all pr-14"
                />
                <button 
                  onClick={() => handleSearch()}
                  disabled={loading}
                  className="absolute right-2 top-2 w-10 h-10 bg-[#004884] text-white flex items-center justify-center hover:bg-[#003663] transition-colors"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                </button>
              </div>
              <div className="flex justify-between items-center px-1">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                  <Globe size={10} /> {isEs ? 'FUENTE ABIERTA: SECOP II / DATOS.GOV.CO' : 'OPEN SOURCE: SECOP II / DATOS.GOV.CO'}
                </p>
                {loading && (
                  <p className="text-[10px] text-emerald-600 font-bold tabular-nums animate-pulse">
                    {isEs ? `PROCESANDO ANALISIS: ${progress}%` : `PROCESSING ANALYSIS: ${progress}%`}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr_1fr] gap-6">
            <div className="gov-card p-6 border-l-4 border-l-[#004884] space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="header-label !mb-0">{isEs ? 'Entidades bajo auditoría' : 'Entities under audit'}</p>
                  <h3 className="text-2xl font-black text-[#333333] uppercase tracking-tight">
                    {isEs ? 'Lo que el sistema está revisando ahora' : 'What the system is auditing now'}
                  </h3>
                </div>
                <div className="px-3 py-2 bg-[#f0f7ff] text-[#004884] text-[10px] font-black uppercase tracking-widest border border-[#d9eaf9]">
                  {auditCoverage.entityCount || monitoredEntities.length} {isEs ? 'entidades' : 'entities'}
                </div>
              </div>

              {heroEntityRows.length > 0 ? (
                <div className="space-y-3">
                        {heroEntityRows.map(entity => (
                          <div key={entity.name} className="flex items-center justify-between gap-4 border border-[#E6E6E6] bg-gray-50 px-4 py-3">
                            <div className="min-w-0">
                              <p className="text-sm font-black text-[#333333] uppercase truncate">{entity.name}</p>
                              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                          {entity.providerCount} {isEs ? 'proveedores' : 'providers'} / {entity.contracts} {isEs ? 'contratos' : 'contracts'}
                              </p>
                              <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                                {isEs ? 'Última fecha' : 'Latest date'}: {entity.lastDate ? formatAuditDate(entity.lastDate, lang) : (isEs ? 'Sin fecha' : 'No date')}
                              </p>
                            </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-black text-[#004884] uppercase tracking-widest">{formatCompactCop(entity.exposure)}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">
                          {entity.redFindings} {isEs ? 'alertas rojas' : 'red alerts'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {isEs
                      ? 'La plataforma arranca priorizando entidades con historial de opacidad para poblar el tablero preventivo.'
                      : 'The platform starts by prioritizing historically opaque entities to populate the preventive dashboard.'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {monitoredEntities.map(entity => (
                      <span key={entity} className="px-3 py-2 bg-gray-50 border border-[#E6E6E6] text-[10px] font-black uppercase tracking-widest text-[#333333]">
                        {entity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="gov-card p-6 border-l-4 border-l-[#FCD059] space-y-4">
              <p className="header-label !mb-0">{isEs ? 'Base de confianza' : 'Trust foundation'}</p>
              <h3 className="text-2xl font-black text-[#333333] uppercase tracking-tight">
                {isEs ? 'Respaldo que sostiene la plataforma' : 'What underpins the platform'}
              </h3>
              <div className="space-y-4">
                {openSourceRegistry.map(source => (
                  <div key={source.title} className="border border-[#E6E6E6] p-4 bg-white space-y-3">
                    <div className="flex items-center gap-3">
                      <source.icon size={16} className="text-[#004884]" />
                      <p className="text-sm font-black text-[#333333] uppercase">{source.title}</p>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">{source.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {source.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-gray-50 border border-gray-100 text-[9px] font-bold uppercase tracking-wider text-gray-500">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="gov-card p-6 border-l-4 border-l-[#D12C26] space-y-5">
              <p className="header-label !mb-0">{isEs ? 'Tesis de valor' : 'Value thesis'}</p>
              <h3 className="text-2xl font-black text-[#333333] uppercase tracking-tight">
                {isEs ? 'Por qué esta propuesta escala' : 'Why this proposal scales'}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: isEs ? 'Contratos auditados' : 'Contracts audited', value: auditCoverage.totalContracts },
                  { label: isEs ? 'Proveedores en hallazgos' : 'Providers in findings', value: auditCoverage.providerCount },
                  { label: isEs ? 'Entidades cubiertas' : 'Entities covered', value: auditCoverage.entityCount || monitoredEntities.length },
                  { label: isEs ? 'Departamentos' : 'Departments', value: auditCoverage.departmentCount || '--' },
                ].map(metric => (
                  <div key={metric.label} className="border border-[#E6E6E6] bg-gray-50 p-4">
                    <p className="header-label !text-gray-400">{metric.label}</p>
                    <p className="text-2xl font-black text-[#004884]">{metric.value}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {systemFacts.map(fact => (
                  <p key={fact} className="text-sm text-gray-600 leading-relaxed">
                    <span className="font-black text-[#004884]">-</span> {fact}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-12">
        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            {activeView === 'AUDIT' && (
              <motion.section 
                key="dashboard"
                initial={{ opacity: 0, scale: 0.995 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-12 pb-40"
              >
                {/* Executive Summary stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      { [
                        { label: t.dashboard.exposure, val: `$${(results.reduce((a,b) => a + b.totalValue, 0) / 1e9).toFixed(2)}B`, color: 'text-[#004884]', help: t.help.exposure },
                        { label: t.dashboard.clusters, val: results.length, color: 'text-[#333333]' },
                        { label: t.dashboard.variance, val: results.filter(r => r.risk === 'Red').length, color: 'text-red-600', help: t.help.risk_score },
                        { label: t.dashboard.purity, val: `${systemHealth}%`, color: 'text-emerald-600' },
                      ].map((stat, i) => (
                        <div key={i} className="stat-card relative group">
                           <div className="flex items-center gap-2 mb-2">
                            <p className="header-label leading-none">{stat.label}</p>
                            {stat.help && (
                              <div className="relative group/tooltip">
                                <Info size={12} className="text-gray-300 hover:text-[#004884] transition-colors" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-[#333333] text-[10px] text-white opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-[100] shadow-xl">
                                  {stat.help}
                                </div>
                              </div>
                            )}
                           </div>
                           <p className={cn("text-3xl font-black tabular-nums tracking-tighter", stat.color)}>{stat.val}</p>
                        </div>
                      ))}
                </div>

                <NeuralCenter
                  t={t.agents}
                  lang={lang}
                  memory={neuralMemory}
                  logs={agentLogs}
                  panelState={auditPanelBridge}
                  onTrain={handleTrain}
                  onSyncDashboard={handleRetroactiveAudit}
                />

                <AuditCommandCenter
                  lang={lang}
                  results={filteredResults}
                  onOpenCase={handleGenerateReport}
                />

                {/* Main Results Table-like View */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-[#E6E6E6] pb-4">
                    <h3 className="section-title text-lg flex items-center gap-3">
                      <BarChart3 size={20} /> {t.dashboard.pattern_discovery}
                    </h3>
                    <div className="flex items-center gap-4">
                      {results.length > 0 && (
                        <>
                          <button onClick={handleExportCSV} className="gov-button flex items-center gap-2">
                            <Download size={14} /> {t.dashboard.export}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {loading ? (
                    <div className="py-40 flex flex-col items-center justify-center bg-white border border-[#E6E6E6] scan-effect">
                       <RefreshCw className="animate-spin text-[#004884] mb-6" size={48} />
                       <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#004884] animate-pulse">{t.dashboard.syncing}</p>
                    </div>
                  ) : filteredResults.length > 0 ? (
                    <div className="space-y-4">
                      {filteredResults.map((r) => (
                        <button 
                          type="button"
                          data-testid="result-card"
                          key={r.groupKey} 
                          onClick={() => handleGenerateReport(r)}
                          className="gov-card w-full p-6 flex flex-col md:flex-row md:items-center justify-between gap-8 border-l-8 cursor-pointer relative text-left"
                          style={{ borderLeftColor: r.risk === 'Red' ? '#D12C26' : r.risk === 'Orange' ? '#FCD059' : '#004884' }}
                        >
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-4">
                                <h4 className="text-xl font-black text-[#333333] uppercase leading-none">{r.providerName}</h4>
                                {r.risk === 'Red' && (
                                  <span className="text-[9px] font-black bg-red-600 text-white px-2 py-1 uppercase">
                                    ALERTA CRÍTICA
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-gray-400 font-mono text-[10px] uppercase">
                                 <p className="flex items-center gap-1 text-[#004884] font-bold"><Fingerprint size={10} /> {r.redFlags[0] || 'Patrón Nominal'}</p>
                                 <p className="flex items-center gap-1"><Database size={10} /> NIT: {r.groupKey.split('-')[1]}</p>
                              </div>
                              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                {isEs ? 'Entidades auditadas' : 'Audited entities'}: {summarizeList(uniqueEntityNames(r.contracts), 2)}
                              </p>
                              <div className="flex flex-wrap gap-2 pt-1">
                                <span className="px-2 py-1 bg-gray-50 border border-gray-100 text-[10px] font-bold uppercase text-gray-500">
                                  {isEs ? 'Cobertura' : 'Coverage'}: {uniqueDepartmentNames(r.contracts).length > 0 ? summarizeList(uniqueDepartmentNames(r.contracts), 2) : (isEs ? 'Nacional' : 'National')}
                                </span>
                                <span className="px-2 py-1 bg-gray-50 border border-gray-100 text-[10px] font-bold uppercase text-gray-500">
                                  {isEs ? 'Ventana temporal' : 'Time window'}: {r.maxDayDiff} {isEs ? 'días' : 'days'}
                                </span>
                                <span className="px-2 py-1 bg-gray-50 border border-gray-100 text-[10px] font-bold uppercase text-gray-500">
                                  {isEs ? 'Carga' : 'Load'}: {r.loadType || 'REFERENCE'}
                                </span>
                              </div>
                            </div>

                             <div className="flex items-center gap-10">
                                <div className="text-right w-24">
                                   <p className="header-label">Riesgo IA</p>
                                   <p className={cn(
                                     "text-2xl font-black tabular-nums tracking-tighter",
                                     r.risk === 'Red' ? "text-red-600" : r.risk === 'Orange' ? "text-orange-500" : "text-[#004884]"
                                   )}>
                                     {r.riskScore.toFixed(0)}%
                                   </p>
                                </div>
                                <div className="text-right">
                                   <p className="header-label">Monto Total</p>
                                   <p className="text-xl font-black text-[#333333] tabular-nums">${(r.totalValue / 1e6).toFixed(1)}M</p>
                                </div>
                                <div className="text-right w-24">
                                   <p className="header-label">Contratos</p>
                                   <p className="text-xl font-black text-[#333333] tabular-nums">{r.contracts.length}</p>
                                </div>
                                <div className="w-10 h-10 flex items-center justify-center bg-gray-50 border border-gray-100 rounded-full group-hover:bg-[#004884] group-hover:text-white transition-all">
                                  <ChevronRight size={20} className="text-gray-300" />
                                </div>
                             </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="py-40 flex flex-col items-center justify-center bg-white border border-[#E6E6E6]">
                       <div className="w-20 h-20 bg-gray-50 flex items-center justify-center rounded-full mb-6">
                         <Target className="text-gray-200" size={40} />
                       </div>
                       <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-gray-400">{t.dashboard.empty}</p>
                       <p className="text-sm text-gray-300 mt-2">Realice una búsqueda o espere al ciclo automático</p>
                    </div>
                  )}
                </div>
              </motion.section>
            )}

            {activeView === 'SYSTEM' && systemTab !== 'KNOWLEDGE' && (
              <motion.section 
                key="system"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="max-w-6xl mx-auto w-full pb-40"
              >
                <div className="mb-16 border-b-4 border-[#FCD059] pb-8 space-y-4">
                  <p className="header-label">{isEs ? 'DOSSIER TÉCNICO Y NARRATIVO' : 'TECHNICAL AND NARRATIVE DOSSIER'}</p>
                  <h2 className="text-5xl font-black text-[#004884] uppercase tracking-tighter leading-none">
                    {isEs ? 'Lo que el jurado y el público deben entender del sistema' : 'What the jury and the public should understand about the system'}
                  </h2>
                  <p className="text-lg text-gray-500 max-w-4xl">
                    {isEs
                      ? 'Esta vista resume el problema, las fuentes abiertas, las reglas de inferencia, la arquitectura real y el tipo de evidencia que GobIA Auditor entrega. La idea es que nadie tenga que adivinar cómo funciona.'
                      : 'This view summarizes the problem, the open sources, the inference rules, the real architecture, and the kind of evidence GobIA Auditor produces. Nobody should have to guess how it works.'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 mb-12">
                  {[
                    { id: 'OVERVIEW', label: isEs ? 'Resumen' : 'Overview' },
                    { id: 'SOURCES', label: isEs ? 'Fuentes' : 'Sources' },
                    { id: 'FLOW', label: isEs ? 'Operacion' : 'Flow' },
                    { id: 'KNOWLEDGE', label: isEs ? 'Capacidades' : 'Capabilities' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSystemTab(tab.id as typeof systemTab)}
                      className={cn(
                        'px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] border transition-all',
                        systemTab === tab.id ? 'bg-[#004884] text-white border-[#004884]' : 'bg-white text-gray-500 border-[#E6E6E6] hover:border-[#004884]'
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-24">
                  <div className="space-y-8 bg-white border border-[#E6E6E6] p-12 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-[#004884]" />
                    <h3 className="text-2xl font-black text-[#004884] uppercase flex items-center gap-4">
                      <Target className="text-[#004884]" size={24} /> {isEs ? 'Qué resuelve' : 'What it solves'}
                    </h3>
                    <p className="text-xl text-[#333333] leading-relaxed font-medium italic">
                      "{isEs
                        ? 'GobIA Auditor convierte contratos públicos dispersos en expedientes de riesgo explicables. No busca un documento aislado: detecta patrones repetidos que apuntan a fraccionamiento, concentración y baja competencia.'
                        : 'GobIA Auditor turns scattered public contracts into explainable risk case files. It does not search for an isolated document: it detects repeated patterns that point to contract splitting, concentration, and weak competition.'}"
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        {
                          label: isEs ? 'Entidades visibles ahora' : 'Entities visible now',
                          value: auditCoverage.entityCount || monitoredEntities.length,
                        },
                        {
                          label: isEs ? 'Contratos analizados' : 'Contracts analyzed',
                          value: auditCoverage.totalContracts,
                        },
                        {
                          label: isEs ? 'Fuentes jurídicas indexadas' : 'Indexed legal sources',
                          value: LEGAL_KNOWLEDGE_BASE.length,
                        },
                      ].map(item => (
                        <div key={item.label} className="bg-gray-50 border border-gray-100 p-5">
                          <p className="header-label !text-gray-400">{item.label}</p>
                          <p className="text-3xl font-black text-[#004884]">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-12">
                    <h3 className="text-2xl font-black text-[#004884] uppercase flex items-center gap-4">
                      <Globe className="text-[#004884]" size={24} /> {isEs ? 'Fuentes abiertas y evidencia de entrada' : 'Open sources and input evidence'}
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {openSourceRegistry.map(item => (
                        <div key={item.title} className="bg-white border border-[#E6E6E6] p-8 space-y-5">
                          <div className="w-14 h-14 bg-gray-50 flex items-center justify-center border-4 border-gray-100">
                            <item.icon size={24} className="text-[#004884]" />
                          </div>
                          <div className="space-y-3">
                            <h4 className="text-xl font-black text-[#333333] uppercase tracking-tight">{item.title}</h4>
                            <p className="text-base text-gray-500 leading-relaxed">{item.description}</p>
                            <div className="flex flex-wrap gap-2">
                              {item.tags.map(tag => (
                                <span key={tag} className="px-2 py-1 bg-gray-50 border border-gray-100 text-[9px] font-bold uppercase tracking-wider text-gray-500">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-12">
                    <h3 className="text-2xl font-black text-[#004884] uppercase flex items-center gap-4">
                      <Cpu className="text-[#004884]" size={24} /> {isEs ? 'Cómo opera realmente el sistema' : 'How the system actually operates'}
                    </h3>
                    <div className="grid gap-6">
                      {systemFlow.map((item, index) => (
                        <div key={item.title} className="bg-white border border-[#E6E6E6] p-10 flex flex-col md:flex-row gap-8 items-start hover:border-[#004884] transition-all group">
                          <div className="w-16 h-16 bg-gray-50 flex items-center justify-center border-4 border-gray-100 group-hover:border-[#004884]/10 transition-all shrink-0">
                            <item.icon size={28} className="text-gray-300 group-hover:text-[#004884] transition-colors" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-[#004884]/40 uppercase tracking-widest">
                              {isEs ? `Flujo operativo ${String(index + 1).padStart(2, '0')}` : `Operational flow ${String(index + 1).padStart(2, '0')}`}
                            </p>
                            <h4 className="text-xl font-black text-[#333333] uppercase tracking-tight">{item.title}</h4>
                            <p className="text-base text-gray-500 leading-relaxed">{item.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-12">
                    <h3 className="text-2xl font-black text-[#004884] uppercase flex items-center gap-4">
                      <ShieldAlert className="text-[#004884]" size={24} /> {isEs ? 'Señales que activan el riesgo' : 'Signals that activate risk'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                      {riskSignals.map(signal => (
                        <div key={signal.title} className="p-8 bg-gray-50 border border-gray-100 space-y-4">
                          <p className="header-label !mb-0">{isEs ? 'Indicador forense' : 'Forensic indicator'}</p>
                          <h4 className="text-lg font-black text-[#333333] uppercase leading-tight">{signal.title}</h4>
                          <p className="text-sm text-gray-500 leading-relaxed">{signal.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <div className="space-y-8 bg-[#004884] p-12 text-white">
                      <h3 className="text-2xl font-black uppercase flex items-center gap-4">
                        <Gavel className="text-[#FCD059]" size={24} /> {isEs ? 'Por qué esto importa para el jurado' : 'Why this matters to the jury'}
                      </h3>
                      <p className="text-lg text-white/90 leading-relaxed font-medium">
                        {isEs
                          ? 'La propuesta no se limita a visualizar contratos: transforma datos abiertos en una hipótesis de riesgo explicable, trazable y exportable. Eso reduce semanas de lectura manual a minutos de revisión asistida.'
                          : 'The proposal does more than visualize contracts: it turns open data into an explainable, traceable, exportable risk hypothesis. That reduces weeks of manual reading to minutes of assisted review.'}
                      </p>
                      <div className="space-y-3">
                        {[
                          isEs ? 'Hace visible qué entidades están siendo auditadas y por qué.' : 'Makes visible which entities are being audited and why.',
                          isEs ? 'Muestra las fuentes abiertas consultadas sin ocultarlas tras lenguaje de IA.' : 'Shows the open sources consulted instead of hiding them behind AI jargon.',
                          isEs ? 'Entrega evidencia utilizable para contralorías, periodistas y vigilancia ciudadana.' : 'Produces usable evidence for oversight bodies, journalists, and civic watchdogs.',
                        ].map(point => (
                          <p key={point} className="text-sm text-white/90 leading-relaxed">
                            <span className="font-black text-[#FCD059]">-</span> {point}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-8 bg-white border border-[#E6E6E6] p-12">
                      <h3 className="text-2xl font-black text-[#004884] uppercase flex items-center gap-4">
                        <Monitor className="text-[#004884]" size={24} /> {isEs ? 'Arquitectura y salidas del sistema' : 'Architecture and system outputs'}
                      </h3>
                      <div className="space-y-3">
                        {systemFacts.map(fact => (
                          <p key={fact} className="text-sm text-gray-600 leading-relaxed">
                            <span className="font-black text-[#004884]">-</span> {fact}
                          </p>
                        ))}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {[
                          isEs ? 'Tarjetas de hallazgo por proveedor y entidad.' : 'Finding cards by provider and entity.',
                          isEs ? 'Expediente técnico con contrato expandible y evidencia puntual.' : 'Technical case file with expandable contracts and pinpoint evidence.',
                          isEs ? 'Chat de auditor para explicar el fundamento jurídico del hallazgo.' : 'Audit chat to explain the legal basis of each finding.',
                          isEs ? 'Exportación CSV y PDF para trabajo de campo o presentación institucional.' : 'CSV and PDF export for field work or institutional presentation.',
                        ].map(output => (
                          <div key={output} className="bg-gray-50 border border-gray-100 p-4 text-sm font-bold text-[#333333] uppercase leading-relaxed">
                            {output}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}

            {activeView === 'SYSTEM' && systemTab === 'KNOWLEDGE' && (
              <motion.section 
                key="knowledge"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-[calc(100vh-160px)]"
              >
                <KnowledgeBase 
                  results={results} 
                  onRetroactiveAudit={() => handleRetroactiveAudit()}
                  onSelfLearning={handleSelfLearning}
                  lang={lang}
                />
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Forensic Report Drawer/Modal */}
      <AnimatePresence>
        {selectedResult && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-12 lg:p-20 bg-[#004884]/40 backdrop-blur-md"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border-2 border-[#004884] w-full max-w-5xl h-full rounded-none flex flex-col shadow-[0_40px_100px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              <div className="p-10 border-b-2 border-[#F2F2F2] flex justify-between items-start bg-gray-50/50">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#004884] flex items-center justify-center">
                      <ShieldAlert className="text-white" size={28} />
                    </div>
                    <div>
                      <h3 className="text-4xl font-black text-[#004884] uppercase tracking-tighter leading-none">{selectedResult.providerName}</h3>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">EXPEDIENTE DE AUDITORÍA IA // {selectedResult.groupKey}</p>
                    </div>
                  </div>
                </div>
                <button onClick={() => { setSelectedResult(null); setAiReport(null); setShowEvidenceDossier(false); setFocusedEvidenceId(null); setActiveChatFinding(null); setChatMessages([]); setSuggestedAuditQA([]); }} className="hover:bg-[#004884] hover:text-white transition-all p-2 rounded-full text-gray-300">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-12 custom-scrollbar space-y-16 bg-white">
                {/* Analysis Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: lang === 'ES' ? 'Probabilidad de Riesgo' : 'Risk Probability', val: `${selectedResult.riskScore}%`, color: selectedResult.riskScore > 75 ? 'text-red-600' : 'text-[#004884]', help: t.help.risk_score },
                    { label: lang === 'ES' ? 'Similitud de Objeto' : 'Object Similarity', val: `${(selectedResult.similarityScore * 100).toFixed(1)}%`, color: 'text-[#333333]', help: t.help.similarity },
                    { label: lang === 'ES' ? 'Exposición Fiscal' : 'Fiscal Exposure', val: `$${(selectedResult.totalValue / 1e6).toFixed(1)}M`, color: 'text-[#333333]', help: t.help.exposure },
                    { label: lang === 'ES' ? 'Frecuencia' : 'Frequency', val: `${selectedResult.contracts.length} Contratos`, color: 'text-[#333333]', help: t.help.window },
                  ].map(stat => (
                    <div key={stat.label} className="p-6 bg-gray-50 border border-gray-100 space-y-2 group/stat">
                      <div className="flex items-center gap-2">
                        <p className="header-label leading-none">{stat.label}</p>
                        <Info size={12} className="text-gray-300" />
                      </div>
                      <p className={cn("text-3xl font-black tracking-tighter", stat.color)}>{stat.val}</p>
                    </div>
                  ))}
                </div>

                {/* Technical Evidence OVERHAUL */}
                <div className="space-y-12">
                   <div className="flex items-center gap-4">
                      <h4 className="section-title text-sm">{lang === 'ES' ? 'ANÁLISIS TÉCNICO E INDICIOS FORENSES' : 'TECHNICAL ANALYSIS & FORENSIC CLUES'}</h4>
                      <div className="h-px flex-1 bg-gray-100" />
                   </div>
                   
                   <TechnicalFindings 
                     result={selectedResult}
                     lang={lang}
                     onOpenSource={handleOpenSource}
                     expandedContract={expandedContract}
                     setExpandedContract={setExpandedContract}
                     onAskAuditor={(finding) => { openInteractiveAudit(finding); }}
                   />
                </div>

                {/* Report Content */}
                <div className="space-y-12">
                   <div className="flex items-center gap-4">
                      <h4 className="section-title text-sm">{lang === 'ES' ? 'INFORME TÉCNICO DE HALLAZGOS' : 'TECHNICAL FINDINGS REPORT'}</h4>
                      <div className="h-px flex-1 bg-gray-100" />
                   </div>

                   {reportLoading ? (
                    <div className="py-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-lg bg-gray-50/30 overflow-hidden relative">
                       <div className="absolute inset-0 opacity-10">
                          <AgentOffice logs={agentLogs} lang={lang} />
                       </div>
                       <Loader2 className="animate-spin text-[#004884] mb-6 relative z-10" size={48} />
                       <p className="text-[12px] font-bold uppercase tracking-[0.4em] text-[#004884] animate-pulse relative z-10">
                         {lang === 'ES' ? 'PROCESANDO EVIDENCIA Y NORMAS JURÍDICAS...' : 'PROCESSING EVIDENCE AND LEGAL STANDARDS...'}
                       </p>
                       <div className="mt-8 max-w-sm w-full space-y-2 relative z-10 px-6">
                          {agentLogs.slice(-2).map((log, i) => (
                            <p key={i} className="text-[10px] font-mono text-gray-500 text-center animate-in fade-in slide-in-from-bottom-1 uppercase">
                               [{log.agent}] {log.message}
                            </p>
                          ))}
                       </div>
                    </div>
                  ) : aiReport ? (
                    <div className="flex flex-col gap-8">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={handleDownloadPDF}
                          className="flex items-center gap-2 px-4 py-2 bg-[#004884] text-white text-[10px] font-black uppercase hover:bg-[#003663] transition-all"
                        >
                          <Download size={14} /> {lang === 'ES' ? 'EXPORTAR PDF OFICIAL' : 'EXPORT OFFICIAL PDF'}
                        </button>
                      </div>
                      
                      <div 
                        id="report-paper" 
                        className="bg-white p-16 shadow-lg border border-gray-100 mx-auto w-full max-w-[210mm] min-h-[297mm] font-serif relative overflow-hidden text-[#333333]"
                        style={{ boxShadow: '0 0 20px rgba(0,0,0,0.05)' }}
                      >
                         {/* Document Watermark/Header */}
                         <div className="absolute top-8 left-16 opacity-10 flex items-center gap-2 pointer-events-none">
                            <ShieldAlert size={40} />
                            <div className="font-sans font-black text-xs leading-none">
                               GOBIERNO DE COLOMBIA<br/>
                               AUDITORÍA FORENSE IA
                            </div>
                         </div>
                         <div className="absolute top-8 right-16 opacity-10 font-sans font-black text-[10px] pointer-events-none">
                            REFERENCIA: PRO-GOV-AI-2026
                         </div>

                         <div className="mt-12 relative z-10">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                h1: (props) => <h1 className="text-3xl font-black text-[#004884] uppercase tracking-tighter border-b-4 border-[#FCD059] pb-6 mb-10 font-sans" {...props} />,
                                h2: (props) => <h2 className="text-xl font-black text-[#004884] uppercase tracking-tight mt-16 mb-8 border-l-4 border-[#FCD059] pl-4 font-sans" {...props} />,
                                p: (props) => <p className="text-gray-800 leading-relaxed text-base mb-8 text-justify" {...props} />,
                                ul: (props) => <ul className="bg-gray-50/50 p-8 list-none space-y-4 mb-10 border border-gray-100 font-sans" {...props} />,
                                li: (props) => <li className="text-gray-700 font-medium before:content-['•'] before:mr-3 before:text-[#004884] before:font-bold" {...props} />,
                                strong: (props) => <strong className="text-[#004884] font-black" {...props} />,
                                table: (props) => <div className="overflow-x-auto my-10 border border-gray-200"><table className="min-w-full divide-y divide-gray-200 font-sans" {...props} /></div>,
                                thead: (props) => <thead className="bg-gray-50" {...props} />,
                                th: (props) => <th className="px-6 py-4 text-left text-[10px] font-black text-[#004884] uppercase tracking-widest border-b-2 border-gray-100" {...props} />,
                                td: (props) => <td className="px-6 py-4 text-xs text-gray-700 border-b border-gray-50" {...props} />,
                              }}
                            >
                              {aiReport}
                            </ReactMarkdown>
                         </div>

                         {/* Footer Signatures Area */}
                         <div className="mt-20 pt-16 border-t border-gray-100 grid grid-cols-2 gap-20">
                            <div className="text-center">
                               <div className="h-px bg-gray-400 mb-4 mx-auto w-40" />
                               <p className="text-[10px] font-black uppercase text-gray-400">Sistema de auditoría</p>
                               <p className="text-[8px] text-gray-300">ID: CORTEX-G-3-v1</p>
                            </div>
                            <div className="text-center">
                               <div className="h-px bg-gray-400 mb-4 mx-auto w-40" />
                               <p className="text-[10px] font-black uppercase text-gray-400">Verificación de Protocolo</p>
                               <p className="text-[8px] text-gray-300">Timestamp: {new Date().toISOString()}</p>
                            </div>
                         </div>
                      </div>
                    </div>
                  ) : (
                    <button 
                      data-testid="generate-report"
                      onClick={() => handleGenerateReport(selectedResult)} 
                      className="w-full py-16 bg-[#004884]/5 border-2 border-[#004884]/10 border-dashed hover:border-[#004884] transition-all group flex flex-col items-center gap-6"
                    >
                      <Fingerprint className="text-gray-200 group-hover:text-[#004884] transition-colors" size={64} />
                      <p className="text-[14px] font-black uppercase tracking-[0.2em] text-gray-400 group-hover:text-[#004884] transition-colors">{lang === 'ES' ? 'INICIAR AUDITORÍA PROFUNDA CON IA' : 'START DEEP AI AUDIT'}</p>
                    </button>
                  )}
                </div>

                <div className="py-20 text-center border-t border-gray-50">
                    <p className="text-[10px] font-mono text-gray-300 uppercase tracking-widest italic">
                      {lang === 'ES' ? 'Fin del expediente técnico' : 'End of technical case file'}
                    </p>
                </div>
              </div>

              <AnimatePresence>
                {activeChatFinding && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                  >
                    <motion.div 
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 20 }}
                      className="bg-white w-full max-w-lg h-[600px] shadow-2xl flex flex-col border-4 border-[#004884] overflow-hidden"
                    >
                      <div className="p-4 bg-[#004884] text-white flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                          <Zap size={18} className="text-[#FCD059]" />
                          <span className="text-[11px] font-black tracking-widest uppercase truncate max-w-[300px]">AUDITORÍA INTERACTIVA // ID: {activeChatFinding.contractId}</span>
                        </div>
                        <button onClick={() => { setActiveChatFinding(null); setChatMessages([]); setSuggestedAuditQA([]); }} className="hover:rotate-90 transition-transform p-1">
                          <X size={20} />
                        </button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 custom-scrollbar scroll-smooth">
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 text-[10px] text-blue-700 font-medium leading-relaxed font-sans">
                          {lang === 'ES' 
                            ? 'El auditor tiene el contexto completo de este contrato y el historial del proveedor. Pregunta sobre legalidad, riesgos técnicos o comparativa semántica.' 
                            : 'The auditor has full context of this contract and provider history. Ask about legality, technical risks, or semantic comparison.'}
                        </div>

                        {suggestedAuditLoading ? (
                          <div className="bg-white border border-gray-200 p-4 space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#004884]">
                              {chatMessages.length > 0
                                ? (lang === 'ES' ? 'Recalculando siguientes preguntas...' : 'Recalculating next questions...')
                                : (lang === 'ES' ? 'Preparando preguntas sugeridas...' : 'Preparing suggested questions...')}
                            </p>
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-[#004884] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-2 h-2 bg-[#004884] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 bg-[#004884] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        ) : suggestedAuditQA.length > 0 ? (
                          <div className="bg-white border border-gray-200 p-4 space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#004884]">
                              {chatMessages.length > 0
                                ? (lang === 'ES' ? 'Siguientes preguntas sugeridas' : 'Suggested next questions')
                                : (lang === 'ES' ? 'Preguntas sugeridas' : 'Suggested questions')}
                            </p>
                            <div className="grid gap-3">
                              {suggestedAuditQA.map(item => (
                                <button
                                  key={item.question}
                                  type="button"
                                  onClick={() => applySuggestedAuditQA(item)}
                                  className="text-left border border-gray-200 bg-gray-50 hover:bg-white hover:border-[#004884] transition-all p-4 space-y-2"
                                >
                                  <p className="text-[11px] font-black text-[#333333]">{item.question}</p>
                                  <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-2">{item.answer}</p>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        
                        {chatMessages.map((msg, idx) => (
                          <div key={idx} className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
                            <div className={cn(
                              "max-w-[90%] p-4 text-[11px] font-medium leading-relaxed shadow-sm font-sans",
                              msg.role === 'user' 
                                ? "bg-[#004884] text-white rounded-l-xl rounded-tr-xl" 
                                : "bg-white border border-gray-200 text-gray-800 rounded-r-xl rounded-tl-xl text-left"
                            )}>
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          </div>
                        ))}
                        {chatLoading && (
                          <div className="flex justify-start">
                            <div className="bg-white border border-gray-200 p-4 rounded-xl flex gap-2">
                              <div className="flex gap-1">
                                 <span className="w-1.5 h-1.5 bg-[#004884] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                 <span className="w-1.5 h-1.5 bg-[#004884] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                 <span className="w-1.5 h-1.5 bg-[#004884] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </div>
                            </div>
                          </div>
                        )}
                        <div id="chat-bottom" />
                      </div>
                      
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.target as HTMLFormElement;
                          const input = form.elements.namedItem('message') as HTMLInputElement;
                          if (input.value.trim()) {
                            handleSendMessage(input.value);
                            input.value = '';
                          }
                        }}
                        className="p-4 border-t border-gray-200 bg-white flex gap-2 shrink-0"
                      >
                        <input 
                          name="message"
                          autoComplete="off"
                          placeholder={lang === 'ES' ? 'Escribe tu consulta técnica...' : 'Type your technical query...'}
                          className="flex-1 bg-gray-100 border-none px-4 py-3 text-[11px] font-medium focus:outline-none focus:ring-2 focus:ring-[#004884] transition-all"
                        />
                        <button 
                          type="submit" 
                          disabled={chatLoading}
                          className="bg-[#004884] text-white px-6 py-2 text-[10px] font-black uppercase hover:bg-black transition-colors disabled:opacity-50"
                        >
                          {lang === 'ES' ? 'ENVIAR' : 'SEND'}
                        </button>
                      </form>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {showEvidenceDossier && selectedResult && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                  >
                    <motion.div
                      initial={{ scale: 0.96, y: 16 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.96, y: 16 }}
                      className="bg-white w-full max-w-6xl h-[82vh] border-4 border-[#004884] shadow-2xl flex overflow-hidden"
                    >
                      <div className="w-[360px] border-r border-[#E6E6E6] bg-gray-50 p-6 space-y-4 overflow-y-auto custom-scrollbar shrink-0">
                        <div className="space-y-2">
                          <p className="header-label !mb-0">{lang === 'ES' ? 'Dossier probatorio' : 'Evidence dossier'}</p>
                          <h4 className="text-2xl font-black text-[#004884] uppercase tracking-tight">
                            {lang === 'ES' ? 'Contratos observados' : 'Observed contracts'}
                          </h4>
                        </div>
                        {selectedResult.detailedFindings
                          .filter(finding => finding.reasons.length > 0 || selectedResult.riskScore > 80)
                          .sort((a, b) => b.reasons.length - a.reasons.length)
                          .map(finding => (
                            <button
                              key={finding.contractId}
                              type="button"
                              onClick={() => setFocusedEvidenceId(finding.contractId)}
                              className={cn(
                                "w-full text-left border p-4 space-y-2 transition-all",
                                focusedEvidenceId === finding.contractId ? "border-[#004884] bg-white shadow-sm" : "border-[#E6E6E6] bg-gray-50 hover:bg-white"
                              )}
                            >
                              <p className="text-[10px] font-black uppercase tracking-widest text-[#004884]">#{finding.contractId}</p>
                              <p className="text-sm font-black text-[#333333] line-clamp-2">
                                {finding.contract.objeto_del_contrato}
                              </p>
                              <p className="text-[10px] text-gray-500 uppercase">
                                {finding.reasons[0] || (lang === 'ES' ? 'Revisión prioritaria' : 'Priority review')}
                              </p>
                            </button>
                          ))}
                      </div>

                      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-white">
                        {(() => {
                          const findings = selectedResult.detailedFindings
                            .filter(finding => finding.reasons.length > 0 || selectedResult.riskScore > 80)
                            .sort((a, b) => b.reasons.length - a.reasons.length);
                          const current = findings.find(finding => finding.contractId === focusedEvidenceId) || findings[0];
                          if (!current) return null;
                          const contract = current.contract;

                          return (
                            <div className="space-y-8">
                              <div className="flex items-start justify-between gap-6">
                                <div className="space-y-3">
                                  <p className="header-label !mb-0">{lang === 'ES' ? 'Contrato seleccionado' : 'Selected contract'}</p>
                                  <h4 className="text-3xl font-black text-[#333333] uppercase tracking-tight">
                                    {contract.nombre_entidad}
                                  </h4>
                                  <p className="text-sm text-gray-500 max-w-3xl leading-relaxed">{contract.objeto_del_contrato}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowEvidenceDossier(false)}
                                  className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-[#004884] hover:text-white transition-all"
                                >
                                  <X size={20} />
                                </button>
                              </div>

                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                  { label: lang === 'ES' ? 'Contrato' : 'Contract', value: current.contractId },
                                  { label: lang === 'ES' ? 'Proceso' : 'Process', value: contract.referencia_proceso || 'N/A' },
                                  { label: lang === 'ES' ? 'Modalidad' : 'Modality', value: contract.modalidad_de_contratacion },
                                  { label: lang === 'ES' ? 'Fecha' : 'Date', value: new Date(contract.fecha_de_firma).toLocaleDateString(lang === 'ES' ? 'es-CO' : 'en-CA') },
                                  { label: lang === 'ES' ? 'Valor' : 'Amount', value: `$${parseContractValue(contract.valor_del_contrato).toLocaleString(lang === 'ES' ? 'es-CO' : 'en-US')}` },
                                ].map(item => (
                                  <div key={item.label} className="bg-gray-50 border border-[#E6E6E6] p-4">
                                    <p className="header-label !text-gray-400">{item.label}</p>
                                    <p className="text-sm font-black text-[#333333] uppercase">{item.value}</p>
                                  </div>
                                ))}
                              </div>

                              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <div className="border border-red-100 bg-red-50 p-6 space-y-4">
                                  <p className="header-label !text-red-600">{lang === 'ES' ? 'Infracción exacta observada' : 'Exact observed infraction'}</p>
                                  <div className="space-y-3">
                                    {current.reasons.map(reason => (
                                      <div key={reason} className="bg-white border border-red-100 p-4 space-y-2">
                                        <p className="text-[11px] font-black text-red-700 uppercase">{reason}</p>
                                        <p className="text-sm text-gray-600 leading-relaxed">{getReasonNarrative(reason, lang === 'ES')}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="border border-[#E6E6E6] bg-white p-6 space-y-4">
                                  <p className="header-label">{lang === 'ES' ? 'Soporte puntual del hallazgo' : 'Pinpoint evidence'}</p>
                                  <div className="bg-gray-50 border border-gray-100 p-4 text-sm text-gray-600 leading-relaxed">
                                    {current.evidence}
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                                    <div className="bg-gray-50 border border-gray-100 p-3">
                                      <span className="font-black text-[#004884]">{lang === 'ES' ? 'Referencia de proceso' : 'Process reference'}:</span>{' '}
                                      {contract.referencia_proceso || current.contractId}
                                    </div>
                                    <div className="bg-gray-50 border border-gray-100 p-3">
                                      <span className="font-black text-[#004884]">{lang === 'ES' ? 'ID de adjudicacion' : 'Award ID'}:</span>{' '}
                                      {contract.id_adjudicacion || 'N/A'}
                                    </div>
                                  </div>
                                  <div className="space-y-2 text-sm text-gray-600">
                                    <p><span className="font-black text-[#004884]">{lang === 'ES' ? 'Proveedor' : 'Provider'}:</span> {selectedResult.providerName}</p>
                                    <p><span className="font-black text-[#004884]">{lang === 'ES' ? 'Entidad' : 'Entity'}:</span> {contract.nombre_entidad}</p>
                                    <p><span className="font-black text-[#004884]">{lang === 'ES' ? 'Contexto del clúster' : 'Cluster context'}:</span> {selectedResult.redFlags[0] || (lang === 'ES' ? 'Hallazgo en revisión' : 'Finding under review')}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenSource(contract)}
                                    className="gov-button-outline w-full flex items-center justify-center gap-2"
                                  >
                                    <ExternalLink size={14} /> {lang === 'ES' ? 'Abrir fuente SECOP' : 'Open SECOP source'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="p-8 border-t-2 border-[#F2F2F2] bg-white flex gap-6 mt-auto shrink-0">
                <button
                  onClick={() => {
                    const firstFinding = selectedResult.detailedFindings
                      .filter(finding => finding.reasons.length > 0 || selectedResult.riskScore > 80)
                      .sort((a, b) => b.reasons.length - a.reasons.length)[0];
                    setFocusedEvidenceId(firstFinding?.contractId || null);
                    setShowEvidenceDossier(true);
                  }}
                  className="gov-button flex-1 h-14 flex items-center justify-center gap-3"
                >
                  <FileText size={18} /> {lang === 'ES' ? 'VER DOSSIER PROBATORIO' : 'OPEN EVIDENCE DOSSIER'}
                </button>
                <button 
                  onClick={() => setShowEscalationGuide(true)}
                  className="gov-button-outline flex-1 h-14 flex items-center justify-center gap-3"
                >
                  <ExternalLink size={18} /> {lang === 'ES' ? 'NOTIFICAR A LA CONTRALORÍA' : 'REPORT TO CONTRALORÍA'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFindingsOverview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[119] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.97, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.97, y: 18 }}
              className="bg-white w-full max-w-6xl h-[88vh] border-4 border-[#004884] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-[#E6E6E6] flex items-start justify-between gap-6">
                <div className="space-y-2">
                  <p className="header-label !mb-0">{lang === 'ES' ? 'Reporte de hallazgos' : 'Findings report'}</p>
                  <h4 className="text-3xl font-black text-[#004884] uppercase tracking-tight">
                    {lang === 'ES' ? 'Panorama ejecutivo de riesgos detectados' : 'Executive view of detected risks'}
                  </h4>
                  <p className="text-sm text-gray-500 max-w-3xl">
                    {lang === 'ES'
                      ? 'Este reporte resume lo que el sistema encontró, cómo leerlo y qué expedientes merecen atención prioritaria. La descarga en PDF queda como una acción secundaria.'
                      : 'This report summarizes what the system found, how to read it, and which cases deserve priority review. PDF download remains a secondary action.'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => downloadElementAsPdf('findings-overview-paper', `REPORTE_HALLAZGOS_GOBIA_${new Date().getTime()}.pdf`)}
                    className="gov-button flex items-center gap-2"
                  >
                    <Download size={14} /> {lang === 'ES' ? 'Descargar PDF oficial' : 'Download official PDF'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFindingsOverview(false)}
                    className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-[#004884] hover:text-white transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-gray-50">
                <div
                  id="findings-overview-paper"
                  className="bg-white border border-gray-100 shadow-lg mx-auto w-full max-w-[210mm] min-h-[297mm] p-14 space-y-10"
                >
                  <div className="flex items-start justify-between gap-8 border-b-4 border-[#FCD059] pb-8">
                    <div className="space-y-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#004884]">
                        {lang === 'ES' ? 'GobIA Auditor | Reporte ejecutivo' : 'GobIA Auditor | Executive report'}
                      </p>
                      <h3 className="text-4xl font-black text-[#004884] uppercase tracking-tight">
                        {lang === 'ES' ? 'Informe de hallazgos priorizados' : 'Prioritized findings report'}
                      </h3>
                      <p className="text-sm text-gray-600 max-w-2xl leading-relaxed">
                        {lang === 'ES'
                          ? 'Documento de lectura rápida para dirección, auditoría o control interno. Resume cobertura, criterios observados y expedientes que exigen validación inmediata.'
                          : 'Fast-reading document for leadership, audit, or internal control. Summarizes coverage, observed criteria, and cases that require immediate validation.'}
                      </p>
                    </div>
                    <div className="text-right text-[11px] text-gray-500 font-bold">
                      <p>{lang === 'ES' ? 'Emitido' : 'Issued'}: {new Date().toLocaleString(lang === 'ES' ? 'es-CO' : 'en-CA')}</p>
                      <p>{lang === 'ES' ? 'Cobertura' : 'Coverage'}: {auditCoverage.totalContracts} {lang === 'ES' ? 'contratos' : 'contracts'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: lang === 'ES' ? 'Entidades cubiertas' : 'Entities covered', value: auditCoverage.entityCount || monitoredEntities.length },
                      { label: lang === 'ES' ? 'Contratos analizados' : 'Contracts analyzed', value: auditCoverage.totalContracts },
                      { label: lang === 'ES' ? 'Casos en rojo' : 'Red cases', value: results.filter((item) => item.risk === 'Red').length },
                      { label: lang === 'ES' ? 'Exposicion agregada' : 'Total exposure', value: formatCompactCop(results.reduce((sum, item) => sum + item.totalValue, 0)) },
                    ].map((item) => (
                      <div key={item.label} className="bg-gray-50 border border-gray-100 p-4">
                        <p className="header-label !text-gray-400">{item.label}</p>
                        <p className="text-2xl font-black text-[#004884]">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xl font-black text-[#004884] uppercase tracking-tight">
                      {lang === 'ES' ? 'Como leer este reporte' : 'How to read this report'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        lang === 'ES' ? 'El puntaje de riesgo combina similitud semántica, ventana temporal, cuantías y modalidad.' : 'The risk score combines semantic similarity, time window, amounts, and modality.',
                        lang === 'ES' ? 'Los casos en rojo son prioridad de revisión; no equivalen por sí solos a una decisión jurídica final.' : 'Red cases are priority reviews; they do not by themselves equal a final legal determination.',
                        lang === 'ES' ? 'Cada expediente puede abrirse para consultar evidencia, contrato observado y fuente SECOP sin salir del sistema.' : 'Each case can be opened to inspect evidence, the observed contract, and the SECOP source without leaving the system.',
                      ].map((item) => (
                        <div key={item} className="bg-[#004884]/5 border border-[#004884]/10 p-4 text-sm text-gray-700 leading-relaxed">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xl font-black text-[#004884] uppercase tracking-tight">
                      {lang === 'ES' ? 'Expedientes priorizados' : 'Prioritized case files'}
                    </h4>
                    <div className="space-y-4">
                      {results
                        .slice()
                        .sort((a, b) => b.riskScore - a.riskScore)
                        .slice(0, 8)
                        .map((item) => (
                          <div key={item.groupKey} className="border border-[#E6E6E6] p-5 space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{item.groupKey}</p>
                                <h5 className="text-lg font-black text-[#333333] uppercase">{item.providerName}</h5>
                              </div>
                              <span className={cn(
                                'px-3 py-1 text-[10px] font-black uppercase tracking-widest',
                                item.risk === 'Red' ? 'bg-red-600 text-white' : item.risk === 'Orange' ? 'bg-[#FCD059] text-[#333333]' : 'bg-[#004884] text-white'
                              )}>
                                {item.risk} {item.riskScore.toFixed(0)}%
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {item.quickObservation || (lang === 'ES' ? 'Revisión prioritaria basada en señales agregadas del grupo contractual.' : 'Priority review driven by the aggregated signals of the contract cluster.')}
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                              <div className="bg-gray-50 border border-gray-100 p-3"><span className="font-black text-[#004884]">{lang === 'ES' ? 'Entidades' : 'Entities'}:</span> {summarizeList(uniqueEntityNames(item.contracts), 2)}</div>
                              <div className="bg-gray-50 border border-gray-100 p-3"><span className="font-black text-[#004884]">{lang === 'ES' ? 'Valor total' : 'Total amount'}:</span> {formatCompactCop(item.totalValue)}</div>
                              <div className="bg-gray-50 border border-gray-100 p-3"><span className="font-black text-[#004884]">{lang === 'ES' ? 'Señal líder' : 'Lead signal'}:</span> {item.redFlags[0] || (lang === 'ES' ? 'Sin alerta textual' : 'No textual alert')}</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sourceContract && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.96, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 18 }}
              className="bg-white w-full max-w-6xl h-[86vh] border-4 border-[#004884] shadow-2xl overflow-hidden flex"
            >
              <div className="w-[360px] shrink-0 border-r border-[#E6E6E6] bg-gray-50 p-6 space-y-6 overflow-y-auto custom-scrollbar">
                <div className="space-y-2">
                  <p className="header-label !mb-0">{lang === 'ES' ? 'Fuente contractual' : 'Contract source'}</p>
                  <h4 className="text-2xl font-black text-[#004884] uppercase tracking-tight">
                    {getContractDisplayId(sourceContract)}
                  </h4>
                  <p className="text-sm text-gray-500 leading-relaxed">{sourceContract.objeto_del_contrato}</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {buildSourceEvidenceRows(sourceContract, lang).map((item) => (
                    <div key={`${item.label}-${item.value}`} className="bg-white border border-[#E6E6E6] p-4 space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{item.label}</p>
                      <p className="text-[11px] font-bold text-[#333333] break-words">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1 flex flex-col min-w-0">
                <div className="p-6 border-b border-[#E6E6E6] flex items-start justify-between gap-6">
                  <div className="space-y-2">
                    <p className="header-label !mb-0">{lang === 'ES' ? 'Vista interna SECOP' : 'Internal SECOP view'}</p>
                    <h4 className="text-2xl font-black text-[#333333] uppercase tracking-tight">
                      {sourcePreview?.title || (lang === 'ES' ? 'Cargando soporte oficial' : 'Loading official source')}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {lang === 'ES'
                        ? 'La fuente se consulta y se presenta dentro del sistema para no romper el flujo de auditoria.'
                        : 'The source is fetched and rendered inside the system to preserve the audit workflow.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeSourcePreview}
                    className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-[#004884] hover:text-white transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-white space-y-6">
                  {sourceLoading ? (
                    <div className="h-full min-h-[320px] flex flex-col items-center justify-center gap-4">
                      <Loader2 className="animate-spin text-[#004884]" size={36} />
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#004884]">
                        {lang === 'ES' ? 'Consultando SECOP...' : 'Querying SECOP...'}
                      </p>
                    </div>
                  ) : sourceError ? (
                    <div className="border border-red-100 bg-red-50 p-6 space-y-3">
                      <p className="text-[11px] font-black uppercase tracking-widest text-red-700">
                        {lang === 'ES' ? 'No se pudo cargar la fuente oficial' : 'Official source could not be loaded'}
                      </p>
                      <p className="text-sm text-red-700 leading-relaxed">{sourceError}</p>
                      <div className="bg-white border border-red-100 p-4 text-sm text-gray-600">
                        {lang === 'ES'
                          ? 'El expediente conserva la metadata contractual y el identificador del proceso para continuar la revision sin salir del sistema.'
                          : 'The case file still preserves the contract metadata and process identifier so the review can continue without leaving the system.'}
                      </div>
                    </div>
                  ) : sourcePreview ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-50 border border-[#E6E6E6] p-4">
                          <p className="header-label !text-gray-400">{lang === 'ES' ? 'Estado HTTP' : 'HTTP status'}</p>
                          <p className="text-lg font-black text-[#004884]">{sourcePreview.statusCode}</p>
                        </div>
                        <div className="bg-gray-50 border border-[#E6E6E6] p-4">
                          <p className="header-label !text-gray-400">{lang === 'ES' ? 'Consulta' : 'Retrieved at'}</p>
                          <p className="text-sm font-black text-[#333333]">{new Date(sourcePreview.fetchedAt).toLocaleString(lang === 'ES' ? 'es-CO' : 'en-CA')}</p>
                        </div>
                        <div className="bg-gray-50 border border-[#E6E6E6] p-4">
                          <p className="header-label !text-gray-400">{lang === 'ES' ? 'Origen' : 'Origin'}</p>
                          <p className="text-sm font-black text-[#333333] break-all">{sourcePreview.url}</p>
                        </div>
                      </div>

                      <div className="border border-[#E6E6E6] bg-white p-6 space-y-4">
                        <p className="header-label">{lang === 'ES' ? 'Resumen util para auditoria' : 'Audit-ready summary'}</p>
                        <p className="text-sm text-gray-600 leading-relaxed">{sourcePreview.excerpt}</p>
                      </div>

                      <div className="border border-[#E6E6E6] bg-gray-50 p-6 space-y-4">
                        <p className="header-label">{lang === 'ES' ? 'Texto recuperado de la fuente' : 'Recovered source text'}</p>
                        <div className="bg-white border border-gray-100 p-5 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {sourcePreview.bodyText || (lang === 'ES' ? 'Sin contenido textual recuperable.' : 'No recoverable text content.')}
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEscalationGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[121] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.97, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.97, y: 16 }}
              className="bg-white w-full max-w-3xl border-4 border-[#004884] shadow-2xl p-8 space-y-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="header-label !mb-0">{lang === 'ES' ? 'Escalamiento institucional' : 'Institutional escalation'}</p>
                  <h4 className="text-3xl font-black text-[#004884] uppercase tracking-tight">
                    {lang === 'ES' ? 'Ruta sugerida para elevar el caso' : 'Suggested path to escalate the case'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEscalationGuide(false)}
                  className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-[#004884] hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  lang === 'ES' ? '1. Congelar el dossier probatorio y validar el soporte SECOP visible.' : '1. Freeze the evidence dossier and validate the visible SECOP support.',
                  lang === 'ES' ? '2. Contrastar estudios previos, presupuesto, modalidad y trazabilidad del proveedor.' : '2. Compare prior studies, budget support, modality, and supplier traceability.',
                  lang === 'ES' ? '3. Elevar el expediente por los canales institucionales definidos por la entidad de control.' : '3. Escalate the case through the institutional channels defined by the oversight body.',
                ].map((step) => (
                  <div key={step} className="bg-gray-50 border border-[#E6E6E6] p-5 text-sm font-medium text-gray-700 leading-relaxed">
                    {step}
                  </div>
                ))}
              </div>

              <div className="bg-[#004884]/5 border border-[#004884]/10 p-6 text-sm text-gray-700 leading-relaxed">
                {lang === 'ES'
                  ? 'El sistema no saca al usuario del flujo principal. Esta guia deja lista la secuencia de validacion y escalamiento para que el caso se pueda presentar de forma ordenada.'
                  : 'The system does not force the user out of the main workflow. This guide keeps the validation and escalation sequence ready so the case can be presented in an orderly way.'}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AdvancedSettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        t={t}
        lang={lang}
        results={results}
        logs={agentLogs}
        currentConfig={config} 
        onRetroactiveAudit={() => handleRetroactiveAudit()}
        onSelfLearning={handleSelfLearning}
        onSave={(e: any) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          setConfig({
            similarityThreshold: parseFloat(formData.get('sim') as string) / 100,
            dayWindow: parseInt(formData.get('days') as string),
            valueThreshold: parseInt(formData.get('value') as string)
          });
          setShowSettings(false);
          if (results.length > 0) handleSearch();
        }} 
      />
    </div>
  );
}

function getInvestigationAction(result: AnalysisResult, isEs: boolean) {
  if (result.risk === 'Red') {
    return isEs
      ? 'Abrir expediente, congelar muestra probatoria y validar soportes SECOP/documentales.'
      : 'Open a case file, freeze the evidence sample, and validate SECOP/document support.';
  }

  if (result.similarityScore >= 0.85) {
    return isEs
      ? 'Comparar objetos contractuales, anexos y estudios previos antes de cerrar el hallazgo.'
      : 'Compare contract objects, attachments, and prior studies before closing the finding.';
  }

  if (result.contracts.length >= 3 && result.maxDayDiff <= 90) {
    return isEs
      ? 'Revisar posible fraccionamiento por ventana temporal y concentracion de proveedor.'
      : 'Review possible contract splitting by time window and supplier concentration.';
  }

  return isEs
    ? 'Mantener monitoreo y re-evaluar cuando entren nuevos registros SECOP.'
    : 'Keep monitoring and re-score when new SECOP records arrive.';
}

function getReasonNarrative(reason: string, isEs: boolean) {
  const normalized = reason.toLowerCase();

  if (normalized.includes('directa')) {
    return isEs
      ? 'El contrato muestra uso reiterado de modalidades no competitivas, por lo que debe revisarse si la necesidad pudo tramitarse mediante un proceso más abierto.'
      : 'The contract shows repeated use of non-competitive procedures and should be reviewed to confirm whether a more open process was required.';
  }

  if (normalized.includes('similitud') || normalized.includes('identidad')) {
    return isEs
      ? 'La redacción del objeto contractual se parece de forma material a otros contratos del mismo proveedor, lo que sugiere posible fragmentación de una misma necesidad.'
      : 'The contract object is materially similar to other contracts from the same provider, suggesting a possible fragmentation of the same need.';
  }

  if (normalized.includes('cuant')) {
    return isEs
      ? 'La cuantía se mueve dentro de una banda estrecha junto a otros contratos comparables, un patrón típico de división artificial del gasto.'
      : 'The amount moves within a narrow band alongside other comparable contracts, a typical pattern of artificial spend splitting.';
  }

  if (normalized.includes('temporal') || normalized.includes('frecuencia')) {
    return isEs
      ? 'La cercanía entre fechas de firma indica concentración operativa en una ventana corta, un factor relevante para revisar planeación y agregación de demanda.'
      : 'The proximity of signature dates indicates operational concentration within a short window, a relevant factor when reviewing planning and demand aggregation.';
  }

  return isEs
    ? 'El sistema detectó un indicio técnico que justifica revisión documental prioritaria.'
    : 'The system detected a technical clue that justifies prioritized document review.';
}

function getLifecycleCoverage(result: AnalysisResult | null, isEs: boolean) {
  const firstContract = result?.contracts?.[0];

  return [
    {
      label: isEs ? 'Planeacion' : 'Planning',
      complete: Boolean(firstContract?.objeto_del_contrato && firstContract?.valor_del_contrato),
      detail: isEs ? 'Objeto y presupuesto detectados' : 'Object and budget detected',
    },
    {
      label: isEs ? 'Licitacion' : 'Tender',
      complete: Boolean(firstContract?.modalidad_de_contratacion),
      detail: isEs ? 'Modalidad SECOP disponible' : 'SECOP modality available',
    },
    {
      label: isEs ? 'Adjudicacion' : 'Award',
      complete: Boolean(firstContract?.nombre_del_contratista || result?.providerName),
      detail: isEs ? 'Proveedor identificado' : 'Supplier identified',
    },
    {
      label: isEs ? 'Contrato' : 'Contract',
      complete: Boolean(firstContract?.fecha_de_firma && firstContract?.estado_contrato),
      detail: isEs ? 'Fecha y estado disponibles' : 'Date and status available',
    },
    {
      label: isEs ? 'Ejecucion' : 'Implementation',
      complete: false,
      detail: isEs ? 'Pendiente evidencia fisica/documental' : 'Physical/document evidence pending',
    },
  ];
}

function AuditCommandCenter({
  lang,
  results,
  onOpenCase,
}: {
  lang: Language;
  results: AnalysisResult[];
  onOpenCase: (result: AnalysisResult) => void;
}) {
  const isEs = lang === 'ES';
  const queue = [...results].sort((a, b) => b.riskScore - a.riskScore).slice(0, 3);
  const leadCase = queue[0] || null;
  const lifecycle = getLifecycleCoverage(leadCase, isEs);
  const lifecycleScore = Math.round((lifecycle.filter(item => item.complete).length / lifecycle.length) * 100);

  return (
    <div data-testid="audit-command-center" className="gov-card p-8 bg-white border-l-8 border-l-[#D12C26] space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="space-y-3">
          <p className="header-label !mb-0 flex items-center gap-2">
            <ShieldAlert size={14} /> {isEs ? 'Mesa de decision' : 'Decision desk'}
          </p>
          <h3 className="text-3xl font-black text-[#333333] uppercase tracking-tighter">
            {isEs ? 'Cola priorizada de auditoria' : 'Prioritized audit queue'}
          </h3>
          <p className="text-sm text-gray-500 font-medium max-w-3xl">
            {isEs
              ? 'Aquí se priorizan los casos con mayor riesgo y se sugiere el siguiente paso de revisión para cada expediente.'
              : 'This area prioritizes the highest-risk cases and suggests the next review step for each file.'}
          </p>
        </div>
        <div className="bg-[#f0f7ff] border border-[#004884]/10 p-5 min-w-48">
          <p className="header-label !text-gray-400">{isEs ? 'Cobertura del expediente' : 'Case coverage'}</p>
          <p className="text-3xl font-black text-[#004884] tabular-nums">{leadCase ? `${lifecycleScore}%` : '--'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-3">
          {queue.length > 0 ? queue.map((result, index) => (
            <button
              key={result.groupKey}
              type="button"
              onClick={() => onOpenCase(result)}
              className="w-full text-left bg-gray-50 border border-[#E6E6E6] p-5 hover:border-[#004884] hover:bg-white transition-all group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "w-8 h-8 flex items-center justify-center text-[11px] font-black text-white",
                      index === 0 ? "bg-[#D12C26]" : "bg-[#004884]"
                    )}>
                      {index + 1}
                    </span>
                    <h4 className="text-sm font-black text-[#333333] uppercase">{result.providerName}</h4>
                  </div>
                  <p className="text-[11px] text-gray-500 font-bold uppercase leading-relaxed">
                    {getInvestigationAction(result, isEs)}
                  </p>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right">
                    <p className="header-label !text-gray-400">{isEs ? 'Riesgo' : 'Risk'}</p>
                    <p className={cn("text-2xl font-black tabular-nums", result.risk === 'Red' ? "text-red-600" : "text-[#004884]")}>
                      {result.riskScore.toFixed(0)}%
                    </p>
                  </div>
                  <ArrowRight className="text-gray-300 group-hover:text-[#004884]" size={20} />
                </div>
              </div>
            </button>
          )) : (
            <div className="bg-gray-50 border border-dashed border-gray-200 p-10 text-center">
              <Target className="mx-auto text-gray-300 mb-4" size={36} />
              <p className="text-[12px] font-black uppercase tracking-widest text-gray-400">
                {isEs ? 'Sin casos priorizados todavia' : 'No prioritized cases yet'}
              </p>
            </div>
          )}
        </div>

        <div className="bg-white border border-[#E6E6E6] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <p className="header-label !mb-0">{isEs ? 'Trazabilidad del expediente' : 'Case traceability'}</p>
            <Files size={16} className="text-[#004884]" />
          </div>
          <div className="space-y-3">
            {lifecycle.map(item => (
              <div key={item.label} className="flex items-start gap-3">
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                  item.complete ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-300"
                )}>
                  {item.complete ? <CheckCircle2 size={12} /> : <Info size={12} />}
                </div>
                <div>
                  <p className="text-[11px] font-black text-[#333333] uppercase">{item.label}</p>
                  <p className="text-[10px] text-gray-500 font-medium">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-amber-50 border border-amber-100 p-4 text-[10px] text-amber-800 font-bold uppercase leading-relaxed">
            {isEs
              ? 'La revisión actual cubre planeación, selección, adjudicación y formalización. La evidencia de ejecución sigue pendiente de validación documental.'
              : 'The current review covers planning, selection, award, and formalization. Execution evidence still requires document validation.'}
          </div>
        </div>
      </div>
    </div>
  );
}

function NeuralCenter({
  t,
  lang,
  memory,
  logs,
  panelState,
  onTrain,
  onSyncDashboard,
}: {
  t: any;
  lang: Language;
  memory: NeuralMemorySnapshot | null;
  logs: any[];
  panelState: AuditPanelBridge;
  onTrain: (entity: string) => Promise<NeuralMemorySnapshot>;
  onSyncDashboard: (memorySnapshot?: NeuralMemorySnapshot | null) => void;
}) {
  const [isTraining, setIsTraining] = useState(false);
  const isEs = lang === 'ES';
  const hasPanelData = panelState.connectedFindings > 0;

  const startGlobalScan = async () => {
    setIsTraining(true);
    try {
      const entities = ['SENA', 'DIAN', 'ICBF', 'EJERCITO', 'POLICIA'];
      let latestMemory: NeuralMemorySnapshot | null = memory || null;
      for (const entity of entities) {
        latestMemory = await onTrain(entity);
      }
      if (hasPanelData) onSyncDashboard(latestMemory);
    } finally {
      setIsTraining(false);
    }
  };
  
  return (
    <div className="space-y-12">
      <div data-testid="analytics-bridge" className="gov-card p-8 border-l-8 border-[#004884] bg-white">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-3">
              <Fingerprint className="text-[#004884]" size={22} />
              <p className="header-label !mb-0">{isEs ? 'Centro Analitico Integrado' : 'Integrated Analytic Hub'}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-[#004884] uppercase tracking-tighter">
                {isEs ? 'Resumen de aprendizaje y recalibración' : 'Learning and recalibration summary'}
              </h3>
              <p className="text-sm text-gray-500 font-medium max-w-3xl">
                {hasPanelData
                  ? (isEs
                    ? `Se consolidaron ${panelState.connectedFindings} hallazgo(s), ${panelState.highRiskFindings} alerta(s) críticas y ${formatCompactCop(panelState.totalExposure)} en exposición revisada.`
                    : `The system consolidated ${panelState.connectedFindings} finding(s), ${panelState.highRiskFindings} critical alert(s), and ${formatCompactCop(panelState.totalExposure)} in reviewed exposure.`)
                  : (isEs
                    ? 'Ejecuta una búsqueda para activar el análisis y habilitar la recalibración sobre casos reales.'
                    : 'Run a search to activate the analysis and enable recalibration on real cases.')}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={!hasPanelData || isTraining}
            onClick={() => onSyncDashboard(memory)}
            className={cn(
              "gov-button flex items-center justify-center gap-2 min-w-56",
              (!hasPanelData || isTraining) && "opacity-50 cursor-not-allowed"
            )}
          >
            <RefreshCw size={14} className={isTraining ? "animate-spin" : ""} />
            {isEs ? 'Sincronizar Panel' : 'Sync Panel'}
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {[
            { label: isEs ? 'Hallazgos conectados' : 'Connected findings', value: panelState.connectedFindings, testId: 'analytics-connected-findings' },
            { label: isEs ? 'Patrones aprendidos' : 'Learned patterns', value: panelState.learnedPatterns, testId: 'analytics-learned-patterns' },
            { label: isEs ? 'Cruces con memoria' : 'Memory matches', value: panelState.matchedPatterns, testId: 'analytics-memory-matches' },
            { label: isEs ? 'Foco actual' : 'Current focus', value: panelState.focusRiskScore !== null ? `${panelState.focusRiskScore.toFixed(0)}%` : '--', testId: 'analytics-current-focus' },
          ].map(item => (
            <div key={item.label} data-testid={item.testId} className="bg-gray-50 border border-[#E6E6E6] p-5">
              <p className="header-label !text-gray-400">{item.label}</p>
              <p className="text-2xl font-black text-[#333333] tabular-nums">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col md:flex-row gap-4 text-[11px] font-bold uppercase tracking-wide">
          <div className="flex-1 bg-[#f0f7ff] border border-[#004884]/10 p-4 text-[#004884]">
            {isEs ? 'Proveedor en foco' : 'Provider in focus'}: {panelState.focusProvider || (isEs ? 'Sin expediente seleccionado' : 'No case selected')}
          </div>
          <div className="flex-1 bg-gray-50 border border-[#E6E6E6] p-4 text-gray-500">
            {isEs ? 'Ultimo agente' : 'Latest agent'}: {panelState.latestAgent ? `${panelState.latestAgent} / ${panelState.latestStatus}` : (isEs ? 'Sin actividad' : 'No activity')}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-end border-b border-[#E6E6E6] pb-8">
        <div className="space-y-4">
          <p className="header-label">{t.calibration}</p>
          <div className="flex items-center gap-12">
            <div className="space-y-1 relative group/stat">
               <div className="flex items-center gap-2">
                <p className="header-label !text-gray-400">{t.cycles}</p>
                <div className="relative group/tooltip">
                  <Info size={12} className="text-gray-200" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-[#333333] text-[10px] text-white opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-[100] shadow-xl">
                    Total de ciclos de revisión y recalibración ejecutados sobre el sistema.
                  </div>
                </div>
               </div>
               <p className="text-3xl font-black text-[#333333] tabular-nums">{memory?.totalAudits || 0}</p>
            </div>
            <div className="w-px h-10 bg-gray-100" />
            <div className="space-y-1 relative group/stat">
               <div className="flex items-center gap-2">
                <p className="header-label !text-gray-400">{t.sensitivity}</p>
                <div className="relative group/tooltip">
                  <Info size={12} className="text-gray-200" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-[#333333] text-[10px] text-white opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-[100] shadow-xl">
                    Ajuste acumulado de sensibilidad aplicado a partir del aprendizaje reciente.
                  </div>
                </div>
               </div>
               <p className="text-3xl font-black text-emerald-600 tabular-nums">+{((memory?.systemBiasAdjustment || 0) * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>
        
        <button 
          disabled={isTraining}
          onClick={startGlobalScan}
          className="gov-button"
        >
          {isTraining ? t.scanning : t.execute_cycle}
        </button>
      </div>

      <div className="space-y-6">
        <h4 className="header-label">{t.cluster_viz}</h4>
        <div className="bg-white border border-[#E6E6E6] p-2 shadow-sm overflow-hidden">
          <AgentOffice logs={logs} lang={lang} />
        </div>
      </div>
    </div>
  );
}

/*
function SettingsModal({ isOpen, onClose, currentConfig, onSave }: { isOpen: boolean, onClose: () => void, currentConfig: AnalysisConfig, onSave: (e: any) => void }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#004884]/40 backdrop-blur-sm" />
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="relative w-full max-w-sm bg-white border-2 border-[#004884] p-10 flex flex-col shadow-2xl">
            <div className="flex items-center gap-3 mb-10 border-b-2 border-gray-100 pb-4">
               <Settings className="text-[#004884]" size={20} />
               <h3 className="text-[12px] font-black text-[#004884] uppercase tracking-widest leading-none">Parámetros de Calibración</h3>
            </div>
            <form onSubmit={onSave} className="space-y-8">
              {[
                { label: 'Umbral de Similitud (%)', name: 'sim', val: currentConfig.similarityThreshold * 100 },
                { label: 'Ventana Temporal (Días)', name: 'days', val: currentConfig.dayWindow },
                { label: 'Umbral de Valor ($)', name: 'value', val: currentConfig.valueThreshold },
              ].map(f => (
                <div key={f.name} className="space-y-2">
                  <label className="header-label">{f.label}</label>
                  <input 
                    name={f.name} 
                    type="number" 
                    defaultValue={f.val}
                    className="w-full bg-gray-50 border border-gray-200 px-4 py-3 text-sm font-bold text-[#333333] focus:border-[#004884] outline-none transition-all"
                  />
                </div>
              ))}
              <div className="flex gap-4 pt-4">
                <button onClick={onClose} type="button" className="gov-button-outline flex-1">Cancelar</button>
                <button type="submit" className="gov-button flex-1 text-[10px]">Guardar</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
*/

function AdvancedSettingsModal({
  isOpen,
  onClose,
  t,
  lang,
  results,
  logs,
  currentConfig,
  onRetroactiveAudit,
  onSelfLearning,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  t: any;
  lang: Language;
  results: AnalysisResult[];
  logs: any[];
  currentConfig: AnalysisConfig;
  onRetroactiveAudit: () => void;
  onSelfLearning: () => Promise<any>;
  onSave: (e: any) => void;
}) {
  const [activeTab, setActiveTab] = useState<'CALIBRATION' | 'INTELLIGENCE' | 'NETWORK' | 'HISTORY' | 'MANUAL'>('CALIBRATION');
  const isEs = lang === 'ES';
  const tabs = [
    { id: 'CALIBRATION' as const, label: isEs ? 'Calibracion' : 'Calibration', icon: Settings, testId: 'advanced-tab-calibration' },
    { id: 'INTELLIGENCE' as const, label: isEs ? 'Base IA' : 'Intel base', icon: BookOpen, testId: 'advanced-tab-intelligence' },
    { id: 'NETWORK' as const, label: isEs ? 'Red y modelos' : 'Network', icon: Cpu, testId: 'advanced-tab-network' },
    { id: 'HISTORY' as const, label: isEs ? 'Historial' : 'History', icon: History, testId: 'advanced-tab-history' },
    { id: 'MANUAL' as const, label: isEs ? 'Manual' : 'Manual', icon: Landmark, testId: 'advanced-tab-manual' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#004884]/40 backdrop-blur-sm" />
          <motion.div
            data-testid="advanced-console"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="relative w-full max-w-7xl h-[88vh] bg-white border-2 border-[#004884] shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="p-6 border-b-2 border-[#F2F2F2] flex items-start justify-between bg-white">
              <div className="space-y-2">
                <p className="header-label !mb-0">{isEs ? 'Consola avanzada' : 'Advanced console'}</p>
                <h3 className="text-3xl font-black text-[#004884] uppercase tracking-tighter leading-none">
                  {isEs ? 'Configuración del sistema' : 'System configuration'}
                </h3>
                <p className="text-sm text-gray-500 font-medium max-w-3xl">
                  {isEs
                    ? 'Este espacio reúne parámetros, conocimiento, modelos y trazabilidad para administrar el producto con criterio técnico.'
                    : 'This workspace brings together parameters, knowledge, models, and traceability to administer the product with technical rigor.'}
                </p>
              </div>
              <button data-testid="advanced-console-close" onClick={onClose} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-[#004884] hover:text-white transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-1 min-h-0">
              <aside className="w-72 border-r border-[#E6E6E6] bg-gray-50 p-4 space-y-2 shrink-0">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    data-testid={tab.testId}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full px-4 py-4 text-left text-[11px] font-black uppercase tracking-widest flex items-center gap-3 border transition-all",
                      activeTab === tab.id
                        ? "bg-[#004884] text-white border-[#004884]"
                        : "bg-white text-gray-500 border-[#E6E6E6] hover:text-[#004884] hover:border-[#004884]/30"
                    )}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                ))}
              </aside>

              <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar p-8 bg-[#F8FAFC]">
                {activeTab === 'CALIBRATION' && (
                  <form onSubmit={onSave} className="max-w-2xl space-y-8 bg-white border border-[#E6E6E6] p-8">
                    <div>
                      <p className="header-label">{isEs ? 'Parametros de deteccion' : 'Detection parameters'}</p>
                      <h4 className="text-2xl font-black text-[#333333] uppercase">
                        {isEs ? 'Calibracion forense' : 'Forensic calibration'}
                      </h4>
                    </div>
                    {[
                      { label: isEs ? 'Umbral de Similitud (%)' : 'Similarity threshold (%)', name: 'sim', val: currentConfig.similarityThreshold * 100 },
                      { label: isEs ? 'Ventana Temporal (Dias)' : 'Time window (days)', name: 'days', val: currentConfig.dayWindow },
                      { label: isEs ? 'Umbral de Valor ($)' : 'Value threshold ($)', name: 'value', val: currentConfig.valueThreshold },
                    ].map(f => (
                      <div key={f.name} className="space-y-2">
                        <label className="header-label">{f.label}</label>
                        <input
                          name={f.name}
                          type="number"
                          defaultValue={f.val}
                          className="w-full bg-gray-50 border border-gray-200 px-4 py-3 text-sm font-bold text-[#333333] focus:border-[#004884] outline-none transition-all"
                        />
                      </div>
                    ))}
                    <div className="flex gap-4 pt-4">
                      <button onClick={onClose} type="button" className="gov-button-outline flex-1">{isEs ? 'Cancelar' : 'Cancel'}</button>
                      <button type="submit" className="gov-button flex-1 text-[10px]">{isEs ? 'Guardar' : 'Save'}</button>
                    </div>
                  </form>
                )}

                {activeTab === 'INTELLIGENCE' && (
                  <div className="h-[70vh] border border-[#E6E6E6] bg-white overflow-hidden">
                    <KnowledgeBase
                      results={results}
                      onRetroactiveAudit={onRetroactiveAudit}
                      onSelfLearning={onSelfLearning}
                      lang={lang}
                    />
                  </div>
                )}

                {activeTab === 'NETWORK' && (
                  <div className="bg-[#09090b] p-6 min-h-[70vh]">
                    <CortexDashboard t={t.cortex} />
                  </div>
                )}

                {activeTab === 'HISTORY' && (
                  <div className="bg-white border border-[#E6E6E6] p-6 space-y-4">
                    <p className="header-label">{isEs ? 'Orquestacion del sistema' : 'System orchestration'}</p>
                    <AgentOffice logs={logs} lang={lang} />
                  </div>
                )}

                {activeTab === 'MANUAL' && (
                  <div className="max-w-4xl bg-white border border-[#E6E6E6] p-10 space-y-10">
                    <div>
                      <p className="header-label">{isEs ? 'Manual operativo' : 'Operating manual'}</p>
                      <h4 className="text-3xl font-black text-[#004884] uppercase tracking-tighter">{t.about.title}</h4>
                    </div>
                    <div className="grid gap-6">
                      {[
                        { icon: Search, title: t.about.step_1, text: t.about.step_1_text },
                        { icon: Scale, title: t.about.step_2, text: t.about.step_2_text },
                        { icon: ShieldAlert, title: t.about.step_3, text: t.about.step_3_text },
                      ].map(item => (
                        <div key={item.title} className="border border-[#E6E6E6] p-6 flex gap-5">
                          <div className="w-12 h-12 bg-[#004884] text-white flex items-center justify-center shrink-0">
                            <item.icon size={22} />
                          </div>
                          <div>
                            <h5 className="text-sm font-black text-[#333333] uppercase">{item.title}</h5>
                            <p className="text-sm text-gray-500 leading-relaxed mt-2">{item.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-[#004884] text-white p-8">
                      <p className="header-label !text-[#FCD059]">{t.about.juror_note}</p>
                      <p className="text-base font-medium leading-relaxed">{t.about.juror_text}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

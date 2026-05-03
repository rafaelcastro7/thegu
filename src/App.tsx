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
import { chatAboutFinding } from './lib/gemini';
import { NOTORIOUS_ENTITIES } from './lib/intelligence';

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

export default function App() {
  const [lang, setLang] = useState<Language>('ES');
  const t = translations[lang];

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
  const [activeView, setActiveView] = useState<'DASHBOARD' | 'HISTORY' | 'CORTEX' | 'ABOUT' | 'KNOWLEDGE'>('DASHBOARD');
  const [neuralMemory, setNeuralMemory] = useState<NeuralMemorySnapshot | null>(() => readStoredNeuralMemory());
  const [statusMessage, setStatusMessage] = useState('SYSTEM_IDLE');
  const [progress, setProgress] = useState(0);
  const [activeChatFinding, setActiveChatFinding] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [expandedContract, setExpandedContract] = useState<string | null>(null);

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
    setStatusMessage(lang === 'ES' ? 'SINCRONIZANDO CENTRO ANALITICO -> PANEL...' : 'SYNCING ANALYTIC HUB -> AUDIT PANEL...');
    const memoryPatterns = getMemoryPatterns(memorySnapshot);

    setTimeout(() => {
      setResults(prev => {
        const updated = prev.map(res => {
          const intel = runIntelligenceAudit(res.detailedFindings.map(f => f.contract));
          const matchedMemory = getMatchingMemoryPatterns(res, memoryPatterns);
          const memoryBoost = Math.min(12, matchedMemory.length * 4);
          const riskScore = Math.min(100, res.riskScore + (intel.riskScore * 0.3) + memoryBoost);
          const learningFlags = matchedMemory.length > 0
            ? [lang === 'ES' ? `Memoria neural revalido ${matchedMemory.length} patron(es) historico(s)` : `Neural memory revalidated ${matchedMemory.length} historical pattern(s)`]
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
      setStatusMessage(lang === 'ES' ? 'PANEL_SINCRONIZADO_CON_CENTRO' : 'PANEL_SYNCED_WITH_HUB');
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
      setStatusMessage(lang === 'ES' ? 'INICIANDO PROTOCOLO BHA (THEGU)...' : 'INITIATING BHA (THEGU) PROTOCOL...');
      
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
      setStatusMessage("SYSTEM_SYNCED");
    };

    bootstrapDiscovery();
  }, []);

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

  async function handleSearch(targetSearch?: string) {
    const searchVal = targetSearch || entitySearch;
    if (!searchVal) return;
    
    setLoading(true);
    setStatusMessage("UPLINK_INITIATED");
    setResults([]);
    setAiReport(null);
    setSelectedResult(null);

    try {
      setStatusMessage("DIAL: SECOP_II_BRIDGE");
      const contracts = await fetchContractsByEntity(searchVal, 10);
      
      if (contracts.length === 0) {
        setStatusMessage(lang === 'ES' ? "CERO_RESULTADOS" : "ZERO_RECORDS_FOUND");
        setLoading(false);
        return;
      }

      setStatusMessage(`INGEST: ${contracts.length}_NODES`);
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
      setStatusMessage("IDLE");
    } catch (error) {
      console.error(error);
      setStatusMessage("ERROR: CONNECTION_FAILURE");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateReport(result: AnalysisResult) {
    setSelectedResult(result);
    setReportLoading(true);
    setAiReport(null);
    setAgentLogs([]);
    
    try {
      const { report, logs, memory } = await runCollaborativeAudit(result, lang, (updatedLogs, updatedMemory) => {
        setAgentLogs(updatedLogs);
        setNeuralMemory(updatedMemory);
      });
      setAiReport(report);
      setAgentLogs(logs);
      setNeuralMemory(memory);
    } catch (error) {
      console.error(error);
      setAiReport(lang === 'ES' ? "Error en Síntesis de Auditoría. Verifique que Ollama esté en ejecución." : "Audit Synthesis Failure. Please check if Ollama is running.");
    } finally {
      setReportLoading(false);
    }
  }

  async function handleSendMessage(text: string) {
    if (!activeChatFinding || !selectedResult || !text.trim()) return;
    const userMsg = { role: 'user' as const, content: text };
    setChatMessages(prev => [...prev, userMsg]);
    setChatLoading(true);
    try {
      const response = await chatAboutFinding(selectedResult, activeChatFinding, text, lang);
      setChatMessages(prev => [...prev, { role: 'ai' as const, content: response }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'ai' as const, content: lang === 'ES' ? 'Error al procesar consulta.' : 'Query error.' }]);
    } finally {
      setChatLoading(false);
    }
  }

  const handleTrain = async (entity: string) => {
    const { logs, memory } = await performAutonomousTraining(entity);
    setAgentLogs(prev => [...prev, ...logs].slice(-50));
    setNeuralMemory(memory);
    setStatusMessage(lang === 'ES' ? `MEMORIA_SINCRONIZADA:${entity}` : `MEMORY_SYNCED:${entity}`);
    return memory;
  };

  const handleCopyReport = () => {
    if (!aiReport) return;
    navigator.clipboard.writeText(aiReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = async () => {
    if (!aiReport || !selectedResult) return;
    
    setLoading(true);
    setStatusMessage(lang === 'ES' ? 'GENERANDO DOCUMENTO PDF...' : 'GENERATING PDF DOCUMENT...');
    
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);

      const element = document.getElementById('report-paper');
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
      pdf.save(`AUDITORIA_FORENSE_${selectedResult.providerName.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error('PDF Generation Error:', error);
    } finally {
      setLoading(false);
      setStatusMessage('SYSTEM_READY');
    }
  };

  const handleExportCSV = () => {

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

  return (
    <div className="min-h-screen bg-[#F2F2F2] text-[#333333] font-sans flex flex-col antialiased">
      {/* Official Gov Header Rail */}
      <header className="gov-header h-12 flex items-center justify-between px-8 z-[100] shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-[#FCD059]" />
            <div className="w-1 h-6 bg-[#004884]" />
            <div className="w-1 h-6 bg-[#D12C26]" />
            <span className="text-[11px] font-black tracking-widest ml-2">BHA</span>
          </div>
          <div className="h-4 w-px bg-white/20" />
          <h1 className="text-[10px] font-bold tracking-widest text-white/90 uppercase">
            THEGU (El vigilante según la lengua Nassa) | GOB_IA PRO
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
              { id: 'DASHBOARD', icon: Target, label: t.nav.intel }
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
        <div className="max-w-6xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="flex-1 space-y-4">
            <h2 className="text-4xl font-black text-[#004884] tracking-tighter leading-tight uppercase">
              {t.dashboard.title}
            </h2>
            <p className="text-lg text-gray-500 font-medium max-w-xl">
              {t.dashboard.subtitle}
            </p>
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
                <Globe size={10} /> FUENTE: SECOP II NACIONAL
              </p>
              {loading && (
                <p className="text-[10px] text-emerald-600 font-bold tabular-nums animate-pulse">PROCESANDO RED NEURAL: {progress}%</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-12">
        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            {activeView === 'DASHBOARD' && (
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
                          <button 
                            onClick={() => {
                              localStorage.removeItem('GOB_IA_CACHE_V1');
                              window.location.reload();
                            }}
                            className="text-[11px] font-bold text-gray-400 hover:text-red-600 flex items-center gap-2 transition-colors uppercase"
                          >
                            <Trash2 size={12} /> {lang === 'ES' ? 'Limpiar Todo' : 'Clear All'}
                          </button>
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
                        <div 
                          data-testid="result-card"
                          key={r.groupKey} 
                          onClick={() => handleGenerateReport(r)}
                          className="gov-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-8 border-l-8 cursor-pointer relative"
                          style={{ borderLeftColor: r.risk === 'Red' ? '#D12C26' : r.risk === 'Orange' ? '#FCD059' : '#004884' }}
                        >
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-4">
                                <h4 className="text-xl font-black text-[#333333] uppercase leading-none">{r.providerName}</h4>
                                {r.risk === 'Red' && (
                                  <span className="text-[9px] font-black bg-red-600 text-white px-2 py-1 uppercase animate-pulse">
                                    ALERTA CRÍTICA
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-gray-400 font-mono text-[10px] uppercase">
                                 <p className="flex items-center gap-1 text-[#004884] font-bold"><Fingerprint size={10} /> {r.redFlags[0] || 'Patrón Nominal'}</p>
                                 <p className="flex items-center gap-1"><Database size={10} /> NIT: {r.groupKey.split('-')[1]}</p>
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
                        </div>
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

            {activeView === 'ABOUT' && (
              <motion.section 
                key="about"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="max-w-4xl mx-auto w-full pb-40"
              >
                <div className="mb-16 border-b-4 border-[#FCD059] pb-8 space-y-4">
                  <p className="header-label">DOCUMENTACIÓN TÉCNICA OFICIAL</p>
                  <h2 className="text-5xl font-black text-[#004884] uppercase tracking-tighter leading-none">{t.about.title}</h2>
                </div>

                <div className="space-y-24">
                  {/* Mission */}
                  <div className="space-y-8 bg-white border border-[#E6E6E6] p-12 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-[#004884]" />
                    <h3 className="text-2xl font-black text-[#004884] uppercase flex items-center gap-4">
                      <Target className="text-[#004884]" size={24} /> {t.about.mission}
                    </h3>
                    <p className="text-xl text-[#333333] leading-relaxed font-medium italic">"{t.about.mission_text}"</p>
                  </div>

                  {/* How it works */}
                  <div className="space-y-12">
                    <h3 className="text-2xl font-black text-[#004884] uppercase flex items-center gap-4">
                      <Cpu className="text-[#004884]" size={24} /> {t.about.how_it_works}
                    </h3>
                    <div className="grid gap-6">
                      {[
                        { step: '01', title: t.about.step_1, text: t.about.step_1_text, icon: Database },
                        { step: '02', title: t.about.step_2, text: t.about.step_2_text, icon: Zap },
                        { step: '03', title: t.about.step_3, text: t.about.step_3_text, icon: ShieldAlert },
                      ].map(item => (
                        <div key={item.step} className="bg-white border border-[#E6E6E6] p-10 flex flex-col md:flex-row gap-8 items-start hover:border-[#004884] transition-all group">
                          <div className="w-16 h-16 bg-gray-50 flex items-center justify-center border-4 border-gray-100 group-hover:border-[#004884]/10 transition-all shrink-0">
                            <item.icon size={28} className="text-gray-300 group-hover:text-[#004884] transition-colors" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-[#004884]/40 uppercase tracking-widest">Procedimiento Nacional {item.step}</p>
                            <h4 className="text-xl font-black text-[#333333] uppercase tracking-tight">{item.title}</h4>
                            <p className="text-base text-gray-500 leading-relaxed">{item.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Juror Note */}
                  <div className="space-y-8 bg-[#004884] p-12 text-white">
                    <h3 className="text-2xl font-black uppercase flex items-center gap-4">
                      <Gavel className="text-[#FCD059]" size={24} /> {t.about.juror_note}
                    </h3>
                    <p className="text-lg text-white/90 leading-relaxed font-medium">{t.about.juror_text}</p>
                  </div>

                  {/* Manual */}
                  <div className="space-y-12">
                    <h3 className="text-2xl font-black text-[#004884] uppercase flex items-center gap-4">
                      <BookOpen className="text-[#004884]" size={24} /> {t.about.manual}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       {[
                        { step: 1, text: t.about.instruction_search },
                        { step: 2, text: t.about.instruction_risk },
                        { step: 3, text: t.about.instruction_cache },
                       ].map(i => (
                        <div key={i.step} className="p-8 bg-gray-50 border border-gray-100 space-y-6">
                          <div className="w-10 h-10 bg-[#004884] text-white flex items-center justify-center font-black text-xl">{i.step}</div>
                          <p className="text-sm font-bold text-[#333333] uppercase leading-relaxed">{i.text}</p>
                        </div>
                       ))}
                    </div>
                  </div>
                </div>
              </motion.section>
            )}

            {activeView === 'KNOWLEDGE' && (
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
                <button onClick={() => { setSelectedResult(null); setAiReport(null); }} className="hover:bg-[#004884] hover:text-white transition-all p-2 rounded-full text-gray-300">
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
                     expandedContract={expandedContract}
                     setExpandedContract={setExpandedContract}
                     onAskAuditor={(finding) => { setActiveChatFinding(finding); setChatMessages([]); }}
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
                          <AgentOffice logs={agentLogs} />
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
                               <p className="text-[10px] font-black uppercase text-gray-400">Agente de Auditoría Neural</p>
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
                      Fin del Expediente Técnico - Protocolo de Seguridad BHA-2026-X
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
                        <button onClick={() => { setActiveChatFinding(null); setChatMessages([]); }} className="hover:rotate-90 transition-transform p-1">
                          <X size={20} />
                        </button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 custom-scrollbar scroll-smooth">
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 text-[10px] text-blue-700 font-medium leading-relaxed font-sans">
                          {lang === 'ES' 
                            ? 'El auditor tiene el contexto completo de este contrato y el historial del proveedor. Pregunta sobre legalidad, riesgos técnicos o comparativa semántica.' 
                            : 'The auditor has full context of this contract and provider history. Ask about legality, technical risks, or semantic comparison.'}
                        </div>
                        
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

              <div className="p-8 border-t-2 border-[#F2F2F2] bg-white flex gap-6 mt-auto shrink-0">
                <button onClick={handleExportCSV} className="gov-button flex-1 h-14 flex items-center justify-center gap-3">
                  <Download size={18} /> {lang === 'ES' ? 'DESCARGAR DOSSIER PROBATORIO' : 'DOWNLOAD EVIDENCE DOSSIER'}
                </button>
                <button 
                  onClick={() => window.open('https://www.contraloria.gov.co/denuncias', '_blank')}
                  className="gov-button-outline flex-1 h-14 flex items-center justify-center gap-3"
                >
                  <ExternalLink size={18} /> {lang === 'ES' ? 'NOTIFICAR A LA CONTRALORÍA' : 'REPORT TO CONTRALORÍA'}
                </button>
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
              ? 'La vista principal ahora se comporta como una sala de control: prioriza expedientes, muestra trazabilidad estilo OCDS y sugiere el siguiente paso verificable.'
              : 'The main view now behaves like a control room: it prioritizes cases, shows OCDS-style traceability, and suggests the next verifiable step.'}
          </p>
        </div>
        <div className="bg-[#f0f7ff] border border-[#004884]/10 p-5 min-w-48">
          <p className="header-label !text-gray-400">{isEs ? 'Cobertura ciclo OCDS' : 'OCDS lifecycle coverage'}</p>
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
            <p className="header-label !mb-0">{isEs ? 'Trazabilidad OCDS' : 'OCDS traceability'}</p>
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
              ? 'Brecha clave: evidencia de ejecucion. Para ser clase mundial, el siguiente salto es conectar fotos, interventoria, pagos y avance fisico.'
              : 'Key gap: implementation evidence. To become best-in-class, the next leap is connecting photos, oversight, payments, and physical progress.'}
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
                {isEs ? 'Conectado al Panel de Auditoria' : 'Connected to the Audit Panel'}
              </h3>
              <p className="text-sm text-gray-500 font-medium max-w-3xl">
                {hasPanelData
                  ? (isEs
                    ? `La red esta leyendo ${panelState.connectedFindings} hallazgo(s), ${panelState.highRiskFindings} alerta(s) rojas y ${formatCompactCop(panelState.totalExposure)} de exposicion fiscal activa.`
                    : `The network is reading ${panelState.connectedFindings} finding(s), ${panelState.highRiskFindings} red alert(s), and ${formatCompactCop(panelState.totalExposure)} in active fiscal exposure.`)
                  : (isEs
                    ? 'Ejecuta una busqueda para alimentar el panel; el centro analitico usara esos hallazgos como contexto vivo.'
                    : 'Run a search to feed the panel; the analytic hub will use those findings as live context.')}
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
                    Total de auditorías y simulaciones procesadas por la red neural.
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
                    Nivel de precisión actual tras el entrenamiento autónomo.
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-6">
          <h4 className="header-label">{t.logic_feed}</h4>
          <div className="bg-white border border-[#E6E6E6] p-6 h-[400px] overflow-y-auto custom-scrollbar font-mono text-[10px] text-gray-500 space-y-2 shadow-inner">
            {logs.length > 0 ? logs.map((log, i) => (
              <p key={i} className={cn(log.status === 'COMPLETED' ? "text-emerald-600" : "text-gray-700")}>
                [{new Date(log.timestamp).toLocaleTimeString()}] [{log.agent}] {log.message}
              </p>
            )) : (
              <p className="opacity-30">SIN ACTIVIDAD REGISTRADA EN ÉSTA SESIÓN</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="header-label">{t.cluster_viz}</h4>
          <div className="bg-white border border-[#E6E6E6] p-2 shadow-sm h-full overflow-hidden">
            <AgentOffice logs={logs} />
          </div>
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
                  {isEs ? 'Configuracion, red e inteligencia' : 'Configuration, network and intelligence'}
                </h3>
                <p className="text-sm text-gray-500 font-medium max-w-3xl">
                  {isEs
                    ? 'Lo tecnico vive aqui para no contaminar el flujo principal de auditoria. El usuario opera desde el panel; el equipo experto calibra desde esta consola.'
                    : 'Technical operations live here so they do not pollute the main audit flow. Users work from the panel; expert teams calibrate here.'}
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
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <div className="bg-white border border-[#E6E6E6] p-6 space-y-4">
                      <p className="header-label">{isEs ? 'Bitacora tecnica' : 'Technical log'}</p>
                      <div className="h-[55vh] overflow-y-auto custom-scrollbar font-mono text-[10px] text-gray-500 space-y-2">
                        {logs.length > 0 ? logs.map((log, i) => (
                          <p key={`${log.timestamp}-${i}`} className={cn(log.status === 'COMPLETED' ? "text-emerald-600" : "text-gray-700")}>
                            [{new Date(log.timestamp).toLocaleTimeString()}] [{log.agent}] {log.message}
                          </p>
                        )) : (
                          <p className="opacity-40 uppercase">{isEs ? 'Sin actividad tecnica en esta sesion' : 'No technical activity in this session'}</p>
                        )}
                      </div>
                    </div>
                    <div className="bg-white border border-[#E6E6E6] p-6 space-y-4">
                      <p className="header-label">{isEs ? 'Simulacion multiagente' : 'Multi-agent simulation'}</p>
                      <AgentOffice logs={logs} />
                    </div>
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

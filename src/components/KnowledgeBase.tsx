
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Book, Scale, ShieldAlert, Cpu, 
  RefreshCcw, Search, ChevronRight,
  Gavel, Info, AlertTriangle, Zap,
  History, Network
} from 'lucide-react';
import { cn } from '../lib/utils';
import { LEGAL_FRAMEWORK, getActiveRules, IntelligenceRule, learnFromFindings } from '../lib/intelligence';
import { AnalysisResult } from '../lib/analysis';

interface KnowledgeBaseProps {
  results: AnalysisResult[];
  onRetroactiveAudit: () => void;
  lang: 'ES' | 'EN';
}

export function KnowledgeBase({ results, onRetroactiveAudit, lang }: KnowledgeBaseProps) {
  const [activeTab, setActiveTab] = useState<'LAWS' | 'RULES' | 'INSIGHTS'>('LAWS');
  const [isSyncing, setIsSyncing] = useState(false);
  const [discoveredPattern, setDiscoveredPattern] = useState<IntelligenceRule | null>(null);

  const activeRules = getActiveRules();

  const handleSelfLearning = () => {
    setIsSyncing(true);
    setTimeout(() => {
      const newRule = learnFromFindings(results);
      if (newRule) {
        setDiscoveredPattern(newRule);
        setTimeout(() => setDiscoveredPattern(null), 5000);
      }
      setIsSyncing(false);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#fafafa] font-sans">
      {/* Header */}
      <div className="p-8 bg-white border-b border-gray-100 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-[#004884] rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-[#004884] uppercase tracking-widest leading-none">Thegu Neural Core // Knowledge</span>
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Base de Inteligencia</h2>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleSelfLearning}
            disabled={isSyncing}
            className="h-14 px-6 border-2 border-black flex items-center gap-3 text-[10px] font-black uppercase hover:bg-black hover:text-white transition-all disabled:opacity-50"
          >
            <Cpu size={16} className={cn(isSyncing && "animate-spin")} />
            {isSyncing ? "PROCESANDO..." : "AUTO-APRENDIZAJE"}
          </button>
          <button 
            onClick={onRetroactiveAudit}
            className="h-14 px-6 bg-[#004884] text-white flex items-center gap-3 text-[10px] font-black uppercase hover:bg-black transition-all"
          >
            <RefreshCcw size={16} />
            AUDITORÍA RETROACTIVA
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-white">
        {(['LAWS', 'RULES', 'INSIGHTS'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative",
              activeTab === tab ? "text-[#004884]" : "text-gray-400 hover:text-gray-600"
            )}
          >
            {tab === 'LAWS' ? 'Marco Legal' : tab === 'RULES' ? 'Reglas Forenses' : 'Inferencias IA'}
            {activeTab === tab && (
              <motion.div layoutId="kb-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#004884]" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-gray-50/50">
        <AnimatePresence mode="wait">
          {activeTab === 'LAWS' && (
            <motion.div 
              key="laws"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {LEGAL_FRAMEWORK.map((law) => (
                <div key={law.id} className="bg-white p-6 border-2 border-gray-100 hover:border-[#004884] group transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-gray-50 text-[#004884] group-hover:bg-[#004884] group-hover:text-white transition-colors">
                      <Scale size={20} />
                    </div>
                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{law.category}</span>
                  </div>
                  <h3 className="text-sm font-black text-gray-900 uppercase mb-3">{law.title}</h3>
                  <p className="text-[11px] text-gray-500 leading-relaxed font-serif italic mb-4">
                    "{law.summary}"
                  </p>
                  <div className="flex items-center gap-2 text-[8px] font-black text-[#004884] border-t border-gray-50 pt-4 cursor-pointer hover:gap-3 transition-all">
                    VER JURISPRUDENCIA COMPLETA <ChevronRight size={12} />
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'RULES' && (
            <motion.div 
              key="rules"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {activeRules.map((rule) => (
                <div key={rule.id} className={cn("bg-white p-6 border-l-4 shadow-sm flex items-center justify-between", rule.isLearned ? "border-purple-500" : "border-[#004884]")}>
                  <div className="flex items-start gap-4">
                    <div className={cn("p-3 bg-gray-50", rule.isLearned ? "text-purple-500" : "text-[#004884]")}>
                      {rule.isLearned ? <Zap size={20} /> : <ShieldAlert size={20} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-black text-gray-900 uppercase">{rule.name}</h3>
                        {rule.isLearned && (
                          <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[8px] font-black uppercase rounded">Auto-Generada</span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-600 mb-2">{rule.description}</p>
                      <div className="flex items-center gap-4 text-[9px] font-mono text-gray-400 uppercase">
                        <span>Origen: {rule.source}</span>
                        <span>Peso: {rule.riskWeight}%</span>
                        {rule.discoveredAt && <span>Detectada: {new Date(rule.discoveredAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'INSIGHTS' && (
            <motion.div 
              key="insights"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center p-20 text-center"
            >
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 text-gray-300">
                <Network size={48} />
              </div>
              <h3 className="text-xl font-black text-gray-900 uppercase mb-2">Red de Inferencia Neuronal</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                El sistema está analizando patrones en tiempo real. Las inferencias se generan cuando el Auditor, Validador y Sentinel encuentran recurrencias semánticas no listadas en el marco legal.
              </p>
              
              <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
                 <div className="p-6 bg-[#004884] text-white rounded-xl text-left border-4 border-[#FCD059]">
                    <History size={24} className="mb-4 opacity-50" />
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Histórico Forense</p>
                    <p className="text-lg font-bold">Sin anomalías globales detectadas en este ciclo.</p>
                 </div>
                 <div className="p-6 bg-white border-2 border-gray-100 rounded-xl text-left">
                    <Zap size={24} className="mb-4 text-[#004884]" />
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-gray-400">Predicción de Riesgo</p>
                    <p className="text-lg font-bold text-gray-800">Próximos clusters críticos en: Sector Salud (Guajira).</p>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {discoveredPattern && (
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] bg-purple-600 text-white p-6 rounded-2xl shadow-2xl border-4 border-white flex items-center gap-6"
        >
          <div className="p-4 bg-white/20 rounded-xl">
             <Zap size={32} className="text-white animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-1">¡NUEVA REGLA AUTO-GENERADA!</p>
            <p className="text-lg font-bold">{discoveredPattern.name}</p>
            <p className="text-[10px] opacity-70 italic">Los agentes han aprendido un nuevo modo de evasión. Aplicando retroactivamente...</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Cpu, History, Info, RefreshCcw, Scale, ShieldAlert, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { LEGAL_FRAMEWORK, getActiveRules, IntelligenceRule } from '../lib/intelligence';
import { AnalysisResult } from '../lib/analysis';

interface KnowledgeBaseProps {
  results: AnalysisResult[];
  onRetroactiveAudit: () => void;
  onSelfLearning: () => Promise<IntelligenceRule | null>;
  lang: 'ES' | 'EN';
}

function Tooltip({ text }: { text: string }) {
  return (
    <div className="relative group/tooltip">
      <Info size={12} className="text-gray-300" />
      <div className="absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 bg-[#111827] p-3 text-[10px] leading-relaxed text-white opacity-0 shadow-xl transition-opacity group-hover/tooltip:opacity-100 pointer-events-none">
        {text}
      </div>
    </div>
  );
}

export function KnowledgeBase({ results, onRetroactiveAudit, onSelfLearning, lang }: KnowledgeBaseProps) {
  const [activeTab, setActiveTab] = useState<'FRAMEWORK' | 'LEARNING' | 'RETRO'>('FRAMEWORK');
  const [isSyncing, setIsSyncing] = useState(false);
  const [discoveredPattern, setDiscoveredPattern] = useState<IntelligenceRule | null>(null);
  const isEs = lang === 'ES';

  const activeRules = getActiveRules();
  const learnedRules = useMemo(() => activeRules.filter((rule) => rule.isLearned), [activeRules]);
  const recurringFlags = useMemo(() => {
    const counts = new Map<string, number>();
    results.forEach((result) => {
      result.redFlags.forEach((flag) => {
        counts.set(flag, (counts.get(flag) || 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [results]);

  const handleSelfLearning = () => {
    setIsSyncing(true);
    setTimeout(() => {
      onSelfLearning()
        .then((newRule) => {
          if (newRule) {
            setDiscoveredPattern(newRule);
            setTimeout(() => setDiscoveredPattern(null), 5000);
          }
        })
        .finally(() => setIsSyncing(false));
    }, 600);
  };

  return (
    <div className="flex h-full flex-col bg-[#fafafa] font-sans">
      <div className="border-b border-gray-100 bg-white p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#004884] animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#004884]">
                {isEs ? 'Motor de criterio y memoria' : 'Criteria and memory engine'}
              </span>
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tight text-gray-900">
              {isEs ? 'Base de decision explicable' : 'Explainable decision base'}
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-gray-500">
              {isEs
                ? 'Aqui se ve que reglas sustentan el analisis, que aprende el sistema a partir de hallazgos repetidos y como se reevalua el historial cuando aparece un nuevo patron.'
                : 'This is where the system exposes its rules, what it learns from repeated findings, and how it re-scores history when a new pattern appears.'}
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <button
              onClick={handleSelfLearning}
              disabled={isSyncing}
              title={isEs ? 'Aprende nuevos patrones recurrentes a partir de hallazgos ya cargados.' : 'Learns recurring patterns from currently loaded findings.'}
              className="flex h-14 items-center gap-3 border-2 border-black px-6 text-[10px] font-black uppercase transition-all hover:bg-black hover:text-white disabled:opacity-50"
            >
              <Cpu size={16} className={cn(isSyncing && 'animate-spin')} />
              {isEs ? (isSyncing ? 'Actualizando patron...' : 'Activar autoaprendizaje') : (isSyncing ? 'Learning pattern...' : 'Run self-learning')}
            </button>
            <button
              onClick={onRetroactiveAudit}
              title={isEs ? 'Recalifica los hallazgos cargados usando los patrones aprendidos en memoria.' : 'Re-scores the loaded findings using the learned patterns in memory.'}
              className="flex h-14 items-center gap-3 bg-[#004884] px-6 text-[10px] font-black uppercase text-white transition-all hover:bg-black"
            >
              <RefreshCcw size={16} />
              {isEs ? 'Ejecutar auditoria retroactiva' : 'Run retroactive audit'}
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              icon: ShieldAlert,
              title: isEs ? 'Reglas activas' : 'Active rules',
              value: activeRules.length,
              tip: isEs ? 'Suma de reglas base mas reglas aprendidas disponibles para el scoring.' : 'Sum of baseline and learned rules available to the scoring engine.',
            },
            {
              icon: Sparkles,
              title: isEs ? 'Patrones aprendidos' : 'Learned patterns',
              value: learnedRules.length,
              tip: isEs ? 'Reglas nuevas generadas al detectar recurrencias en hallazgos cargados.' : 'New rules generated when the system finds recurring patterns in loaded findings.',
            },
            {
              icon: History,
              title: isEs ? 'Expedientes cargados' : 'Loaded cases',
              value: results.length,
              tip: isEs ? 'Casos disponibles para revisar, aprender y recalificar en esta sesion.' : 'Cases available to review, learn from, and re-score in this session.',
            },
          ].map((item) => (
            <div key={item.title} className="border border-gray-100 bg-gray-50 p-5">
              <div className="flex items-center justify-between">
                <item.icon size={18} className="text-[#004884]" />
                <Tooltip text={item.tip} />
              </div>
              <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-gray-400">{item.title}</p>
              <p className="mt-2 text-3xl font-black text-[#333333]">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex border-b border-gray-100 bg-white">
        {[
          { id: 'FRAMEWORK' as const, label: isEs ? 'Marco y reglas' : 'Framework and rules' },
          { id: 'LEARNING' as const, label: isEs ? 'Autoaprendizaje' : 'Self-learning' },
          { id: 'RETRO' as const, label: isEs ? 'Revision retroactiva' : 'Retroactive review' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'relative px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all',
              activeTab === tab.id ? 'text-[#004884]' : 'text-gray-400 hover:text-gray-700'
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="kb-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#004884]" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50/50 p-8 custom-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === 'FRAMEWORK' && (
            <motion.div
              key="framework"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {LEGAL_FRAMEWORK.map((law) => (
                  <div key={law.id} className="border-2 border-gray-100 bg-white p-6 transition-all hover:border-[#004884]">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="bg-gray-50 p-2 text-[#004884]">
                        <Scale size={18} />
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">{law.category}</span>
                    </div>
                    <h3 className="text-sm font-black uppercase text-gray-900">{law.title}</h3>
                    <p className="mt-3 text-[11px] italic leading-relaxed text-gray-500">"{law.summary}"</p>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                {activeRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={cn(
                      'flex items-start justify-between gap-4 border-l-4 bg-white p-6 shadow-sm',
                      rule.isLearned ? 'border-fuchsia-500' : 'border-[#004884]'
                    )}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black uppercase text-gray-900">{rule.name}</h4>
                        {rule.isLearned && (
                          <span className="rounded bg-fuchsia-100 px-2 py-1 text-[8px] font-black uppercase text-fuchsia-700">
                            {isEs ? 'Aprendida' : 'Learned'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] leading-relaxed text-gray-600">{rule.description}</p>
                    </div>
                    <div className="text-right text-[10px] uppercase tracking-widest text-gray-400">
                      <p>{isEs ? 'Peso' : 'Weight'}: {rule.riskWeight}%</p>
                      <p>{isEs ? 'Origen' : 'Source'}: {rule.source}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'LEARNING' && (
            <motion.div
              key="learning"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="grid grid-cols-1 gap-8 xl:grid-cols-[1.1fr_1fr]"
            >
              <div className="space-y-6 border border-[#E6E6E6] bg-white p-8">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#004884]">
                    {isEs ? 'Que hace este modulo' : 'What this module does'}
                  </p>
                  <h3 className="text-2xl font-black uppercase text-[#333333]">
                    {isEs ? 'Autoaprendizaje sobre hallazgos reales' : 'Self-learning from real findings'}
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-gray-600">
                  {isEs
                    ? 'El modulo revisa los hallazgos cargados, busca recurrencias reales y, si encuentra un patron repetido al menos dos veces, crea una regla aprendida que queda disponible para sesiones futuras.'
                    : 'The module reviews the loaded findings, looks for real recurrences, and if it finds a repeated pattern at least twice, creates a learned rule for future sessions.'}
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {[
                    { label: isEs ? 'Hallazgos revisados' : 'Findings reviewed', value: results.length },
                    { label: isEs ? 'Reglas aprendidas' : 'Learned rules', value: learnedRules.length },
                    { label: isEs ? 'Patrones repetidos' : 'Repeated patterns', value: recurringFlags.length },
                  ].map((item) => (
                    <div key={item.label} className="border border-gray-100 bg-gray-50 p-4">
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{item.label}</p>
                      <p className="mt-2 text-2xl font-black text-[#004884]">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="border border-[#E6E6E6] bg-white p-6">
                  <div className="flex items-center gap-3">
                    <BookOpen size={16} className="text-[#004884]" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#004884]">
                      {isEs ? 'Patrones recurrentes detectados' : 'Detected recurring patterns'}
                    </p>
                  </div>
                  <div className="mt-5 space-y-3">
                    {recurringFlags.length > 0 ? recurringFlags.map(([flag, count]) => (
                      <div key={flag} className="border border-gray-100 bg-gray-50 p-4">
                        <p className="text-[11px] font-black uppercase text-[#333333]">{flag}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-widest text-gray-400">
                          {count} {isEs ? 'apariciones en esta sesion' : 'appearances in this session'}
                        </p>
                      </div>
                    )) : (
                      <p className="text-sm text-gray-500">
                        {isEs ? 'Aun no hay suficiente repeticion para consolidar un patron aprendido.' : 'There is not enough repetition yet to consolidate a learned pattern.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'RETRO' && (
            <motion.div
              key="retro"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="grid grid-cols-1 gap-8 xl:grid-cols-[1.1fr_1fr]"
            >
              <div className="border border-[#E6E6E6] bg-white p-8 space-y-5">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#004884]">
                    {isEs ? 'Que hace este modulo' : 'What this module does'}
                  </p>
                  <h3 className="text-2xl font-black uppercase text-[#333333]">
                    {isEs ? 'Auditoria retroactiva del historial cargado' : 'Retroactive audit of loaded history'}
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-gray-600">
                  {isEs
                    ? 'Cuando existe memoria aprendida, este modulo vuelve a recorrer los resultados ya cargados, cruza cada expediente con los nuevos patrones y recalcula su puntaje para no dejar hallazgos subestimados.'
                    : 'When learned memory exists, this module revisits the loaded results, compares each case against the new patterns, and recalculates the score so no finding remains understated.'}
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {[
                    { label: isEs ? 'Casos reevaluables' : 'Re-scoreable cases', value: results.length },
                    { label: isEs ? 'Alertas rojas' : 'Red alerts', value: results.filter((item) => item.risk === 'Red').length },
                    { label: isEs ? 'Promedio de riesgo' : 'Average risk', value: results.length ? `${Math.round(results.reduce((acc, item) => acc + item.riskScore, 0) / results.length)}%` : '0%' },
                  ].map((item) => (
                    <div key={item.label} className="border border-gray-100 bg-gray-50 p-4">
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{item.label}</p>
                      <p className="mt-2 text-2xl font-black text-[#004884]">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-[#E6E6E6] bg-white p-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#004884]">
                  {isEs ? 'Que cambia despues de correrla' : 'What changes after running it'}
                </p>
                <div className="mt-5 space-y-3">
                  {[
                    isEs ? 'Actualiza el puntaje de riesgo usando memoria aprendida.' : 'Updates the risk score using learned memory.',
                    isEs ? 'Anade nuevas banderas rojas cuando el patron coincide.' : 'Adds new red flags when the pattern matches.',
                    isEs ? 'Refresca la cache local del tablero con el nuevo estado.' : 'Refreshes the local dashboard cache with the updated state.',
                  ].map((item) => (
                    <div key={item} className="border border-gray-100 bg-gray-50 p-4 text-sm font-medium leading-relaxed text-gray-700">
                      {item}
                    </div>
                  ))}
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
          className="fixed bottom-8 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-5 rounded-2xl border-4 border-white bg-[#004884] p-6 text-white shadow-2xl"
        >
          <div className="rounded-xl bg-white/15 p-4">
            <Sparkles size={28} className="animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest">
              {isEs ? 'Nueva regla incorporada' : 'New rule incorporated'}
            </p>
            <p className="mt-1 text-lg font-bold">{discoveredPattern.name}</p>
            <p className="mt-1 text-[11px] text-white/70">
              {isEs ? 'Queda disponible para futuras revisiones y auditoria retroactiva.' : 'It is now available for future reviews and retroactive audit.'}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

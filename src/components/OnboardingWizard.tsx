import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, ShieldAlert, FileText, BarChart3, MessageSquare, ChevronRight, ChevronLeft, Sparkles, Scale, Database, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  onClose: () => void;
  lang: 'ES' | 'EN';
}

const STEPS_ES = [
  {
    icon: <Sparkles className="w-10 h-10 text-cyan-400" />,
    title: 'GobIA Auditor',
    subtitle: 'Plataforma de analítica forense de contratación pública',
    body: 'Detecta patrones de corrupción, fraccionamiento y abuso en contratos del Estado colombiano usando inteligencia artificial que corre completamente en tu equipo — sin enviar datos a servidores externos.',
    visual: (
      <div className="flex gap-3 mt-4 justify-center flex-wrap">
        {['🔍 SECOP II', '🧠 IA Local', '⚖️ RAG Jurídico', '📄 Informe PDF'].map(tag => (
          <span key={tag} className="px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-700/40 text-cyan-300 text-xs font-mono">{tag}</span>
        ))}
      </div>
    ),
  },
  {
    icon: <Search className="w-10 h-10 text-blue-400" />,
    title: 'Paso 1 — Buscar entidad',
    subtitle: 'Conecta con SECOP II en tiempo real',
    body: 'Escribe el nombre de una entidad pública (ej: "UNGRD", "CARDIQUE", "ALCALDIA DE RIOHACHA") en el campo de búsqueda. El sistema consulta hasta 100 contratos recientes directamente desde datos.gov.co.',
    visual: (
      <div className="mt-4 bg-slate-900/80 border border-slate-700 rounded-lg p-3 font-mono text-sm text-left">
        <span className="text-slate-500">{'>'} Entidad: </span>
        <span className="text-cyan-300">UNGRD</span>
        <span className="animate-pulse text-cyan-400">█</span>
        <div className="mt-2 text-xs text-slate-500">→ Recupera 100 contratos de SECOP II</div>
      </div>
    ),
  },
  {
    icon: <ShieldAlert className="w-10 h-10 text-orange-400" />,
    title: 'Paso 2 — Revisar resultados',
    subtitle: 'Grupos de proveedores ordenados por riesgo',
    body: 'Los contratos se agrupan por NIT del proveedor. Cada grupo recibe un puntaje 0–100 calculado por 4 reglas forenses: abuso de directa, sincronía temporal, entidades notorias y saltos de valor.',
    visual: (
      <div className="mt-4 space-y-2">
        {[
          { color: 'bg-red-500', label: '🔴 Riesgo Crítico', score: '87/100', pct: '87%' },
          { color: 'bg-orange-500', label: '🟠 Riesgo Elevado', score: '55/100', pct: '55%' },
          { color: 'bg-emerald-500', label: '🟢 Riesgo Bajo', score: '22/100', pct: '22%' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3 text-xs">
            <span className="text-slate-300 w-40">{item.label}</span>
            <div className="flex-1 bg-slate-700 rounded-full h-2">
              <div className={cn('h-2 rounded-full', item.color)} style={{ width: item.pct }} />
            </div>
            <span className="text-slate-400 w-12 text-right font-mono">{item.score}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: <FileText className="w-10 h-10 text-violet-400" />,
    title: 'Paso 3 — Abrir expediente',
    subtitle: 'Informe forense generado por IA',
    body: 'Haz clic en cualquier tarjeta para abrir el expediente. El sistema ejecuta el pipeline RAG: recupera normas jurídicas relevantes (Ley 80, Ley 1474, OCDE) y genera un informe narrativo con qwen3:4b.',
    visual: (
      <div className="mt-4 bg-slate-900/80 border border-violet-800/40 rounded-lg p-3 text-xs text-left space-y-1 font-mono">
        <div className="text-violet-400">▶ RAG jurídico activado</div>
        <div className="text-slate-400 pl-2">↳ Ley 80/93 Art.24-25 · score: 0.94</div>
        <div className="text-slate-400 pl-2">↳ Ley 1474/11 Art.90 · score: 0.87</div>
        <div className="text-violet-400 mt-1">▶ Generando informe forense…</div>
        <div className="text-emerald-400 pl-2">↳ qwen3:4b · 487 tokens</div>
      </div>
    ),
  },
  {
    icon: <MessageSquare className="w-10 h-10 text-emerald-400" />,
    title: 'Paso 4 — Preguntar al Auditor IA',
    subtitle: 'Chat contextual sobre el expediente',
    body: 'Dentro del expediente encontrarás el Asistente de Navegación — un chatbot que conoce todo el sistema, la normativa colombiana y los contratos de la sesión actual. Puedes hacerle cualquier pregunta.',
    visual: (
      <div className="mt-4 bg-slate-900/80 border border-emerald-800/40 rounded-lg p-3 text-xs text-left space-y-2">
        <div className="flex gap-2">
          <span className="text-slate-500 shrink-0">Usuario:</span>
          <span className="text-slate-300">¿Qué norma aplica al fraccionamiento detectado?</span>
        </div>
        <div className="flex gap-2">
          <span className="text-emerald-400 shrink-0">Auditor:</span>
          <span className="text-slate-300">El Art.24 de la Ley 80/93 prohíbe expresamente…</span>
        </div>
      </div>
    ),
  },
  {
    icon: <BarChart3 className="w-10 h-10 text-amber-400" />,
    title: 'Paso 5 — Exportar evidencia',
    subtitle: 'PDF oficial y CSV de sesión',
    body: 'Exporta el informe forense completo como PDF con portada institucional, o descarga un CSV con todos los proveedores analizados en la sesión para análisis posterior.',
    visual: (
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-900/80 border border-amber-800/40 rounded-lg p-3 text-center">
          <div className="text-2xl mb-1">📄</div>
          <div className="text-amber-300 font-semibold">PDF Oficial</div>
          <div className="text-slate-500 mt-1">Informe forense completo con watermark</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-3 text-center">
          <div className="text-2xl mb-1">📊</div>
          <div className="text-slate-300 font-semibold">CSV Sesión</div>
          <div className="text-slate-500 mt-1">Todos los proveedores analizados</div>
        </div>
      </div>
    ),
  },
];

const STEPS_EN = STEPS_ES; // Could translate if needed

const STORAGE_KEY = 'gobiaauditor_wizard_done';

export function OnboardingWizard({ onClose, lang }: Props) {
  const [step, setStep] = useState(0);
  const steps = lang === 'ES' ? STEPS_ES : STEPS_EN;
  const current = steps[step];
  const isLast = step === steps.length - 1;

  function handleClose() {
    localStorage.setItem(STORAGE_KEY, '1');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header gradient */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-violet-500 to-emerald-500" />

        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step indicators */}
        <div className="flex gap-1.5 justify-center pt-6 px-6">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === step ? 'bg-cyan-400 w-8' : 'bg-slate-700 w-3 hover:bg-slate-600'
              )}
            />
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="p-8 pt-5"
          >
            <div className="text-center">
              <div className="flex justify-center mb-4">{current.icon}</div>
              <h2 className="text-xl font-bold text-white mb-1">{current.title}</h2>
              <p className="text-sm text-slate-400 mb-3">{current.subtitle}</p>
              <p className="text-sm text-slate-300 leading-relaxed">{current.body}</p>
              {current.visual}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 pb-6 gap-4">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {lang === 'ES' ? 'Anterior' : 'Back'}
          </button>

          <span className="text-xs text-slate-600 font-mono">{step + 1} / {steps.length}</span>

          {isLast ? (
            <button
              onClick={handleClose}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-colors"
            >
              {lang === 'ES' ? '¡Empezar auditoría!' : 'Start auditing!'}
              <Zap className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))}
              className="flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              {lang === 'ES' ? 'Siguiente' : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export function shouldShowWizard() {
  return !localStorage.getItem(STORAGE_KEY);
}

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, Loader2, ChevronDown, Sparkles, HelpCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';
import { NOTORIOUS_ENTITIES, LEGAL_FRAMEWORK, INITIAL_RULES } from '../lib/intelligence';
import { LEGAL_KNOWLEDGE_BASE } from '../lib/legalKnowledgeBase';
import type { AnalysisResult } from '../lib/analysis';
import type { Contract } from '../lib/secop';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Props {
  lang: 'ES' | 'EN';
  results: AnalysisResult[];
  selectedResult: AnalysisResult | null;
  entitySearch: string;
}

const QUICK_QUESTIONS_ES = [
  '¿Cómo se calcula el puntaje de riesgo?',
  '¿Qué es el fraccionamiento de contratos?',
  '¿Qué entidades están bajo vigilancia especial?',
  '¿Cómo funciona el RAG jurídico?',
  '¿Qué hace la Ley 80 de 1993?',
  '¿Cómo exporto el informe forense?',
];

const QUICK_QUESTIONS_EN = [
  'How is the risk score calculated?',
  'What is contract splitting (fraccionamiento)?',
  'Which entities are under special surveillance?',
  'How does the legal RAG work?',
  'How do I export the forensic report?',
];

function buildSystemContext(results: AnalysisResult[], selectedResult: AnalysisResult | null, entitySearch: string, lang: 'ES' | 'EN'): string {
  const isEs = lang === 'ES';
  const topResults = results.slice(0, 5).map(r =>
    `- ${r.providerName} | Riesgo: ${r.riskScore.toFixed(0)}/100 (${r.risk}) | Contratos: ${r.contracts.length} | Valor: $${r.totalValue.toLocaleString()} COP | Señales: ${r.redFlags.slice(0, 2).join('; ')}`
  ).join('\n');

  const rulesInfo = INITIAL_RULES.map(r =>
    `${r.name} (peso: ${r.riskWeight}, fuente: ${r.source}): ${r.description}`
  ).join('\n');

  const legalInfo = LEGAL_KNOWLEDGE_BASE.slice(0, 4).map(l =>
    `${l.source}: ${l.text.substring(0, 120)}...`
  ).join('\n');

  const notoriousInfo = NOTORIOUS_ENTITIES.slice(0, 6).join(', ');

  let sessionContext = '';
  if (results.length > 0) {
    sessionContext = isEs
      ? `\n\nSESIÓN ACTUAL — búsqueda: "${entitySearch}"\nProveedores analizados (${results.length} grupos):\n${topResults}`
      : `\n\nCURRENT SESSION — search: "${entitySearch}"\nAnalyzed providers (${results.length} groups):\n${topResults}`;
  }

  let expedientContext = '';
  if (selectedResult) {
    expedientContext = isEs
      ? `\n\nEXPEDIENTE ABIERTO: ${selectedResult.providerName}\nPuntaje: ${selectedResult.riskScore.toFixed(0)}/100 | Contratos: ${selectedResult.contracts.length} | Valor total: $${selectedResult.totalValue.toLocaleString()}\nSeñales detectadas: ${selectedResult.redFlags.join('; ')}`
      : `\n\nOPEN DOSSIER: ${selectedResult.providerName}\nScore: ${selectedResult.riskScore.toFixed(0)}/100 | Contracts: ${selectedResult.contracts.length} | Total value: $${selectedResult.totalValue.toLocaleString()}\nDetected signals: ${selectedResult.redFlags.join('; ')}`;
  }

  return isEs
    ? `Eres el Asistente de Navegación de GobIA Auditor, una plataforma de analítica forense de contratación pública colombiana.

SISTEMA:
- Stack: React 19 + Express + PostgreSQL (puerto 5433) + Ollama (localhost:11434)
- Modelos: qwen3:4b (principal), gemma4-fast (fallback), nomic-embed-text (embeddings)
- Fuente de datos: SECOP II — API Socrata de datos.gov.co

REGLAS FORENSES ACTIVAS:
${rulesInfo}

MARCO JURÍDICO:
${legalInfo}

ENTIDADES BAJO VIGILANCIA ESPECIAL: ${notoriousInfo}
${sessionContext}${expedientContext}

Responde siempre en español. Sé preciso, conciso y orientado a la acción forense. Si el usuario pregunta por contratos específicos de la sesión, usa los datos de contexto. Si no tienes información suficiente, dilo claramente.`
    : `You are the Navigation Assistant of GobIA Auditor, a forensic analytics platform for Colombian public procurement.

SYSTEM:
- Stack: React 19 + Express + PostgreSQL (port 5433) + Ollama (localhost:11434)
- Models: qwen3:4b (main), gemma4-fast (fallback), nomic-embed-text (embeddings)
- Data source: SECOP II — Socrata API from datos.gov.co

FORENSIC RULES:
${rulesInfo}

LEGAL FRAMEWORK:
${legalInfo}

ENTITIES UNDER SPECIAL SURVEILLANCE: ${notoriousInfo}
${sessionContext}${expedientContext}

Answer in English. Be precise, concise, and forensics-oriented.`;
}

async function callOllamaChat(systemPrompt: string, messages: Message[], lang: 'ES' | 'EN'): Promise<string> {
  const history = messages.slice(-6).map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }));

  const fullPrompt = `${systemPrompt}\n\n---\n${history.map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`).join('\n')}\nAsistente:`;

  try {
    const resp = await fetch('/api/ollama/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen3:4b',
        prompt: fullPrompt,
        stream: false,
        options: { temperature: 0.3, num_predict: 400 },
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return (data.response || '').trim();
  } catch {
    // Fallback to tinyllama
    try {
      const resp2 = await fetch('/api/ollama/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'tinyllama',
          prompt: `${messages[messages.length - 1]?.content || ''}`,
          stream: false,
          options: { num_predict: 200 },
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!resp2.ok) throw new Error('tinyllama failed');
      const data2 = await resp2.json();
      return (data2.response || '').trim();
    } catch {
      return lang === 'ES'
        ? 'Lo siento, el modelo de IA no está disponible en este momento. Verifica que Ollama esté corriendo (`ollama serve`) y que el modelo qwen3:4b esté descargado (`ollama pull qwen3:4b`).'
        : 'Sorry, the AI model is currently unavailable. Check that Ollama is running (`ollama serve`) and that qwen3:4b is downloaded.';
    }
  }
}

export function ChatAssistant({ lang, results, selectedResult, entitySearch }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isEs = lang === 'ES';

  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting: Message = {
        id: 'greeting',
        role: 'assistant',
        content: isEs
          ? `¡Hola! Soy el **Asistente de Navegación** de GobIA Auditor.\n\nPuedo ayudarte a:\n- Entender cómo funciona el sistema\n- Interpretar puntajes y señales de riesgo\n- Explicar la normativa jurídica aplicable\n- Analizar los contratos de tu sesión actual${results.length > 0 ? ` (**${results.length} proveedores** analizados)` : ''}\n\n¿En qué puedo ayudarte?`
          : `Hi! I'm the **Navigation Assistant** for GobIA Auditor.\n\nI can help you:\n- Understand how the system works\n- Interpret risk scores and signals\n- Explain applicable legal framework\n- Analyze contracts from your current session${results.length > 0 ? ` (**${results.length} providers** analyzed)` : ''}\n\nHow can I help you?`,
        timestamp: new Date(),
      };
      setMessages([greeting]);
    }
  }, [open]);

  useEffect(() => {
    if (open && !minimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open, minimized]);

  async function handleSend(text?: string) {
    const content = (text || input).trim();
    if (!content || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content, timestamp: new Date() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    const systemPrompt = buildSystemContext(results, selectedResult, entitySearch, lang);
    const response = await callOllamaChat(systemPrompt, updatedMessages, lang);

    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response || (isEs ? 'Sin respuesta del modelo.' : 'No response from model.'),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, assistantMsg]);
    setLoading(false);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }

  const quickQuestions = isEs ? QUICK_QUESTIONS_ES : QUICK_QUESTIONS_EN;

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-cyan-600 to-violet-700 shadow-lg shadow-cyan-900/50 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform group"
            title={isEs ? 'Asistente de Navegación' : 'Navigation Assistant'}
          >
            <MessageSquare className="w-6 h-6 text-white" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-slate-900" />
            {results.length > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -left-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 border border-slate-900"
              >
                {results.length}
              </motion.span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, originX: 1, originY: 1 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-h-[580px] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
            style={{ maxHeight: minimized ? 'auto' : 580 }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-600 to-violet-700 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white">
                  {isEs ? 'Asistente de Navegación' : 'Navigation Assistant'}
                </div>
                <div className="text-xs text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  {isEs ? 'GobIA Auditor · IA local' : 'GobIA Auditor · Local AI'}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMinimized(m => !m)}
                  className="text-slate-500 hover:text-slate-300 p-1 rounded transition-colors"
                >
                  <ChevronDown className={cn('w-4 h-4 transition-transform', minimized && 'rotate-180')} />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="text-slate-500 hover:text-slate-300 p-1 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <AnimatePresence>
              {!minimized && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="flex flex-col flex-1 min-h-0 overflow-hidden"
                >
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                    {messages.map(msg => (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex gap-2 items-start',
                          msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                        )}
                      >
                        <div className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                          msg.role === 'assistant'
                            ? 'bg-gradient-to-br from-cyan-600 to-violet-700'
                            : 'bg-slate-700'
                        )}>
                          {msg.role === 'assistant'
                            ? <Bot className="w-3 h-3 text-white" />
                            : <User className="w-3 h-3 text-slate-300" />
                          }
                        </div>
                        <div className={cn(
                          'max-w-[280px] rounded-xl px-3 py-2 text-xs leading-relaxed',
                          msg.role === 'assistant'
                            ? 'bg-slate-800 text-slate-200 rounded-tl-none'
                            : 'bg-cyan-900/60 text-slate-100 rounded-tr-none border border-cyan-800/40'
                        )}>
                          {msg.role === 'assistant' ? (
                            <div className="prose prose-invert prose-xs max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <span>{msg.content}</span>
                          )}
                        </div>
                      </div>
                    ))}

                    {loading && (
                      <div className="flex gap-2 items-start">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-600 to-violet-700 flex items-center justify-center shrink-0">
                          <Bot className="w-3 h-3 text-white" />
                        </div>
                        <div className="bg-slate-800 rounded-xl rounded-tl-none px-3 py-2">
                          <div className="flex gap-1 items-center h-4">
                            {[0, 1, 2].map(i => (
                              <motion.div
                                key={i}
                                className="w-1.5 h-1.5 rounded-full bg-slate-500"
                                animate={{ y: [0, -4, 0] }}
                                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Quick questions */}
                  {messages.length <= 1 && (
                    <div className="px-4 pb-2">
                      <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-wide font-semibold">
                        {isEs ? 'Preguntas frecuentes' : 'Quick questions'}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {quickQuestions.slice(0, 4).map(q => (
                          <button
                            key={q}
                            onClick={() => handleSend(q)}
                            className="text-[10px] px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors text-left"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Input */}
                  <div className="px-3 pb-3 shrink-0">
                    <form
                      onSubmit={e => { e.preventDefault(); handleSend(); }}
                      className="flex gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 focus-within:border-cyan-700/60 transition-colors"
                    >
                      <input
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder={isEs ? 'Pregunta sobre contratos, normas, el sistema…' : 'Ask about contracts, laws, the system…'}
                        disabled={loading}
                        className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-500 outline-none min-w-0"
                      />
                      <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="shrink-0 text-cyan-400 hover:text-cyan-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </form>
                    <p className="text-[9px] text-slate-600 mt-1.5 text-center">
                      {isEs ? 'Powered by Ollama · IA completamente local' : 'Powered by Ollama · Fully local AI'}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

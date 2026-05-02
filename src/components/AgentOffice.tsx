import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, Gavel, Activity, 
  Cpu, Globe, Terminal, Shield, 
  Briefcase, Landmark, Fingerprint, Zap, X,
  DollarSign, ShieldCheck, MapPin, Search,
  Box, Share2, Layers
} from 'lucide-react';
import { cn } from '../lib/utils';
import { AGENT_PERSONAS, AgentId } from '../lib/agents';
import { NeuralHologram } from './VoxelAgent';

interface AgentState {
  id: AgentId;
  pos: { x: number, y: number };
  activity: string;
  isWorking: boolean;
  thought?: string;
  energy: number;
  targetNode?: string;
}

interface Dialogue {
  from: AgentId;
  to: AgentId;
  message: string;
  type: 'REQUEST' | 'INFO' | 'ALERT';
}

export function AgentOffice({ logs }: { logs: any[] }) {
  const [agents, setAgents] = useState<Record<AgentId, AgentState>>({
    FORENSIC: { id: 'FORENSIC', pos: { x: 20, y: 30 }, activity: 'Idle', isWorking: false, energy: 80, targetNode: 'N2' },
    LEGAL: { id: 'LEGAL', pos: { x: 80, y: 30 }, activity: 'Idle', isWorking: false, energy: 95, targetNode: 'N1' },
    SYSTEM: { id: 'SYSTEM', pos: { x: 50, y: 80 }, activity: 'Standby', isWorking: false, energy: 100, targetNode: 'N3' },
    FINANCIAL: { id: 'FINANCIAL', pos: { x: 20, y: 70 }, activity: 'Idle', isWorking: false, energy: 90, targetNode: 'N5' },
    ETHICS: { id: 'ETHICS', pos: { x: 80, y: 70 }, activity: 'Monitoring', isWorking: false, energy: 85, targetNode: 'N4' },
    FIELD: { id: 'FIELD', pos: { x: 50, y: 20 }, activity: 'Standby', isWorking: false, energy: 75, targetNode: 'N3' },
  });

  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [activeAgent, setActiveAgent] = useState<AgentId | null>(null);
  const [tickerOffset, setTickerOffset] = useState(0);

  const nodes = [
    { id: 'N1', label: 'LEGAL_JURIS', x: 20, y: 20, icon: Landmark },
    { id: 'N2', label: 'SEC_AUDIT', x: 80, y: 20, icon: Shield },
    { id: 'N3', label: 'NEURAL_CORE', x: 50, y: 50, icon: Cpu },
    { id: 'N4', label: 'ETHICS_MAP', x: 85, y: 75, icon: Fingerprint },
    { id: 'N5', label: 'FISC_VAULT', x: 15, y: 80, icon: DollarSign },
  ];

  // Live Neural Stream Ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerOffset(prev => prev - 1);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Neural Interaction - Now uses real log context
  useEffect(() => {
    const interval = setInterval(() => {
      const allAgentIds = Object.keys(agents) as AgentId[];
      if (Math.random() > 0.4) {
        const from = allAgentIds[Math.floor(Math.random() * allAgentIds.length)];
        const possibleTargets = allAgentIds.filter(a => a !== from);
        const to = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
        
        // Dynamic message based on recent findings if available
        const lastFindings = logs.slice(-5).map(l => l.message);
        const contextMsg = lastFindings.length > 0 ? lastFindings[Math.floor(Math.random() * lastFindings.length)] : null;

        const dialogs: Record<AgentId, string[]> = {
          FORENSIC: [
            contextMsg ? `Reviewing: ${contextMsg.slice(0, 30)}...` : "Scanning semantic clusters.",
            "Found anomaly in signature group.",
            "Cross-referencing with FIELD logs."
          ],
          LEGAL: [
            "This violates clause L1 of Ley 80.",
            "Ethics, check the provider ownership.",
            "Nexus confirmed on this node."
          ],
          SYSTEM: [
            "Neural weights optimized.",
            "Broadcast active. High integrity detected.",
            "Syncing all node states."
          ],
          FINANCIAL: [
            "Capital flow suspect in this cluster.",
            "Variance exceeds 45%. Alerting LEGAL.",
            "Following the money trail."
          ],
          ETHICS: [
            "Nexus found with political entity.",
            "Integrity score dropping.",
            "LEGAL, flag this entity immediately."
          ],
          FIELD: [
            "Terrestrial verification failed.",
            "Coordinate mismatch on project site.",
            "Syncing ground data."
          ],
        };

        const messages = dialogs[from] || ["Active."];
        
        setDialogue({ 
          from, to, 
          message: messages[Math.floor(Math.random() * messages.length)],
          type: Math.random() > 0.8 ? 'ALERT' : 'INFO'
        });
        setTimeout(() => setDialogue(null), 4000);
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [agents, logs]);

  useEffect(() => {
    if (logs.length === 0) return;
    const lastLog = logs[logs.length - 1];
    
    setAgents(prev => {
      const newState = { ...prev };
      const agentId = lastLog.agent as AgentId;
      
      if (newState[agentId]) {
        newState[agentId] = {
          ...newState[agentId],
          activity: lastLog.status,
          isWorking: lastLog.status !== 'COMPLETED',
          thought: lastLog.message,
          energy: Math.max(10, newState[agentId].energy - (lastLog.status === 'COMPLETED' ? -5 : 2))
        };

        // Move logic based on task
        if (lastLog.status === 'THINKING') {
          newState[agentId].pos = { x: 50, y: 50 };
        } else if (lastLog.status === 'EXECUTING') {
          // Shuffle position slightly
          newState[agentId].pos = { 
            x: Math.random() * 60 + 20, 
            y: Math.random() * 60 + 20 
          };
        }
      }
      return newState;
    });
  }, [logs]);

  return (
    <div className="relative w-full h-[600px] bg-[#020204] border border-white/5 overflow-hidden group font-sans">
      {/* 3D Neural Environment */}
      <div className="absolute inset-0 perspective-[2000px]">
        <div className="absolute inset-0 origin-bottom transform rotateX-[55deg] translate-y-[-10%] opacity-20">
          <div className="w-full h-full" style={{ 
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', 
            backgroundSize: '40px 40px' 
          }} />
        </div>
        
        {/* Glowing Neural Channels */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <motion.div 
              key={i}
              animate={{ 
                x: ['-100%', '200%'],
                opacity: [0, 0.4, 0]
              }}
              transition={{ duration: 3, delay: i * 0.8, repeat: Infinity, ease: "linear" }}
              className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#004884] to-transparent absolute"
              style={{ top: `${20 * i}%` }}
            />
          ))}
        </div>
      </div>

      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-[100] bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
            <span className="text-[10px] font-black text-white uppercase tracking-[0.4em]">NEURAL_OPS_ACTIVE</span>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                <Activity size={12} className="text-[#004884]" />
                <span className="text-[8px] font-mono text-zinc-500 uppercase">Load: 84%</span>
             </div>
             <div className="flex items-center gap-2">
                <Shield size={12} className="text-zinc-500" />
                <span className="text-[8px] font-mono text-zinc-500 uppercase">Integrity: Shield-X</span>
             </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <div className="px-3 py-1 bg-[#004884]/10 border border-[#004884]/30 flex items-center gap-2 rounded-sm backdrop-blur-md">
            <Fingerprint size={12} className="text-[#004884]" />
            <span className="text-[8px] font-mono text-[#004884] uppercase">Secure Node: Gov-CO-AX1</span>
          </div>
          <AnimatePresence mode="wait">
             <motion.p 
               key={logs[logs.length-1]?.message}
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               className="text-[9px] font-mono text-zinc-400 max-w-sm text-right"
             >
               FETCH: {logs[logs.length-1]?.message?.slice(0, 50)}...
             </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Neural Node Points */}
      {nodes.map(node => {
        const NodeIcon = node.icon;
        return (
          <div 
            key={node.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 opacity-40 hover:opacity-100 transition-opacity"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <div className="p-2 border border-white/10 bg-black/40 backdrop-blur-md rounded-lg">
              <NodeIcon size={16} className="text-zinc-500" />
            </div>
            <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">{node.label}</span>
          </div>
        );
      })}

      {/* Schematic Grid */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Cyber Fog / Atmosphere */}
      <div className="absolute inset-0 bg-radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.8) 100%) pointer-events-none" />

      {/* Connection Lines (Dynamic Neural Link) */}
      <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none">
        {nodes.map(n => (
          <line key={n.id} x1={`${n.x}%`} y1={`${n.y}%`} x2="50%" y2="50%" stroke="white" strokeWidth="0.5" />
        ))}
        <AnimatePresence>
          {dialogue && (
            <motion.line 
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ 
                pathLength: 1, 
                opacity: 1,
                strokeDashoffset: [0, -20]
              }}
              exit={{ opacity: 0 }}
              transition={{
                pathLength: { duration: 0.5 },
                strokeDashoffset: { duration: 1, repeat: Infinity, ease: "linear" }
              }}
              x1={`${agents[dialogue.from].pos.x}%`} 
              y1={`${agents[dialogue.from].pos.y}%`} 
              x2={`${agents[dialogue.to].pos.x}%`} 
              y2={`${agents[dialogue.to].pos.y}%`} 
              stroke={AGENT_PERSONAS[dialogue.from as keyof typeof AGENT_PERSONAS].color} 
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          )}
        </AnimatePresence>
      </svg>

      {/* Dialogue Bubble (Inter-Agent) */}
      <AnimatePresence>
        {dialogue && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute z-100 bg-black/80 border border-white/20 p-3 rounded-lg shadow-2xl backdrop-blur-md"
            style={{ 
              left: `${(agents[dialogue.from].pos.x + agents[dialogue.to].pos.x) / 2}%`, 
              top: `${(agents[dialogue.from].pos.y + agents[dialogue.to].pos.y) / 2}%`,
              transform: 'translate(-50%, -120%)'
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[8px] font-black uppercase text-white/50">{dialogue.from} → {dialogue.to}</span>
              <div className={cn("w-1 h-1 rounded-full animate-pulse", dialogue.type === 'REQUEST' ? "bg-red-500" : "bg-blue-500")} />
            </div>
            <p className="text-[10px] font-medium text-white italic tracking-tight italic">"{dialogue.message}"</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fixed Nodes */}
      {nodes.map(node => (
        <div 
          key={node.id}
          className="absolute flex flex-col items-center gap-2"
          style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}
        >
          <div className="w-2 h-2 bg-zinc-900 border border-white/10 rotate-45 shadow-[0_0_10px_rgba(255,255,255,0.05)]" />
          <span className="text-[6px] font-mono text-zinc-600 tracking-tighter uppercase whitespace-nowrap">{node.label}</span>
        </div>
      ))}

      {/* Agents */}
      {Object.entries(agents).map(([id, state]) => {
        const persona = AGENT_PERSONAS[id as keyof typeof AGENT_PERSONAS];
        let Icon = id === 'FORENSIC' ? Activity : id === 'LEGAL' ? Gavel : id === 'SYSTEM' ? Cpu : Fingerprint;
        if (id === 'FINANCIAL') Icon = DollarSign;
        if (id === 'ETHICS') Icon = ShieldCheck;
        if (id === 'FIELD') Icon = MapPin;
        
        const isFaded = activeAgent && activeAgent !== id;

        return (
          <motion.div
            key={id}
            initial={false}
            animate={{ 
              left: `${state.pos.x}%`, 
              top: `${state.pos.y}%`,
              scale: activeAgent === id ? 1.2 : 1,
              opacity: isFaded ? 0.3 : 1
            }}
            transition={{ type: 'spring', damping: 20, stiffness: 60 }}
            className="absolute z-50 flex flex-col items-center cursor-pointer"
            style={{ transform: 'translate(-50%, -50%)' }}
            onClick={() => setActiveAgent(activeAgent === (id as AgentId) ? null : (id as AgentId))}
          >
            <div className="flex flex-col items-center gap-2 group/agent">
              {/* Energy bar */}
              <div className="w-10 h-0.5 bg-zinc-800 rounded-full overflow-hidden mb-1">
                <motion.div 
                  initial={false}
                  animate={{ width: `${state.energy}%`, backgroundColor: state.energy < 30 ? '#ef4444' : persona.color }}
                  className="h-full"
                />
              </div>

              {/* Neural Hologram Representation */}
              <NeuralHologram 
                id={id}
                color={persona.color} 
                isWorking={state.isWorking} 
                className="mb-2"
              />
              
              <div className="text-center px-3 py-1 bg-black/80 backdrop-blur-md border border-white/10 shadow-2xl z-20 rounded-sm">
                <p className="text-[8px] font-black tracking-widest uppercase text-white mb-0.5">{persona.name}</p>
                <div className="flex items-center gap-1 justify-center">
                  <div className={cn("w-1 h-1 rounded-full", state.isWorking ? "bg-green-500 animate-pulse" : "bg-zinc-600")} />
                  <p className="text-[7px] font-mono text-zinc-400 uppercase">{state.activity}</p>
                </div>
              </div>

               {/* Personal "Humanized" Thought Process */}
               <AnimatePresence>
                {state.thought && state.isWorking && !activeAgent && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute -top-16 left-1/2 -translate-x-1/2 w-40 bg-zinc-900 p-2 border border-white/10 shadow-2xl rounded"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[6px] text-white/30 font-mono">NEURAL_THOUGHT_STREAM</span>
                      <Cpu size={8} className="text-white/20" />
                    </div>
                    <p className="text-[9px] font-medium text-white/90 leading-tight tracking-tight">
                      {state.thought}
                    </p>
                    <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 border-r border-b border-white/10 rotate-45" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })}

      {/* Neural Thought Stream Footer */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-10 bg-black/95 border-t border-white/5 flex items-center overflow-hidden z-[200]"
      >
        <div className="shrink-0 px-4 bg-black h-full flex items-center border-r border-white/10 z-10">
          <Terminal size={14} className="text-[#004884]" />
          <span className="text-[8px] font-black text-white ml-2 uppercase tracking-tighter">DATA_FEED_L1</span>
        </div>
        <div className="flex whitespace-nowrap gap-8" style={{ transform: `translateX(${tickerOffset % 800}px)` }}>
          {logs.slice(-10).map((l, i) => (
             <span key={i} className="text-[8px] font-mono text-[#004884]/60 uppercase">
                [{new Date().toLocaleTimeString()}]: {l.message?.slice(0, 40)}... | NODE_REF_{i} // 
             </span>
          ))}
          {/* Repeat for continuous effect */}
          {logs.slice(-10).map((l, i) => (
             <span key={i + 'rep'} className="text-[8px] font-mono text-[#004884]/60 uppercase">
                [{new Date().toLocaleTimeString()}]: {l.message?.slice(0, 40)}... | NODE_REF_{i} // 
             </span>
          ))}
        </div>
      </div>

      {/* Expanded Agent Panel (Humanized Details) */}
      <AnimatePresence>
        {activeAgent && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="absolute right-0 top-0 bottom-0 w-72 bg-black/90 border-l border-white/10 backdrop-blur-xl z-[100] p-6 flex flex-col gap-6"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-white text-xs font-black tracking-widest uppercase mb-1">
                  {AGENT_PERSONAS[activeAgent as keyof typeof AGENT_PERSONAS].name}
                </h3>
                <p className="text-[9px] text-zinc-400 mb-2 leading-tight">
                  {AGENT_PERSONAS[activeAgent as keyof typeof AGENT_PERSONAS].role}
                </p>
                <p className="text-[8px] font-mono text-zinc-500 uppercase">Status: <span className="text-green-500">Authorized</span></p>
              </div>
              <button onClick={() => setActiveAgent(null)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <section>
                <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest mb-2 font-mono">Neural Insights</p>
                <div className="bg-zinc-800/50 p-3 border border-white/5 rounded italic text-[11px] text-white/80 leading-relaxed font-serif">
                  "{activeAgent === 'LEGAL' 
                    ? "Observando discrepancias en el bloque de legalidad. Es fascinante cómo intentan camuflar los objetos contractuales bajo ambigüedades técnicas."
                    : activeAgent === 'FORENSIC'
                    ? "Los vectores de este contratista están gritando 'colusión'. La proximidad semántica no es casualidad, es un diseño deliberado."
                    : activeAgent === 'FINANCIAL'
                    ? "El dinero deja rastro. Estos sobrecostos están 'lavados' en múltiples contratos pequeños."
                    : activeAgent === 'ETHICS'
                    ? "La moralina no sirve aquí, solo los hechos. Hay nexos políticos evidentes en la junta directiva."
                    : activeAgent === 'FIELD'
                    ? "Mis sensores en terreno no mienten. El puente no existe, solo hay un terreno baldío."
                    : "Optimizando la red. Cada auditoría me hace más fuerte. Mis hermanos están trabajando bien."}"
                </div>
              </section>

              <section>
                <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest mb-2 font-mono">Current Mission</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] uppercase">
                    <span className="text-zinc-400">Task Latency:</span>
                    <span className="text-white font-mono">12ms</span>
                  </div>
                  <div className="flex justify-between text-[9px] uppercase">
                    <span className="text-zinc-400">Confidence:</span>
                    <span className="text-green-400 font-mono">98.4%</span>
                  </div>
                  <div className="flex justify-between text-[9px] uppercase">
                    <span className="text-zinc-400">Focus Area:</span>
                    <span className="text-blue-400 font-mono">{AGENT_PERSONAS[activeAgent as keyof typeof AGENT_PERSONAS].focus}</span>
                  </div>
                </div>
              </section>

              <section>
                <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest mb-2 font-mono">Peer Evaluation</p>
                <div className="space-y-3">
                  {Object.entries(AGENT_PERSONAS).filter(([id]) => id !== activeAgent).map(([id, p]) => (
                    <div key={id} className="flex items-center gap-3">
                      <div className="w-1 h-8 rounded-full" style={{ backgroundColor: p.color }} />
                      <div>
                        <p className="text-[8px] font-bold text-white uppercase">{p.name}</p>
                        <p className="text-[7px] text-zinc-500 italic">
                          {activeAgent === 'SYSTEM' ? "Eficiencia estable." : "Sincronía detectada."}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="mt-auto pt-6 border-t border-white/5">
                <div className="flex items-center gap-2 text-[8px] font-mono text-zinc-600">
                  <Terminal size={10} />
                  <span>ROOT_CONEX_SECURE_ENCRYPT</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-4 left-4 flex gap-4 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Neural Link Active</span>
        </div>
        <div className="flex items-center gap-2">
          <Terminal size={10} className="text-white/20" />
          <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest leading-none">Encrypted Forensic Stream // {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}

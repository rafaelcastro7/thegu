import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, Gavel, Activity, 
  Cpu, Globe, Terminal, Shield, 
  Briefcase, Landmark, Fingerprint, Zap
} from 'lucide-react';
import { cn } from '../lib/utils';
import { AGENT_PERSONAS } from '../lib/agents';

interface AgentState {
  id: string;
  pos: { x: number, y: number };
  activity: string;
  isWorking: boolean;
  thought?: string;
}

export function AgentOffice({ logs }: { logs: any[] }) {
  const [agents, setAgents] = useState<Record<string, AgentState>>({
    FORENSIC: { id: 'FORENSIC', pos: { x: 25, y: 35 }, activity: 'Idle', isWorking: false },
    LEGAL: { id: 'LEGAL', pos: { x: 75, y: 45 }, activity: 'Idle', isWorking: false },
    SYSTEM: { id: 'SYSTEM', pos: { x: 50, y: 70 }, activity: 'Standby', isWorking: false },
  });

  const nodes = [
    { id: 'N1', label: 'SOCRATA_01', x: 20, y: 20 },
    { id: 'N2', label: 'LEGAL_ONTOLOGY', x: 80, y: 25 },
    { id: 'N3', label: 'NEURAL_CORE', x: 50, y: 50 },
    { id: 'N4', label: 'EXTERNAL_INTEL', x: 85, y: 75 },
    { id: 'N5', label: 'FISC_ID_SYNC', x: 15, y: 80 },
  ];

  useEffect(() => {
    if (logs.length === 0) return;
    const lastLog = logs[logs.length - 1];
    
    setAgents(prev => {
      const newState = { ...prev };
      const agentId = lastLog.agent;
      
      if (newState[agentId]) {
        newState[agentId] = {
          ...newState[agentId],
          activity: lastLog.status,
          isWorking: lastLog.status !== 'COMPLETED',
          thought: lastLog.message
        };

        // Move logic
        if (lastLog.status === 'THINKING') {
          newState[agentId].pos = { x: 50, y: 50 };
        } else if (lastLog.status === 'EXECUTING') {
          if (agentId === 'LEGAL') newState[agentId].pos = { x: 75, y: 30 };
          if (agentId === 'FORENSIC') newState[agentId].pos = { x: 25, y: 30 };
          if (agentId === 'SYSTEM') newState[agentId].pos = { x: 50, y: 75 };
        }
      }
      return newState;
    });
  }, [logs]);

  return (
    <div className="relative w-full h-[400px] bg-[#09090b] border border-white/5 overflow-hidden group">
      {/* Schematic Grid */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Connection Lines (Static Schematic) */}
      <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none">
        <line x1="20%" y1="20%" x2="50%" y2="50%" stroke="white" strokeWidth="0.5" />
        <line x1="80%" y1="25%" x2="50%" y2="50%" stroke="white" strokeWidth="0.5" />
        <line x1="50%" y1="50%" x2="85%" y2="75%" stroke="white" strokeWidth="0.5" />
        <line x1="50%" y1="50%" x2="15%" y2="80%" stroke="white" strokeWidth="0.5" />
        <line x1="50%" y1="50%" x2="50%" y2="75%" stroke="white" strokeWidth="0.5" />
      </svg>

      {/* Fixed Nodes */}
      {nodes.map(node => (
        <div 
          key={node.id}
          className="absolute flex flex-col items-center gap-2"
          style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}
        >
          <div className="w-1.5 h-1.5 bg-zinc-800 border border-white/20 rotate-45" />
          <span className="text-[6px] font-mono text-zinc-700 tracking-tighter uppercase">{node.label}</span>
        </div>
      ))}

      {/* Agents */}
      {Object.entries(agents).map(([id, state]) => {
        const persona = AGENT_PERSONAS[id as keyof typeof AGENT_PERSONAS];
        const Icon = id === 'FORENSIC' ? Activity : id === 'LEGAL' ? Gavel : Fingerprint;

        return (
          <motion.div
            key={id}
            initial={false}
            animate={{ left: `${state.pos.x}%`, top: `${state.pos.y}%` }}
            transition={{ type: 'spring', damping: 25, stiffness: 40 }}
            className="absolute z-50 flex flex-col items-center"
            style={{ transform: 'translate(-50%, -50%)' }}
          >
            {/* Minimal label */}
            <div className="flex flex-col items-center gap-1 group/agent">
              <motion.div 
                className="w-10 h-10 border flex items-center justify-center bg-black transition-colors"
                style={{ borderColor: state.isWorking ? persona.color : '#27272a' }}
                animate={{ 
                  scale: state.isWorking ? [1, 1.05, 1] : 1,
                  opacity: state.isWorking ? 1 : 0.6
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Icon size={16} style={{ color: state.isWorking ? persona.color : '#52525b' }} />
              </motion.div>
              
              <div className="text-center px-2 py-0.5 bg-black border border-white/5 space-y-0.5">
                <p className="text-[7px] font-black tracking-tighter uppercase text-white leading-none">{persona.name}</p>
                <p className="text-[6px] font-mono text-zinc-600 uppercase leading-none">{state.activity}</p>
              </div>

               {/* Thought bubble (very minimal) */}
               <AnimatePresence>
                {state.thought && state.isWorking && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 bg-white p-2 border border-black shadow-xl"
                  >
                    <p className="text-[8px] font-bold text-black leading-tight uppercase tracking-tighter">{state.thought}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}


import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Cpu, Search, Database, ShieldCheck, User } from 'lucide-react';
import { cn } from '../lib/utils';

interface AgentState {
  id: string;
  name: string;
  status: 'IDLE' | 'WORKING' | 'SUCCESS' | 'ERROR';
  currentTask: string;
  icon: any;
}

export function MiniVerse({ statusMessage }: { statusMessage: string }) {
  const [agents, setAgents] = useState<AgentState[]>([
    { id: 'a1', name: 'Neural_Auditor', status: 'IDLE', currentTask: 'Escaneo', icon: Search },
    { id: 'a2', name: 'Vector_Validator', status: 'IDLE', currentTask: 'Similitud', icon: Cpu },
    { id: 'a3', name: 'Pattern_Sentinel', status: 'IDLE', currentTask: 'Anomalías', icon: ShieldCheck },
  ]);

  useEffect(() => {
    // Dynamic behavior logic
    const isScanning = statusMessage.includes('Analizando') || statusMessage.includes('Auditando');
    const isAnalyzing = statusMessage.includes('Similitudes') || statusMessage.includes('Vector');

    setAgents(prev => [
      { ...prev[0], status: isScanning ? 'WORKING' : 'IDLE' },
      { ...prev[1], status: isAnalyzing ? 'WORKING' : 'IDLE' },
      { ...prev[2], status: statusMessage.includes('Riesgo') ? 'WORKING' : 'IDLE' },
    ]);
  }, [statusMessage]);

  return (
    <div className="bg-white border-l border-[#E6E6E6] p-4 flex flex-col gap-3 overflow-hidden relative min-h-[140px] w-64 shadow-inner">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-1">
        <p className="text-[9px] font-black text-[#004884] flex items-center gap-2 uppercase tracking-tighter">
          <Terminal size={12} /> ALGORITMOS DE VIGILANCIA
        </p>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 bg-[#FCD059] rounded-full animate-pulse" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {agents.map((agent) => (
          <div key={agent.id} className="flex items-center gap-3 p-2 bg-gray-50/50 group border border-transparent hover:border-[#004884]/10 transition-all">
            <div className={cn(
              "w-8 h-8 flex items-center justify-center border-2 transition-all duration-500",
              agent.status === 'WORKING' ? "border-[#004884] bg-[#004884]/5" : "border-gray-200 bg-white"
            )}>
              <agent.icon size={14} className={cn(
                agent.status === 'WORKING' ? "text-[#004884] animate-pulse" : "text-gray-300"
              )} />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[9px] font-black uppercase text-[#333333] truncate">{agent.name}</p>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-1 h-1 rounded-full",
                  agent.status === 'WORKING' ? "bg-emerald-500 animate-pulse" : "bg-gray-300"
                )} />
                <p className="text-[8px] font-bold text-gray-400 truncate">
                  {agent.status === 'WORKING' ? 'PROCESANDO HALLAZGOS' : 'EN ESPERA'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-1 h-4 overflow-hidden border-t border-gray-100 pt-2 flex items-center gap-2">
         <div className="w-1 h-1 bg-[#004884] animate-ping" />
         <p className="text-[8px] font-bold text-[#004884]/60 uppercase truncate">
           FLUJO: {statusMessage}
         </p>
      </div>
    </div>
  );
}

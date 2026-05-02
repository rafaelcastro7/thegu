
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Zap, Activity, ShieldCheck, Server, Cloud, Monitor, BarChart3, Settings, Play, Pause, RefreshCw, AlertCircle, ChevronRight } from 'lucide-react';
import { neuralManager, ModelProvider, ModelConfig, NeuralMetrics } from '../lib/neuralManager';
import { cn } from '../lib/utils';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export function CortexDashboard({ t }: { t: any }) {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [metrics, setMetrics] = useState<NeuralMetrics>(neuralManager.getMetrics());
  const [activeProvider, setActiveProvider] = useState<ModelProvider>(neuralManager.getActiveProvider());
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const update = () => {
      setModels(neuralManager.getModels());
      setMetrics(neuralManager.getMetrics());
      setActiveProvider(neuralManager.getActiveProvider());
    };
    update();
    const interval = setInterval(() => {
      const now = new Date();
      setHistory(prev => [...prev.slice(-19), {
        time: `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`,
        latency: neuralManager.getMetrics().avgLatency + (Math.random() - 0.5) * 40,
        load: Math.random() * 100
      }]);
      update();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = (id: string) => {
    neuralManager.toggleModel(id);
    setModels(neuralManager.getModels());
  };

  const handleSwitch = (p: ModelProvider) => {
    neuralManager.setActiveProvider(p);
    setActiveProvider(p);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      {/* Upper Management Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 technical-panel p-6 rounded-none relative">
          <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
            <div className="space-y-1">
              <p className="header-label">{t.topology}</p>
              <h3 className="text-xl font-bold text-white tracking-tight">{t.active_node}: {activeProvider}</h3>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-mono">
              <span className="text-emerald-500 flex items-center gap-2">
                <div className="w-1 h-1 bg-emerald-500 rounded-full" /> STABLE
              </span>
              <span className="text-zinc-500 uppercase">UTC {new Date().toISOString().split('T')[1].split('.')[0]}</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <CartesianGrid strokeDasharray="2 2" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="time" hide />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '0px', fontSize: '10px', fontFamily: 'monospace' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area 
                  type="stepAfter" 
                  dataKey="latency" 
                  stroke="#ffffff" 
                  strokeWidth={1}
                  fillOpacity={0.1} 
                  fill="#ffffff" 
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="technical-panel p-6 rounded-none flex flex-col justify-between">
          <div className="space-y-8">
            <div className="space-y-2">
              <p className="header-label">{t.inference_volume}</p>
              <p className="text-3xl font-black text-white tabular-nums">{metrics.totalTokens.toLocaleString()}</p>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{t.tokens_processed}</p>
            </div>
            
            <div className="space-y-2">
              <p className="header-label">{t.economic_burn}</p>
              <p className="text-3xl font-black text-white tabular-nums">${metrics.burnRate.toFixed(4)}</p>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{t.operational_cost}</p>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5">
             <button className="w-full py-3 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                Export Log Chain
             </button>
          </div>
        </div>
      </div>

      {/* Model Inventory Area */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-px bg-white/5 border border-white/5">
          {models.map(model => (
            <div 
              key={model.id}
              className={cn(
                "p-4 bg-[#09090b] flex items-center justify-between transition-colors group",
                activeProvider === model.provider ? "bg-zinc-900/50" : "hover:bg-zinc-900/30"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-1 h-12",
                  activeProvider === model.provider ? "bg-white" : "bg-transparent"
                )} />
                
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h4 className="text-sm font-bold text-white uppercase tracking-tight">{model.name}</h4>
                    {model.status === 'LOADING' && (
                       <RefreshCw size={10} className="animate-spin text-zinc-500" />
                    )}
                    <span className={cn(
                      "text-[8px] font-black px-1.5 py-0.5 rounded-none uppercase",
                      model.status === 'ONLINE' ? "bg-emerald-500 text-black" : 
                      model.status === 'LOADING' ? "bg-amber-500 text-black" : "bg-red-500 text-black"
                    )}>{model.status}</span>
                  </div>
                  <p className="data-text text-zinc-500 uppercase flex items-center gap-4">
                    <span>PATH: <span className="text-zinc-300">{model.id}</span></span>
                    <span>LATENCY: <span className="text-zinc-300">{model.latency}MS</span></span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right hidden md:block">
                  <p className="header-label !text-[8px]">Token Load</p>
                  <p className="data-text text-white">{(model.tokensUsed / 1000).toFixed(1)}k</p>
                </div>
                
                <button 
                  onClick={() => handleSwitch(model.provider)}
                  disabled={!model.enabled || model.status === 'OFFLINE' || model.status === 'LOADING'}
                  className={cn(
                    "px-4 py-2 text-[9px] font-black uppercase tracking-widest border transition-all",
                    activeProvider === model.provider 
                      ? "bg-white text-black border-white" 
                      : "border-white/10 text-zinc-500 hover:text-white hover:border-white"
                  )}
                >
                  {activeProvider === model.provider ? "ACTIVE" : "SELECT"}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="technical-panel p-6 space-y-8 flex flex-col justify-between">
          <div className="space-y-6">
            <h4 className="header-label">{t.integrity}</h4>
            
            <div className="space-y-6">
              {[
                { label: t.stability, value: '99.9%', color: 'bg-white' },
                { label: 'Deduplication Rate', value: '88.4%', color: 'bg-emerald-500' },
                { label: t.verification, value: '94.8%', color: 'bg-white' }
              ].map(stat => (
                <div key={stat.label} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <p className="header-label !text-zinc-500">{stat.label}</p>
                    <p className="data-text text-white">{stat.value}</p>
                  </div>
                  <div className="h-0.5 bg-white/5 w-full">
                    <div className={cn("h-full", stat.color)} style={{ width: stat.value }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-zinc-900/50 border border-white/5 space-y-2">
            <div className="flex items-center gap-2 text-zinc-400">
              <AlertCircle size={12} />
              <span className="header-label !text-zinc-400">{t.security_protocol}</span>
            </div>
            <p className="text-[9px] text-zinc-500 font-mono leading-relaxed">
              {t.security_desc}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

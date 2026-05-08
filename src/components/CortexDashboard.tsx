import React, { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Cpu, Database, Gauge, Layers3, RefreshCw, Server, ShieldCheck } from 'lucide-react';
import { neuralManager, ModelConfig, ModelProvider, NeuralMetrics } from '../lib/neuralManager';
import { cn } from '../lib/utils';

export function CortexDashboard({ t }: { t: any }) {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [metrics, setMetrics] = useState<NeuralMetrics>(neuralManager.getMetrics());
  const [activeProvider, setActiveProvider] = useState<ModelProvider>(neuralManager.getActiveProvider());
  const [history, setHistory] = useState<Array<{ time: string; latency: number; calls: number }>>([]);

  useEffect(() => {
    const update = () => {
      const snapshot = neuralManager.getMetrics();
      setModels(neuralManager.getModels());
      setMetrics(snapshot);
      setActiveProvider(neuralManager.getActiveProvider());

      const now = new Date();
      const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setHistory((prev) => [
        ...prev.slice(-15),
        {
          time,
          latency: Number(snapshot.avgLatency.toFixed(1)),
          calls: snapshot.totalCalls,
        },
      ]);
    };

    update();
    const interval = setInterval(update, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleSwitch = (provider: ModelProvider) => {
    neuralManager.setActiveProvider(provider);
    setActiveProvider(provider);
    setModels(neuralManager.getModels());
  };

  const capabilities = [
    {
      icon: Database,
      title: 'Proxy SECOP II',
      description: 'Consulta la fuente abierta y devuelve contratos listos para agrupacion y scoring.',
    },
    {
      icon: Layers3,
      title: 'Cache persistente',
      description: 'Reutiliza analisis y reportes ya calculados para reducir espera operativa.',
    },
    {
      icon: Cpu,
      title: 'Modelos locales',
      description: 'Generan reportes, embeddings y respuestas de auditoria sin depender de un servicio externo central.',
    },
    {
      icon: ShieldCheck,
      title: 'Contexto juridico reutilizable',
      description: 'La capa RAG prioriza normas y referencias para sustentar cada expediente.',
    },
  ];

  return (
    <div className="space-y-6 text-white">
      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] gap-6">
        <div className="bg-[#09090b] border border-white/10 p-6">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">{t.topology}</p>
              <h3 className="text-2xl font-black mt-2">{t.active_node}: {activeProvider}</h3>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              <p>Telemetria de sesion</p>
              <p className="mt-1 text-slate-500">{history.length > 0 ? 'Actualizacion automatica activa' : 'Esperando actividad'}</p>
            </div>
          </div>

          <div className="h-64 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="latency" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', fontSize: '11px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Area type="monotone" dataKey="latency" stroke="#38bdf8" fill="url(#latency)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#09090b] border border-white/10 p-6 grid grid-cols-2 gap-4 content-start">
          {[
            { label: 'Llamadas', value: metrics.totalCalls, icon: RefreshCw },
            { label: 'Tokens', value: metrics.totalTokens.toLocaleString(), icon: Cpu },
            { label: 'Latencia prom.', value: `${metrics.avgLatency.toFixed(0)} ms`, icon: Gauge },
            { label: 'Costo estimado', value: `$${metrics.burnRate.toFixed(4)}`, icon: Server },
          ].map((item) => (
            <div key={item.label} className="border border-white/10 bg-white/[0.03] p-4 space-y-3">
              <item.icon size={16} className="text-sky-300" />
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">{item.label}</p>
              <p className="text-2xl font-black">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
        <div className="bg-[#09090b] border border-white/10 divide-y divide-white/10">
          {models.map((model) => (
            <div key={model.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h4 className="text-sm font-black uppercase">{model.name}</h4>
                  <span
                    className={cn(
                      'px-2 py-1 text-[9px] font-black uppercase tracking-widest',
                      model.status === 'ONLINE' && 'bg-emerald-500 text-black',
                      model.status === 'LOADING' && 'bg-amber-400 text-black',
                      model.status === 'OFFLINE' && 'bg-red-500 text-black',
                      model.status === 'BUSY' && 'bg-sky-400 text-black'
                    )}
                  >
                    {model.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Ruta: <span className="text-slate-200">{model.id}</span> · Tokens de sesion: <span className="text-slate-200">{model.tokensUsed.toLocaleString()}</span>
                </p>
                <p className="text-[11px] text-slate-500">Latencia base reportada: {model.latency} ms</p>
              </div>

              <button
                type="button"
                onClick={() => handleSwitch(model.provider)}
                disabled={!model.enabled || model.status === 'OFFLINE' || model.status === 'LOADING'}
                className={cn(
                  'px-4 py-3 border text-[10px] font-black uppercase tracking-[0.25em] transition-all min-w-40',
                  activeProvider === model.provider
                    ? 'bg-white text-black border-white'
                    : 'border-white/15 text-slate-300 hover:border-sky-300 hover:text-white',
                  (!model.enabled || model.status === 'OFFLINE' || model.status === 'LOADING') && 'opacity-50 cursor-not-allowed'
                )}
              >
                {activeProvider === model.provider ? 'Activo' : 'Usar modelo'}
              </button>
            </div>
          ))}
        </div>

        <div className="bg-[#09090b] border border-white/10 p-6 space-y-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Capacidades activas</p>
            <h4 className="text-xl font-black mt-2">Lo que esta respaldado por la arquitectura actual</h4>
          </div>
          <div className="space-y-4">
            {capabilities.map((item) => (
              <div key={item.title} className="border border-white/10 bg-white/[0.03] p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <item.icon size={16} className="text-sky-300" />
                  <p className="text-sm font-black uppercase">{item.title}</p>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

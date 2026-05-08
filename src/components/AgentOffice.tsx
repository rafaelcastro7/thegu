import React, { useEffect, useMemo, useRef } from 'react';
import Phaser from 'phaser';
import { Activity, CircleDollarSign, Cpu, FileSearch, Gavel, RefreshCw, ShieldCheck } from 'lucide-react';
import { AGENT_PERSONAS, AgentAction, AgentId } from '../lib/agents';
import { cn } from '../lib/utils';

type AgentSnapshot = {
  id: AgentId;
  status: AgentAction['status'];
  message: string;
};

type OfficeEventDetail = {
  agents: AgentSnapshot[];
};

const AGENT_SYNC_EVENT = 'gobia:agent-sync';
const officeBus = new EventTarget();

const moduleIcons: Record<AgentId, React.ComponentType<{ size?: number; className?: string }>> = {
  FORENSIC: Activity,
  LEGAL: Gavel,
  SYSTEM: Cpu,
  FINANCIAL: CircleDollarSign,
  ETHICS: ShieldCheck,
  FIELD: FileSearch,
};

const statusLabels: Record<AgentAction['status'], string> = {
  THINKING: 'En revision',
  EXECUTING: 'En ejecucion',
  OPTIMIZING: 'Actualizando',
  COMPLETED: 'Completo',
  IDLE: 'En espera',
};

const zonePalette = {
  border: 0x1d4ed8,
  fill: 0x0f172a,
  accent: 0xfacc15,
  text: '#dbeafe',
  muted: '#94a3b8',
};

const statusTint: Record<AgentAction['status'], number> = {
  THINKING: 0xf59e0b,
  EXECUTING: 0x38bdf8,
  OPTIMIZING: 0xd946ef,
  COMPLETED: 0x22c55e,
  IDLE: 0x64748b,
};

const agentLabels: Record<AgentId, string> = {
  FORENSIC: 'Audit Sentinel',
  LEGAL: 'Juris Guard',
  SYSTEM: 'Neural Core',
  FINANCIAL: 'Fiscal Hunter',
  ETHICS: 'Probity Arbiter',
  FIELD: 'Ground Scout',
};

type OfficeZoneId = 'INGESTA' | 'LEGAL_LIBRARY' | 'VAULT' | 'CONTROL' | 'COMPLIANCE' | 'SOURCE_DESK';

const agentHomeZone: Record<AgentId, OfficeZoneId> = {
  FORENSIC: 'INGESTA',
  LEGAL: 'LEGAL_LIBRARY',
  FINANCIAL: 'VAULT',
  SYSTEM: 'CONTROL',
  ETHICS: 'COMPLIANCE',
  FIELD: 'SOURCE_DESK',
};

const zoneTitles: Record<OfficeZoneId, string> = {
  INGESTA: 'Ingesta',
  LEGAL_LIBRARY: 'Biblioteca Legal',
  VAULT: 'Boveda',
  CONTROL: 'Control',
  COMPLIANCE: 'Cumplimiento',
  SOURCE_DESK: 'Fuente abierta',
};

class AgentOfficeScene extends Phaser.Scene {
  private agents = new Map<AgentId, Phaser.GameObjects.Container>();
  private messageText = new Map<AgentId, Phaser.GameObjects.Text>();
  private zones = new Map<OfficeZoneId, Phaser.Geom.Rectangle>();
  private currentSnapshots = new Map<AgentId, AgentSnapshot>();
  private syncHandler?: EventListener;

  constructor() {
    super('AgentOfficeScene');
  }

  preload() {
    // Placeholder for future PNG sprites:
    // this.load.image('audit-sentinel', '/assets/agents/audit-sentinel.png');
  }

  create() {
    this.drawOffice();
    this.createAgents();

    this.syncHandler = ((event: Event) => {
      const detail = (event as CustomEvent<OfficeEventDetail>).detail;
      this.updateAgentStates(detail.agents);
    }) as EventListener;

    officeBus.addEventListener(AGENT_SYNC_EVENT, this.syncHandler);
    this.scale.on('resize', this.handleResize, this);
  }

  shutdown() {
    if (this.syncHandler) {
      officeBus.removeEventListener(AGENT_SYNC_EVENT, this.syncHandler);
    }
    this.scale.off('resize', this.handleResize, this);
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.cameras.main.setSize(gameSize.width, gameSize.height);
    this.redraw();
  }

  private redraw() {
    this.children.removeAll(true);
    this.zones.clear();
    this.agents.clear();
    this.messageText.clear();
    this.drawOffice();
    this.createAgents();
    this.updateAgentStates(Array.from(this.currentSnapshots.values()), false);
  }

  private drawOffice() {
    const width = this.scale.width;
    const height = this.scale.height;

    const background = this.add.graphics();
    background.fillGradientStyle(0x020617, 0x0f172a, 0x111827, 0x020617, 1);
    background.fillRect(0, 0, width, height);

    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1e293b, 0.6);
    for (let x = 0; x <= width; x += 28) {
      grid.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += 28) {
      grid.lineBetween(0, y, width, y);
    }

    this.add.text(28, 22, 'GobIA Agent Office', {
      color: '#f8fafc',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '18px',
      fontStyle: '700',
    });

    this.add.text(28, 46, 'Realtime orchestration layer for the 6 local agents', {
      color: zonePalette.muted,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '11px',
    });

    const zoneDefs: Array<{ id: OfficeZoneId; x: number; y: number; w: number; h: number; subtitle: string }> = [
      { id: 'INGESTA', x: 28, y: 86, w: width * 0.31, h: height * 0.32, subtitle: 'Entrada SECOP y patrones' },
      { id: 'LEGAL_LIBRARY', x: width * 0.36, y: 86, w: width * 0.28, h: height * 0.32, subtitle: 'RAG y jurisprudencia' },
      { id: 'VAULT', x: width * 0.67, y: 86, w: width * 0.28, h: height * 0.32, subtitle: 'Capital y concentracion' },
      { id: 'CONTROL', x: 28, y: height * 0.47, w: width * 0.28, h: height * 0.26, subtitle: 'Memoria y sesion' },
      { id: 'COMPLIANCE', x: width * 0.34, y: height * 0.47, w: width * 0.28, h: height * 0.26, subtitle: 'Modalidad y integridad' },
      { id: 'SOURCE_DESK', x: width * 0.65, y: height * 0.47, w: width * 0.3, h: height * 0.26, subtitle: 'Contratos y trazabilidad' },
    ];

    zoneDefs.forEach((zone) => {
      const panel = this.add.graphics();
      panel.fillStyle(zonePalette.fill, 0.84);
      panel.lineStyle(2, zonePalette.border, 0.9);
      panel.fillRoundedRect(zone.x, zone.y, zone.w, zone.h, 22);
      panel.strokeRoundedRect(zone.x, zone.y, zone.w, zone.h, 22);

      panel.lineStyle(1, zonePalette.accent, 0.55);
      panel.lineBetween(zone.x + 18, zone.y + 46, zone.x + zone.w - 18, zone.y + 46);

      this.add.text(zone.x + 18, zone.y + 16, zoneTitles[zone.id], {
        color: zonePalette.text,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '14px',
        fontStyle: '700',
      });

      this.add.text(zone.x + 18, zone.y + 54, zone.subtitle, {
        color: zonePalette.muted,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '10px',
      });

      this.zones.set(zone.id, new Phaser.Geom.Rectangle(zone.x, zone.y, zone.w, zone.h));
    });
  }

  private createAgents() {
    (Object.keys(AGENT_PERSONAS) as AgentId[]).forEach((id) => {
      const home = this.getWaypoint(id, 'IDLE');
      const persona = AGENT_PERSONAS[id];

      const body = this.add.rectangle(0, 0, 92, 34, Phaser.Display.Color.HexStringToColor(persona.color).color, 0.95);
      body.setStrokeStyle(2, 0xf8fafc, 0.4);

      const label = this.add.text(0, -2, agentLabels[id], {
        color: '#f8fafc',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '10px',
        fontStyle: '700',
      }).setOrigin(0.5);

      const message = this.add.text(0, 28, statusLabels.IDLE, {
        color: '#94a3b8',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '9px',
      }).setOrigin(0.5);

      const container = this.add.container(home.x, home.y, [body, label, message]);
      container.setSize(92, 52);

      this.agents.set(id, container);
      this.messageText.set(id, message);
    });
  }

  private getWaypoint(id: AgentId, status: AgentAction['status']) {
    const zone = this.zones.get(agentHomeZone[id]);
    if (!zone) {
      return { x: 80, y: 80 };
    }

    const statusOffsets: Record<AgentAction['status'], { x: number; y: number }> = {
      THINKING: { x: 0.3, y: 0.42 },
      EXECUTING: { x: 0.72, y: 0.5 },
      OPTIMIZING: { x: 0.5, y: 0.74 },
      COMPLETED: { x: 0.78, y: 0.24 },
      IDLE: { x: 0.22, y: 0.24 },
    };

    const offset = statusOffsets[status] || statusOffsets.IDLE;
    return {
      x: zone.x + zone.width * offset.x,
      y: zone.y + zone.height * offset.y,
    };
  }

  private updateAgentStates(agents: AgentSnapshot[], animate = true) {
    agents.forEach((agent) => {
      this.currentSnapshots.set(agent.id, agent);
      const container = this.agents.get(agent.id);
      const message = this.messageText.get(agent.id);
      if (!container || !message) return;

      const target = this.getWaypoint(agent.id, agent.status);
      const rectangle = container.list[0] as Phaser.GameObjects.Rectangle;
      rectangle.setFillStyle(statusTint[agent.status], 0.95);
      message.setText(agent.message || statusLabels[agent.status]);
      message.setColor(agent.status === 'COMPLETED' ? '#bbf7d0' : '#cbd5e1');

      if (!animate) {
        container.setPosition(target.x, target.y);
        return;
      }

      this.tweens.add({
        targets: container,
        x: target.x,
        y: target.y,
        duration: 650,
        ease: 'Sine.easeInOut',
      });
    });
  }
}

function broadcastAgentState(agents: AgentSnapshot[]) {
  officeBus.dispatchEvent(new CustomEvent<OfficeEventDetail>(AGENT_SYNC_EVENT, {
    detail: { agents },
  }));
}

export function AgentOffice({ logs }: { logs: AgentAction[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  const latestByAgent = useMemo(() => {
    return logs.reduce((acc, log) => {
      acc[log.agent] = log;
      return acc;
    }, {} as Partial<Record<AgentId, AgentAction>>);
  }, [logs]);

  const agentSnapshots = useMemo<AgentSnapshot[]>(() => {
    return (Object.keys(AGENT_PERSONAS) as AgentId[]).map((id) => {
      const latest = latestByAgent[id];
      return {
        id,
        status: latest?.status || 'IDLE',
        message: latest?.message || statusLabels.IDLE,
      };
    });
  }, [latestByAgent]);

  const recentLogs = useMemo(() => logs.slice(-8).reverse(), [logs]);
  const activitySummary = useMemo(() => {
    const active = agentSnapshots.filter((agent) => agent.status !== 'IDLE').length;
    const completed = agentSnapshots.filter((agent) => agent.status === 'COMPLETED').length;
    const latest = recentLogs[0];
    return {
      active,
      completed,
      idle: agentSnapshots.length - active,
      latestAgent: latest ? agentLabels[latest.agent] : 'Sin actividad',
      latestMessage: latest?.message || 'La sesión todavía no registra eventos operativos.',
    };
  }, [agentSnapshots, recentLogs]);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const scene = new AgentOfficeScene();
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: containerRef.current.clientWidth || 960,
      height: 520,
      parent: containerRef.current,
      transparent: true,
      backgroundColor: '#020617',
      scene,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        antialias: true,
        pixelArt: false,
      },
    });

    gameRef.current = game;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const width = entry.contentRect.width;
      const height = Math.max(420, Math.min(620, width * 0.56));
      game.scale.resize(width, height);
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    broadcastAgentState(agentSnapshots);
  }, [agentSnapshots]);

  return (
    <div className="h-full bg-slate-950 text-white p-6 flex flex-col gap-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-sky-300">Oficina de agentes</p>
          <h3 className="text-2xl font-black tracking-tight">Visualizacion operativa en tiempo real</h3>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-300">
          <RefreshCw size={14} className={logs.length > 0 ? 'animate-spin' : ''} />
          <span>{logs.length > 0 ? 'Sincronizacion viva con los eventos del orquestador' : 'Esperando la primera actividad de agentes'}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Agentes activos', value: activitySummary.active, tone: 'text-sky-300' },
          { label: 'Agentes en espera', value: activitySummary.idle, tone: 'text-slate-200' },
          { label: 'Ciclos completados', value: activitySummary.completed, tone: 'text-emerald-300' },
          { label: 'Ultimo agente', value: activitySummary.latestAgent, tone: 'text-[#FCD059]' },
          { label: 'Cobertura visible', value: `${agentSnapshots.length} nodos`, tone: 'text-fuchsia-300' },
        ].map((item) => (
          <div key={item.label} className="border border-white/10 bg-white/[0.03] p-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
            <p className={cn('text-xl font-black tracking-tight uppercase', item.tone)}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="border border-white/10 bg-white/[0.03] p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Estado operativo</p>
            <h4 className="text-lg font-black mt-2">Mapa de actividad y desplazamiento de agentes</h4>
          </div>
          <div className="max-w-2xl text-[11px] text-slate-300 leading-relaxed">
            {activitySummary.latestMessage}
          </div>
        </div>
        <div className="border border-white/10 bg-slate-950/60 overflow-hidden min-h-[520px]">
          <div ref={containerRef} className="w-full h-full min-h-[520px]" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 flex-1 min-h-0">
        <div className="border border-white/10 bg-white/[0.03] p-5 space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Panel de agentes</p>
            <h4 className="text-lg font-black mt-2">Estado compacto de los 6 módulos</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {agentSnapshots.map((agent) => {
              const persona = AGENT_PERSONAS[agent.id];
              const Icon = moduleIcons[agent.id];
              return (
                <div key={agent.id} className="border border-white/10 bg-slate-950/70 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 border border-white/10 flex items-center justify-center bg-white/5">
                        <Icon size={16} className="text-sky-300" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">{agent.id}</p>
                        <h4 className="text-sm font-black uppercase">{agentLabels[agent.id]}</h4>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'px-2 py-1 text-[9px] font-black uppercase tracking-widest border',
                        agent.status === 'COMPLETED' && 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
                        agent.status === 'THINKING' && 'bg-amber-500/15 text-amber-200 border-amber-500/20',
                        agent.status === 'EXECUTING' && 'bg-sky-500/15 text-sky-200 border-sky-500/20',
                        agent.status === 'OPTIMIZING' && 'bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-500/20',
                        agent.status === 'IDLE' && 'bg-white/5 text-slate-400 border-white/10'
                      )}
                    >
                      {statusLabels[agent.status]}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-200">{persona.focus}</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{agent.message}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border border-white/10 bg-white/[0.03] min-h-0 flex flex-col">
          <div className="p-5 border-b border-white/10">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Bitacora visible</p>
            <h4 className="text-lg font-black mt-2">Cronologia reciente del sistema</h4>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-3">
            {recentLogs.length > 0 ? (
              recentLogs.map((log, index) => (
                <div key={`${log.timestamp}-${index}`} className="border border-white/10 bg-slate-950/70 p-4 space-y-2">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase tracking-[0.28em] text-sky-300">{agentLabels[log.agent]}</span>
                      <span
                        className={cn(
                          'px-2 py-1 text-[9px] font-black uppercase tracking-widest border',
                          log.status === 'COMPLETED' && 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
                          log.status === 'THINKING' && 'bg-amber-500/15 text-amber-200 border-amber-500/20',
                          log.status === 'EXECUTING' && 'bg-sky-500/15 text-sky-200 border-sky-500/20',
                          log.status === 'OPTIMIZING' && 'bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-500/20',
                          log.status === 'IDLE' && 'bg-white/5 text-slate-400 border-white/10'
                        )}
                      >
                        {statusLabels[log.status]}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[11px] text-slate-100 leading-relaxed">{log.message}</p>
                </div>
              ))
            ) : (
              <div className="h-full min-h-40 flex items-center justify-center text-center text-slate-500 text-sm px-6">
                La actividad aparecera aqui cuando se abra un expediente o se ejecute un nuevo ciclo.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * SECOP II — Contratos Electrónicos
 * Dashboard de análisis estadístico — Preguntas 3-14
 * Dataset: https://www.datos.gov.co/resource/jbjy-vk9h.json
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, ReferenceLine,
} from 'recharts';
import {
  Database, Calendar, Hash, Type, AlertTriangle, TrendingUp,
  Award, FileText, BarChart2, Clock, DollarSign, Activity,
  ChevronDown, ChevronUp, ExternalLink, Info,
} from 'lucide-react';
import { cn } from '../lib/utils';

// ─── DATA ──────────────────────────────────────────────────────────────────

const DATASET_META = {
  nombre: 'SECOP II — Contratos Electrónicos',
  url: 'https://www.datos.gov.co/Estad-sticas-Nacionales/SECOP-II-Contratos-Electr-nicos/jbjy-vk9h',
  id: 'jbjy-vk9h',
  totalRegistros: 5614448,
  totalVariables: 84,
  fechaConsulta: '2026-05-08',
};

const DATE_VARS = [
  'Fecha de Firma',
  'Fecha de Inicio del Contrato',
  'Fecha de Fin del Contrato',
  'Ultima Actualizacion',
  'Fecha Inicio Liquidacion',
  'Fecha Fin Liquidacion',
  'Fecha de notificación de prorrogación',
];

const NUMERIC_VARS = [
  'Nit Entidad', 'Valor del Contrato', 'Valor de pago adelantado',
  'Valor Facturado', 'Valor Pendiente de Pago', 'Valor Pagado',
  'Valor Amortizado', 'Valor Pendiente de Amortizacion',
  'Valor Pendiente de Ejecucion', 'Saldo CDP', 'Saldo Vigencia',
  'Dias adicionados', 'Presupuesto General de la Nacion – PGN',
  'Sistema General de Participaciones', 'Sistema General de Regalías',
  'Recursos Propios (Alcaldías, Gobernaciones y Resguardos Indígenas)',
  'Recursos de Credito', 'Recursos Propios', 'Codigo Entidad',
];

const TEXT_VARS = [
  'Nombre Entidad', 'Departamento', 'Ciudad', 'Localización', 'Orden',
  'Sector', 'Rama', 'Entidad Centralizada', 'Proceso de Compra', 'ID Contrato',
  'Referencia del Contrato', 'Estado Contrato', 'Codigo de Categoria Principal',
  'Descripcion del Proceso', 'Tipo de Contrato', 'Modalidad de Contratacion',
  'Justificacion Modalidad de Contratacion', 'Condiciones de Entrega',
  'TipoDocProveedor', 'Documento Proveedor', 'Proveedor Adjudicado', 'Es Grupo',
  'Es Pyme', 'Habilita Pago Adelantado', 'Liquidación', 'Obligación Ambiental',
  'Obligaciones Postconsumo', 'Reversion', 'Origen de los Recursos', 'Destino Gasto',
  'EsPostConflicto', 'Puntos del Acuerdo', 'Pilares del Acuerdo', 'URLProceso',
  'Nombre Representante Legal', 'Nacionalidad Representante Legal',
  'Domicilio Representante Legal', 'Tipo de Identificación Representante Legal',
  'Identificación Representante Legal', 'Género Representante Legal',
  'Codigo Proveedor', 'Objeto del Contrato', 'Duración del contrato',
  'Nombre del banco', 'Tipo de cuenta', 'Número de cuenta',
  'El contrato puede ser prorrogado', 'Nombre ordenador del gasto',
  'Tipo de documento Ordenador del gasto', 'Número de documento Ordenador del gasto',
  'Nombre supervisor', 'Tipo de documento supervisor',
  'Número de documento supervisor', 'Documentos Tipo', 'Descripcion Documentos Tipo',
];

const NULL_DATA = [
  { variable: 'Fecha Fin Liquidacion', nulos: 5004452, pct: 89.15, color: '#D12C26' },
  { variable: 'Fecha Inicio Liquidacion', nulos: 5004413, pct: 89.15, color: '#D12C26' },
  { variable: 'F. Inicio Contrato', nulos: 423262, pct: 7.54, color: '#F59E0B' },
  { variable: 'Fecha de Firma', nulos: 402830, pct: 7.17, color: '#F59E0B' },
  { variable: 'F. Fin Contrato', nulos: 53755, pct: 0.96, color: '#10B981' },
  { variable: 'Valor del Contrato', nulos: 0, pct: 0, color: '#10B981' },
  { variable: 'Proveedor Adjudicado', nulos: 0, pct: 0, color: '#10B981' },
];

const TYPE_PIE = [
  { name: 'Texto', value: 54, color: '#004884' },
  { name: 'Numérico', value: 19, color: '#FCD059' },
  { name: 'Fecha', value: 7, color: '#D12C26' },
  { name: 'Otro', value: 4, color: '#94A3B8' },
];

const TOP7_VALUES = [
  { rank: 1, valor: 9974265138436 },
  { rank: 2, valor: 9948132332356 },
  { rank: 3, valor: 9947716000000 },
  { rank: 4, valor: 9922500000000 },
  { rank: 5, valor: 9922500000000 },
  { rank: 6, valor: 9653449000000 },
  { rank: 7, valor: 9645115773936 },
];

// ─── HELPERS ───────────────────────────────────────────────────────────────

function fmtNum(n: number) {
  return n.toLocaleString('es-CO');
}

function fmtCOP(n: number) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)} B`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)} MM`;
  return `$${n.toLocaleString('es-CO')}`;
}

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

// ─── SUB-COMPONENTS ────────────────────────────────────────────────────────

function Badge({ label, q }: { label: string; q: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#004884]/10 border border-[#004884]/20">
      <span className="text-[9px] font-black text-[#004884] uppercase tracking-wider">{q}</span>
      <span className="text-[9px] text-gray-500">{label}</span>
    </div>
  );
}

function QuestionCard({
  q, title, children, className,
}: {
  q: string; title: string; children: React.ReactNode; className?: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      className={cn('bg-white border border-[#E6E6E6] overflow-hidden', className)}
    >
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[#F2F2F2] bg-[#004884]">
        <span className="text-[10px] font-black text-[#FCD059] uppercase tracking-widest">{q}</span>
        <span className="text-xs font-bold text-white/90">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

function StatBig({ value, sub, color = '#004884' }: { value: string; sub?: string; color?: string }) {
  return (
    <div>
      <div className="text-5xl font-black tabular-nums leading-none" style={{ color }}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1 font-medium">{sub}</div>}
    </div>
  );
}

function VarList({ items, color }: { items: string[]; color: string }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, 8);
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {visible.map(v => (
          <span key={v} className="text-[10px] px-2 py-0.5 rounded font-medium border" style={{ borderColor: color + '33', color, backgroundColor: color + '0d' }}>
            {v}
          </span>
        ))}
      </div>
      {items.length > 8 && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-2 text-[10px] text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Ver menos' : `Ver ${items.length - 8} más`}
        </button>
      )}
    </div>
  );
}

const CustomNullTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-xs space-y-1">
      <div className="font-bold text-gray-800">{d.variable}</div>
      <div className="text-gray-500">Nulos: <span className="font-semibold text-gray-800">{fmtNum(d.nulos)}</span></div>
      <div className="text-gray-500">Porcentaje: <span className="font-semibold" style={{ color: d.color }}>{d.pct.toFixed(2)}%</span></div>
    </div>
  );
};

const CustomValueTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-xs space-y-1">
      <div className="font-bold text-gray-800">Rank #{d.rank}</div>
      <div className="text-gray-500">Valor: <span className="font-semibold text-[#004884]">{fmtCOP(d.valor)}</span></div>
      <div className="text-gray-400 font-mono text-[10px]">${fmtNum(d.valor)} COP</div>
    </div>
  );
};

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────

export function SECOPDashboard() {
  return (
    <div className="min-h-screen bg-[#F5F7FA] font-sans">

      {/* ── HEADER ── */}
      <header className="bg-[#004884] text-white">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1 h-8 bg-[#FCD059]" />
                <div className="w-1 h-8 bg-white/60" />
                <div className="w-1 h-8 bg-[#D12C26]" />
                <span className="text-[10px] font-black tracking-widest text-white/60 ml-1">COLOMBIA COMPRA EFICIENTE</span>
              </div>
              <h1 className="text-3xl font-black uppercase tracking-tight leading-none">
                SECOP II — Contratos Electrónicos
              </h1>
              <p className="text-sm text-white/60 mt-1">Análisis estadístico descriptivo del dataset público · Preguntas 3–14</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <a
                href={DATASET_META.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[10px] text-white/50 hover:text-white/80 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                datos.gov.co / {DATASET_META.id}
              </a>
              <div className="text-[10px] text-white/40">Fecha de consulta: {DATASET_META.fechaConsulta}</div>
            </div>
          </div>
        </div>
        {/* Accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#FCD059] via-[#004884] to-[#D12C26]" />
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">

        {/* ── KPI HERO ROW ── */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.07 } } }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {[
            { label: 'Total de Registros', value: fmtNum(DATASET_META.totalRegistros), icon: Database, color: '#004884', sub: 'Pregunta 3', accent: '#004884' },
            { label: 'Total de Variables', value: String(DATASET_META.totalVariables), icon: BarChart2, color: '#D12C26', sub: 'Pregunta 4', accent: '#D12C26' },
            { label: 'Máx. Días Adicionados', value: fmtNum(730533), icon: Clock, color: '#F59E0B', sub: 'Pregunta 11 · ~2.001 años', accent: '#F59E0B' },
            { label: 'Máx. Valor Contrato', value: '$9,97 B', icon: DollarSign, color: '#10B981', sub: 'Pregunta 12 · Billones COP', accent: '#10B981' },
          ].map(kpi => (
            <motion.div key={kpi.label} variants={fadeUp} className="bg-white border border-[#E6E6E6] p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{kpi.label}</span>
                <div className="w-8 h-8 flex items-center justify-center rounded" style={{ backgroundColor: kpi.accent + '15' }}>
                  <kpi.icon className="w-4 h-4" style={{ color: kpi.accent }} />
                </div>
              </div>
              <div className="text-3xl font-black tabular-nums leading-none" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="text-[10px] text-gray-400 font-medium">{kpi.sub}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── ROW 1: Estructura de variables ── */}
        <motion.div
          initial="hidden" animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4"
        >
          {/* Distribución por tipo — Pie */}
          <QuestionCard q="P4" title="Distribución de variables por tipo" className="lg:col-span-1">
            <div className="flex items-center justify-center">
              <PieChart width={220} height={220}>
                <Pie
                  data={TYPE_PIE}
                  cx={110} cy={100}
                  innerRadius={55} outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${value}`}
                  labelLine={false}
                >
                  {TYPE_PIE.map(entry => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v, entry: any) => (
                    <span className="text-xs text-gray-600">{v} <strong>({entry.payload.value})</strong></span>
                  )}
                />
                <Tooltip formatter={(v: any) => [v, 'Variables']} />
              </PieChart>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {TYPE_PIE.slice(0, 3).map(t => (
                <div key={t.name} className="text-center p-2 rounded" style={{ backgroundColor: t.color + '10' }}>
                  <div className="text-xl font-black" style={{ color: t.color }}>{t.value}</div>
                  <div className="text-[9px] text-gray-500 font-semibold uppercase">{t.name}</div>
                </div>
              ))}
            </div>
          </QuestionCard>

          {/* Variables de fecha */}
          <QuestionCard q="P5" title={`Variables de tipo Fecha (${DATE_VARS.length})`} className="lg:col-span-1">
            <div className="flex flex-col gap-2">
              {DATE_VARS.map((v, i) => (
                <div key={v} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#D12C26] flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-black text-white">{i + 1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-gray-700">{v}</div>
                  </div>
                  <Calendar className="w-3 h-3 text-[#D12C26] shrink-0" />
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-[#D12C26]/5 border border-[#D12C26]/20 rounded">
              <p className="text-[10px] text-[#D12C26] font-semibold">
                Nota: Las variables de liquidación concentran el 89,15% de nulos en el dataset, indicando que la mayoría de contratos aún no han completado su ciclo de liquidación.
              </p>
            </div>
          </QuestionCard>

          {/* Variables numéricas */}
          <QuestionCard q="P6" title={`Variables de tipo Numérico (${NUMERIC_VARS.length})`} className="lg:col-span-1">
            <VarList items={NUMERIC_VARS} color="#10B981" />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded text-center">
                <div className="text-lg font-black text-emerald-700">19</div>
                <div className="text-[9px] text-emerald-600 uppercase font-semibold">Variables numéricas</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded text-center">
                <div className="text-lg font-black text-emerald-700">22.6%</div>
                <div className="text-[9px] text-emerald-600 uppercase font-semibold">Del total (84)</div>
              </div>
            </div>
          </QuestionCard>
        </motion.div>

        {/* Variables de texto — full width */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-4">
          <QuestionCard q="P7" title={`Variables de tipo Texto (${TEXT_VARS.length})`}>
            <VarList items={TEXT_VARS} color="#004884" />
            <div className="mt-4 flex gap-6 text-xs text-gray-500">
              <span><strong className="text-[#004884]">64.3%</strong> del total de variables son tipo texto</span>
              <span><strong className="text-[#004884]">54</strong> variables capturan información descriptiva, administrativa y de partes del contrato</span>
            </div>
          </QuestionCard>
        </motion.div>

        {/* ── ROW 2: Análisis de nulos ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4"
        >
          {/* Bar chart nulos */}
          <QuestionCard q="P8 · P9 · P10" title="Análisis de valores nulos por variable clave" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={NULL_DATA} margin={{ left: 10, right: 20, top: 5, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis
                  dataKey="variable"
                  tick={{ fontSize: 9, fill: '#6B7280' }}
                  angle={-28}
                  textAnchor="end"
                  interval={0}
                  height={60}
                />
                <YAxis
                  tickFormatter={v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : String(v)}
                  tick={{ fontSize: 9, fill: '#6B7280' }}
                />
                <Tooltip content={<CustomNullTooltip />} />
                <Bar dataKey="nulos" radius={[3, 3, 0, 0]}>
                  {NULL_DATA.map(entry => (
                    <Cell key={entry.variable} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </QuestionCard>

          {/* Detalle nulos P8/P9/P10 */}
          <div className="flex flex-col gap-4">
            <QuestionCard q="P8" title="Variable con más nulos">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#D12C26]" />
                  <span className="text-sm font-black text-[#D12C26]">Fecha Fin Liquidacion</span>
                </div>
                <StatBig value={fmtNum(5004452)} sub="registros nulos" color="#D12C26" />
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full bg-[#D12C26]" style={{ width: '89.15%' }} />
                  </div>
                  <span className="text-xs font-black text-[#D12C26]">89.15%</span>
                </div>
              </div>
            </QuestionCard>

            <QuestionCard q="P9" title="% nulos en Fecha de Firma">
              <div className="flex items-end gap-3">
                <div>
                  <div className="text-5xl font-black text-[#F59E0B] tabular-nums">7.17</div>
                  <div className="text-xs text-gray-400 mt-0.5">porcentaje de nulos</div>
                </div>
                <div className="text-right text-xs text-gray-500 pb-1">
                  <div className="font-semibold text-gray-700">{fmtNum(402830)}</div>
                  <div>de {fmtNum(5614448)}</div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-[#F59E0B]" style={{ width: '7.17%' }} />
                </div>
                <span className="text-xs font-semibold text-[#F59E0B]">7.17%</span>
              </div>
            </QuestionCard>

            <QuestionCard q="P10" title="Nulos en Fecha Inicio Liquidación">
              <StatBig value={fmtNum(5004413)} sub="registros nulos (89.15%)" color="#D12C26" />
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-[#D12C26]" style={{ width: '89.15%' }} />
                </div>
                <span className="text-xs font-semibold text-[#D12C26]">89.15%</span>
              </div>
            </QuestionCard>
          </div>
        </motion.div>

        {/* ── ROW 3: Valores del Contrato ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4"
        >
          {/* Top 7 Bar Chart */}
          <QuestionCard q="P12 · P13" title="Top 7 valores más altos — Valor del Contrato (COP)" className="lg:col-span-3">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={TOP7_VALUES} margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                <XAxis dataKey="rank" tickFormatter={v => `#${v}`} tick={{ fontSize: 11, fontWeight: 700, fill: '#374151' }} />
                <YAxis
                  tickFormatter={v => `$${(v / 1e12).toFixed(1)}B`}
                  tick={{ fontSize: 9, fill: '#6B7280' }}
                  domain={[9500000000000, 10100000000000]}
                />
                <Tooltip content={<CustomValueTooltip />} />
                <ReferenceLine y={9974265138436} stroke="#D12C26" strokeDasharray="4 4" label={{ value: 'Máximo', position: 'right', fontSize: 9, fill: '#D12C26' }} />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                  {TOP7_VALUES.map((entry, i) => (
                    <Cell key={i} fill={i === 0 ? '#D12C26' : i === 6 ? '#FCD059' : '#004884'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 text-[10px] text-gray-500 mt-1 justify-center">
              <span><span className="inline-block w-2 h-2 rounded-sm bg-[#D12C26] mr-1" />Máximo (#1)</span>
              <span><span className="inline-block w-2 h-2 rounded-sm bg-[#004884] mr-1" />#2 al #6</span>
              <span><span className="inline-block w-2 h-2 rounded-sm bg-[#FCD059] mr-1" />Séptimo (#7)</span>
            </div>
          </QuestionCard>

          {/* Tabla ranking + P11 */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <QuestionCard q="P12" title="Valor máximo del Contrato">
              <div className="space-y-1">
                <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Rank #1</div>
                <div className="text-4xl font-black text-[#D12C26] tabular-nums leading-none">$9,97 B</div>
                <div className="text-xs text-gray-500 font-mono">COP 9.974.265.138.436</div>
              </div>
            </QuestionCard>

            <QuestionCard q="P13" title="Séptimo valor más alto">
              <div className="space-y-1">
                <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Rank #7</div>
                <div className="text-4xl font-black text-[#FCD059] tabular-nums leading-none">$9,65 B</div>
                <div className="text-xs text-gray-500 font-mono">COP 9.645.115.773.936</div>
              </div>
            </QuestionCard>

            <QuestionCard q="P11" title="Valor máximo — Días adicionados">
              <div className="space-y-1">
                <div className="text-4xl font-black text-[#F59E0B] tabular-nums">{fmtNum(730533)}</div>
                <div className="text-xs text-gray-400">días ≈ <strong>~2.001 años</strong></div>
                <div className="flex items-center gap-1.5 mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                  <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-[10px] text-amber-700">Posible anomalía en datos de origen — requiere validación con la entidad.</span>
                </div>
              </div>
            </QuestionCard>
          </div>
        </motion.div>

        {/* ── ROW 4: Tabla ranking + Fecha de Firma ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4"
        >
          {/* Tabla top 7 */}
          <QuestionCard q="P12 · P13" title="Ranking — 7 contratos de mayor valor">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-[#004884]/10">
                  <th className="text-left py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider">Rank</th>
                  <th className="text-right py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider">Valor COP</th>
                  <th className="text-right py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider">Billones</th>
                </tr>
              </thead>
              <tbody>
                {TOP7_VALUES.map((row, i) => (
                  <tr
                    key={row.rank}
                    className={cn(
                      'border-b border-gray-100',
                      i === 0 && 'bg-[#D12C26]/5',
                      i === 6 && 'bg-[#FCD059]/20'
                    )}
                  >
                    <td className="py-2.5">
                      <span className={cn(
                        'w-6 h-6 rounded-full inline-flex items-center justify-center text-[10px] font-black',
                        i === 0 ? 'bg-[#D12C26] text-white' : i === 6 ? 'bg-[#FCD059] text-[#004884]' : 'bg-[#004884]/10 text-[#004884]'
                      )}>
                        {row.rank}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono text-gray-700 font-semibold">${fmtNum(row.valor)}</td>
                    <td className="py-2.5 text-right">
                      <span className={cn('font-black', i === 0 ? 'text-[#D12C26]' : i === 6 ? 'text-[#F59E0B]' : 'text-[#004884]')}>
                        {(row.valor / 1e12).toFixed(3)} B
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </QuestionCard>

          {/* Fecha de Firma timeline */}
          <QuestionCard q="P14" title="Rango temporal — Fecha de Firma">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="border-l-4 border-[#004884] pl-4">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Fecha Mínima</div>
                  <div className="text-2xl font-black text-[#004884]">11 Jun</div>
                  <div className="text-sm font-bold text-[#004884]/70">2015</div>
                  <div className="text-[10px] text-gray-400 mt-1">Inicio del sistema SECOP II</div>
                </div>
                <div className="border-l-4 border-[#D12C26] pl-4">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Fecha Máxima</div>
                  <div className="text-2xl font-black text-[#D12C26]">4 May</div>
                  <div className="text-sm font-bold text-[#D12C26]/70">2026</div>
                  <div className="text-[10px] text-gray-400 mt-1">Registro más reciente</div>
                </div>
              </div>

              {/* Timeline visual */}
              <div className="relative pt-3">
                <div className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider mb-2">Línea de tiempo</div>
                <div className="relative h-3 bg-gradient-to-r from-[#004884] to-[#D12C26] rounded-full">
                  <div className="absolute -top-1 left-0 w-2 h-5 bg-[#004884] rounded-full shadow" />
                  <div className="absolute -top-1 right-0 w-2 h-5 bg-[#D12C26] rounded-full shadow" />
                </div>
                <div className="flex justify-between mt-1.5 text-[9px] text-gray-400 font-mono">
                  <span>Jun 2015</span>
                  <span>~10.9 años de cobertura</span>
                  <span>May 2026</span>
                </div>
              </div>

              <div className="bg-[#004884]/5 border border-[#004884]/15 rounded p-4 space-y-2">
                <div className="text-[10px] font-black text-[#004884] uppercase tracking-wider">Resumen estadístico</div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-gray-500">Rango total:</span><br /><strong>~10.9 años</strong></div>
                  <div><span className="text-gray-500">Registros con fecha:</span><br /><strong>{fmtNum(5614448 - 402830)}</strong></div>
                  <div><span className="text-gray-500">Registros sin fecha:</span><br /><strong className="text-[#F59E0B]">{fmtNum(402830)} (7.17%)</strong></div>
                  <div><span className="text-gray-500">Años cubiertos:</span><br /><strong>2015 – 2026</strong></div>
                </div>
              </div>
            </div>
          </QuestionCard>
        </motion.div>

        {/* ── RESUMEN FINAL ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="bg-[#004884] text-white p-8">
            <div className="max-w-4xl">
              <div className="text-[10px] font-black tracking-widest text-[#FCD059] uppercase mb-3">Resumen ejecutivo</div>
              <h2 className="text-2xl font-black uppercase leading-tight mb-4">Hallazgos principales del dataset</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                <div>
                  <div className="text-[#FCD059] font-black text-lg">{fmtNum(DATASET_META.totalRegistros)}</div>
                  <div className="text-white/60 text-xs mt-0.5">contratos registrados desde 2015</div>
                </div>
                <div>
                  <div className="text-[#FCD059] font-black text-lg">89.15%</div>
                  <div className="text-white/60 text-xs mt-0.5">de contratos sin liquidar aún</div>
                </div>
                <div>
                  <div className="text-[#FCD059] font-black text-lg">$9.97 B COP</div>
                  <div className="text-white/60 text-xs mt-0.5">contrato de mayor valor registrado</div>
                </div>
                <div>
                  <div className="text-[#FCD059] font-black text-lg">10.9 años</div>
                  <div className="text-white/60 text-xs mt-0.5">de cobertura temporal (2015–2026)</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mt-4 text-[10px] text-gray-400 text-center">
          Fuente: datos.gov.co — Dataset jbjy-vk9h — Consultado {DATASET_META.fechaConsulta} · GobIA Auditor
        </div>

      </div>
    </div>
  );
}

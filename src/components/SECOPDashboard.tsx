/**
 * SECOP II — Contratos Electrónicos
 * Dashboard estadístico — Preguntas 3 a 14
 * Dataset ID: jbjy-vk9h · datos.gov.co
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
import { ChevronDown, ChevronUp, ExternalLink, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../lib/utils';

// ─── CONSTANTES ────────────────────────────────────────────────────────────

const TOTAL_REGISTROS = 5_614_448;

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

const NULL_VARS = [
  { name: 'Fecha Fin Liquidacion',     nulos: 5_004_452, pct: 89.15 },
  { name: 'Fecha Inicio Liquidacion',  nulos: 5_004_413, pct: 89.15 },
  { name: 'F. Inicio del Contrato',    nulos:   423_262, pct:  7.54 },
  { name: 'Fecha de Firma',            nulos:   402_830, pct:  7.17 },
  { name: 'F. Fin del Contrato',       nulos:    53_755, pct:  0.96 },
  { name: 'Proveedor Adjudicado',      nulos:         0, pct:  0.00 },
  { name: 'Valor del Contrato',        nulos:         0, pct:  0.00 },
];

const TOP7 = [
  { rank: 1, valor: 9_974_265_138_436 },
  { rank: 2, valor: 9_948_132_332_356 },
  { rank: 3, valor: 9_947_716_000_000 },
  { rank: 4, valor: 9_922_500_000_000 },
  { rank: 5, valor: 9_922_500_000_000 },
  { rank: 6, valor: 9_653_449_000_000 },
  { rank: 7, valor: 9_645_115_773_936 },
];

// ─── HELPERS ───────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('es-CO');

const fmtCOP = (n: number) => {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(3).replace('.', ',')} billones`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)} mil millones`;
  return `$${fmt(n)}`;
};

// ─── BUILDING BLOCKS ───────────────────────────────────────────────────────

/** Tarjeta de pregunta con enunciado obligatorio */
function QCard({
  n, enunciado, children,
}: {
  n: number;
  enunciado: string;
  children: React.ReactNode;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35 }}
      className="bg-white border border-[#E0E7EF] shadow-sm overflow-hidden"
    >
      {/* Header con número + enunciado */}
      <header className="flex items-start gap-4 px-6 py-4 border-b border-[#E0E7EF] bg-[#F8FAFD]">
        <div className="shrink-0 w-9 h-9 rounded-full bg-[#004884] flex items-center justify-center mt-0.5">
          <span className="text-xs font-black text-white leading-none">{n}</span>
        </div>
        <p className="text-sm font-semibold text-[#1A2942] leading-snug">{enunciado}</p>
      </header>
      {/* Respuesta */}
      <div className="px-6 py-6">{children}</div>
    </motion.article>
  );
}

/** Lista expandible de chips */
function ChipList({
  items,
  color,
  initialVisible = 12,
}: {
  items: string[];
  color: string;
  initialVisible?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, initialVisible);
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {visible.map(v => (
          <span
            key={v}
            className="text-[11px] font-medium px-2.5 py-1 rounded-full border"
            style={{ color, borderColor: color + '40', backgroundColor: color + '0d' }}
          >
            {v}
          </span>
        ))}
      </div>
      {items.length > initialVisible && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors"
        >
          {expanded
            ? <><ChevronUp className="w-3.5 h-3.5" /> Mostrar menos</>
            : <><ChevronDown className="w-3.5 h-3.5" /> Ver {items.length - initialVisible} más</>}
        </button>
      )}
    </div>
  );
}

/** Número grande de respuesta */
function BigAnswer({
  value,
  unit,
  note,
  color = '#004884',
}: {
  value: string;
  unit?: string;
  note?: string;
  color?: string;
}) {
  return (
    <div className="flex items-end gap-3 flex-wrap">
      <span className="text-6xl font-black tabular-nums leading-none" style={{ color }}>
        {value}
      </span>
      {unit && (
        <span className="text-base font-semibold text-gray-400 pb-1.5">{unit}</span>
      )}
      {note && (
        <span className="w-full text-xs text-gray-400 mt-1">{note}</span>
      )}
    </div>
  );
}

/** Barra de porcentaje simple */
function PctBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <span className="text-sm font-black tabular-nums w-14 text-right" style={{ color }}>{pct.toFixed(2)}%</span>
    </div>
  );
}

// Tooltip custom para el bar chart de nulos
const NullTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 shadow-xl rounded-lg p-3 text-xs space-y-0.5">
      <p className="font-bold text-gray-800">{d.name}</p>
      <p className="text-gray-500">Nulos: <strong>{fmt(d.nulos)}</strong></p>
      <p className="text-gray-500">Porcentaje: <strong>{d.pct.toFixed(2)}%</strong></p>
    </div>
  );
};

// ─── DASHBOARD ─────────────────────────────────────────────────────────────

export function SECOPDashboard() {
  return (
    <div className="min-h-screen bg-[#F2F5F9]">

      {/* ── CABECERA ── */}
      <div className="bg-[#004884] text-white">
        <div className="h-1 bg-gradient-to-r from-[#FCD059] via-white/20 to-[#D12C26]" />
        <div className="max-w-5xl mx-auto px-8 py-8 flex items-start justify-between gap-6 flex-wrap">
          <div>
            <p className="text-[10px] font-black tracking-[0.2em] text-[#FCD059] uppercase mb-2">
              BASE DE DATOS 1
            </p>
            <h1 className="text-2xl font-black uppercase leading-tight">
              SECOP II — Contratos Electrónicos
            </h1>
            <p className="text-sm text-white/50 mt-1">
              Análisis estadístico descriptivo · Preguntas 3 a 14
            </p>
          </div>
          <a
            href="https://www.datos.gov.co/Estad-sticas-Nacionales/SECOP-II-Contratos-Electr-nicos/jbjy-vk9h"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/70 transition-colors self-end"
          >
            <ExternalLink className="w-3 h-3" />
            datos.gov.co · jbjy-vk9h
          </a>
        </div>
      </div>

      {/* ── PREGUNTAS ── */}
      <div className="max-w-5xl mx-auto px-8 py-10 space-y-6">

        {/* ── P3 ── */}
        <QCard
          n={3}
          enunciado="¿Cual es la cantidad total de registros de la base de datos?"
        >
          <BigAnswer
            value={fmt(TOTAL_REGISTROS)}
            unit="registros"
            note="Contratos electrónicos registrados en SECOP II desde junio de 2015."
          />
        </QCard>

        {/* ── P4 ── */}
        <QCard
          n={4}
          enunciado="¿Cual es la cantidad total de variables de la base de datos?"
        >
          <div className="flex items-end gap-8 flex-wrap">
            <BigAnswer value="84" unit="variables" />
            <div className="flex flex-col gap-2 pb-1">
              {[
                { label: 'Texto',    count: 54, color: '#004884' },
                { label: 'Numérico', count: 19, color: '#10B981' },
                { label: 'Fecha',    count:  7, color: '#D12C26' },
                { label: 'Otro',     count:  4, color: '#94A3B8' },
              ].map(t => (
                <div key={t.label} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="text-gray-500 w-16">{t.label}</span>
                  <span className="font-black" style={{ color: t.color }}>{t.count}</span>
                </div>
              ))}
            </div>
          </div>
        </QCard>

        {/* ── P5 ── */}
        <QCard
          n={5}
          enunciado="¿Cuántas y cuales variables de tipo fecha existen?"
        >
          <div className="mb-4">
            <BigAnswer value={String(DATE_VARS.length)} unit="variables de tipo fecha" color="#D12C26" />
          </div>
          <div className="flex flex-col gap-2.5">
            {DATE_VARS.map((v, i) => (
              <div key={v} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#D12C26]/10 border border-[#D12C26]/30 flex items-center justify-center text-[10px] font-black text-[#D12C26] shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-gray-700">{v}</span>
              </div>
            ))}
          </div>
        </QCard>

        {/* ── P6 ── */}
        <QCard
          n={6}
          enunciado="¿Cuántas y cuales variables de tipo numérico existen?"
        >
          <div className="mb-4">
            <BigAnswer value={String(NUMERIC_VARS.length)} unit="variables de tipo numérico" color="#10B981" />
          </div>
          <ChipList items={NUMERIC_VARS} color="#10B981" initialVisible={19} />
        </QCard>

        {/* ── P7 ── */}
        <QCard
          n={7}
          enunciado="¿Cuántas y cuales variables de tipo texto existen?"
        >
          <div className="mb-4">
            <BigAnswer value={String(TEXT_VARS.length)} unit="variables de tipo texto" color="#004884" />
          </div>
          <ChipList items={TEXT_VARS} color="#004884" initialVisible={16} />
        </QCard>

        {/* ── P8 ── */}
        <QCard
          n={8}
          enunciado="¿Qué variable tiene la mayor cantidad de registros nulos?"
        >
          {/* Respuesta destacada */}
          <div className="mb-6 p-4 border-l-4 border-[#D12C26] bg-[#FEF2F2]">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#D12C26] mb-1">Respuesta</p>
            <p className="text-xl font-black text-[#991B1B]">Fecha Fin Liquidacion</p>
            <p className="text-sm text-[#DC2626] mt-0.5">
              {fmt(5_004_452)} registros nulos · 89.15% del total
            </p>
          </div>

          {/* Bar chart comparativo */}
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Comparativa de nulos en variables clave
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={NULL_VARS}
              margin={{ top: 4, right: 16, left: 16, bottom: 48 }}
              barSize={32}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 9, fill: '#6B7280' }}
                angle={-30}
                textAnchor="end"
                interval={0}
                height={56}
              />
              <YAxis
                tickFormatter={v =>
                  v >= 1e6 ? `${(v / 1e6).toFixed(1)}M`
                  : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K`
                  : String(v)
                }
                tick={{ fontSize: 9, fill: '#6B7280' }}
                width={42}
              />
              <Tooltip content={<NullTooltip />} />
              <Bar dataKey="nulos" radius={[3, 3, 0, 0]}>
                {NULL_VARS.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.pct >= 80 ? '#D12C26' : d.pct >= 5 ? '#F59E0B' : '#10B981'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </QCard>

        {/* ── P9 ── */}
        <QCard
          n={9}
          enunciado="¿Qué porcentaje de registros nulos tiene la variable Fecha de Firma?"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Número grande */}
            <div>
              <BigAnswer value="7.17" unit="%" color="#F59E0B" />
              <p className="text-xs text-gray-400 mt-3">
                {fmt(402_830)} registros nulos
                <span className="mx-2 text-gray-300">·</span>
                de {fmt(TOTAL_REGISTROS)} totales
              </p>
            </div>
            {/* Donut */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <PieChart width={160} height={160}>
                  <Pie
                    data={[
                      { name: 'Nulos', value: 7.17 },
                      { name: 'Completos', value: 92.83 },
                    ]}
                    cx={80} cy={80}
                    innerRadius={52} outerRadius={72}
                    startAngle={90} endAngle={-270}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    <Cell fill="#F59E0B" />
                    <Cell fill="#F0F4F8" />
                  </Pie>
                </PieChart>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-2xl font-black text-[#F59E0B]">7.17%</span>
                  <span className="text-[9px] text-gray-400 font-semibold">NULOS</span>
                </div>
              </div>
              <div className="flex gap-4 text-[10px] text-gray-500 mt-1">
                <span><span className="inline-block w-2 h-2 rounded-sm bg-[#F59E0B] mr-1" />Nulos (7.17%)</span>
                <span><span className="inline-block w-2 h-2 rounded-sm bg-[#F0F4F8] border border-gray-300 mr-1" />Completos (92.83%)</span>
              </div>
            </div>
          </div>
        </QCard>

        {/* ── P10 ── */}
        <QCard
          n={10}
          enunciado="¿Cuántos registros nulos tiene la variable Fecha Inicio Liquidación?"
        >
          <BigAnswer
            value={fmt(5_004_413)}
            unit="registros nulos"
            color="#D12C26"
          />
          <div className="mt-4">
            <PctBar pct={89.15} color="#D12C26" />
            <p className="text-xs text-gray-400 mt-2">
              89.15% del total de {fmt(TOTAL_REGISTROS)} registros no tienen fecha de inicio de liquidación,
              lo que indica que la gran mayoría de contratos aún no han entrado en fase de liquidación.
            </p>
          </div>
        </QCard>

        {/* ── P11 ── */}
        <QCard
          n={11}
          enunciado="¿Cuál es el valor máximo de la variable Días adicionados?"
        >
          <BigAnswer
            value={fmt(730_533)}
            unit="días"
            color="#F59E0B"
          />
          <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              730.533 días equivalen a aproximadamente <strong>~2.001 años</strong>.
              Este valor extremo sugiere una posible anomalía en los datos fuente y debería ser validado directamente con la entidad contratante para confirmar su veracidad.
            </p>
          </div>
        </QCard>

        {/* ── P12 ── */}
        <QCard
          n={12}
          enunciado="¿Cuál es el valor más alto de la variable Valor del Contrato encontrado en la base de datos?"
        >
          <BigAnswer
            value="$9.974.265.138.436"
            unit="COP"
            color="#004884"
          />
          <p className="text-xs text-gray-400 mt-3">
            Equivale a <strong>{fmtCOP(9_974_265_138_436)}</strong> de pesos colombianos.
          </p>
        </QCard>

        {/* ── P13 ── */}
        <QCard
          n={13}
          enunciado="¿Cuál es el séptimo valor más alto de la variable Valor del Contrato encontrado en la base de datos?"
        >
          {/* Respuesta */}
          <div className="mb-6 p-4 border-l-4 border-[#FCD059] bg-[#FFFBEB]">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#92400E] mb-1">Séptimo valor más alto</p>
            <p className="text-3xl font-black text-[#004884] font-mono">$9.645.115.773.936</p>
            <p className="text-sm text-gray-500 mt-0.5">COP · {fmtCOP(9_645_115_773_936)}</p>
          </div>

          {/* Ranking completo top 7 */}
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Ranking — Top 7 Valor del Contrato
          </p>
          <div className="space-y-2">
            {TOP7.map((row) => {
              const isTarget = row.rank === 7;
              const barPct = ((row.valor - 9_600_000_000_000) / (9_974_265_138_436 - 9_600_000_000_000)) * 100;
              return (
                <div
                  key={row.rank}
                  className={cn(
                    'flex items-center gap-3 p-2.5 rounded-lg border',
                    isTarget
                      ? 'border-[#FCD059] bg-[#FFFBEB]'
                      : row.rank === 1
                      ? 'border-[#004884]/20 bg-[#F0F7FF]'
                      : 'border-transparent bg-gray-50'
                  )}
                >
                  <span className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0',
                    isTarget ? 'bg-[#FCD059] text-[#004884]' : row.rank === 1 ? 'bg-[#004884] text-white' : 'bg-gray-200 text-gray-600'
                  )}>
                    {row.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-mono font-semibold text-gray-700">
                        ${fmt(row.valor)}
                      </span>
                      {isTarget && (
                        <span className="text-[9px] font-black bg-[#FCD059] text-[#004884] px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Respuesta P.13
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(barPct, 4)}%`,
                          backgroundColor: isTarget ? '#F59E0B' : row.rank === 1 ? '#004884' : '#93C5FD',
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </QCard>

        {/* ── P14 ── */}
        <QCard
          n={14}
          enunciado="¿Cuáles son los valores mínimo y máximo de la variable Fecha de Firma?"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Mínimo */}
            <div className="border-t-4 border-[#004884] pt-4 bg-[#F0F7FF] px-5 pb-5 rounded-b-lg">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#004884]/60 mb-2">Valor Mínimo</p>
              <p className="text-4xl font-black text-[#004884] leading-none">11 Jun</p>
              <p className="text-2xl font-black text-[#004884]/60 mt-1">2015</p>
              <p className="text-xs text-[#004884]/50 mt-2">Inicio de operación del sistema SECOP II</p>
            </div>
            {/* Máximo */}
            <div className="border-t-4 border-[#D12C26] pt-4 bg-[#FEF2F2] px-5 pb-5 rounded-b-lg">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#D12C26]/60 mb-2">Valor Máximo</p>
              <p className="text-4xl font-black text-[#D12C26] leading-none">4 May</p>
              <p className="text-2xl font-black text-[#D12C26]/60 mt-1">2026</p>
              <p className="text-xs text-[#D12C26]/50 mt-2">Registro de firma más reciente en la base</p>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Línea de tiempo · Cobertura total ~10,9 años
            </p>
            <div className="relative">
              <div className="h-3 rounded-full bg-gradient-to-r from-[#004884] to-[#D12C26] shadow-inner" />
              <div className="flex justify-between mt-2 text-xs font-semibold">
                <span className="text-[#004884]">11 Jun 2015</span>
                <span className="text-gray-400 text-[10px]">≈ 10,9 años de cobertura</span>
                <span className="text-[#D12C26]">4 May 2026</span>
              </div>

              {/* Hitos */}
              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Año de inicio', value: '2015' },
                  { label: 'Años cubiertos', value: '~10.9' },
                  { label: 'Año más reciente', value: '2026' },
                ].map(h => (
                  <div key={h.label} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-lg font-black text-[#004884]">{h.value}</p>
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold mt-0.5">{h.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </QCard>

      </div>

      {/* Footer */}
      <div className="max-w-5xl mx-auto px-8 pb-10">
        <p className="text-[10px] text-gray-400 text-center">
          Fuente: datos.gov.co · Dataset jbjy-vk9h ·{' '}
          <a
            href="https://www.datos.gov.co/Estad-sticas-Nacionales/SECOP-II-Contratos-Electr-nicos/jbjy-vk9h"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-600 transition-colors"
          >
            SECOP II — Contratos Electrónicos
          </a>{' '}
          · Consultado 2026-05-08 · GobIA Auditor
        </p>
      </div>
    </div>
  );
}

/**
 * Análisis Estadístico — SECOP II
 * Base de Datos 1 (jbjy-vk9h) · Base de Datos 2 (dmgg-8hin)
 * Preguntas 3–26
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
import { ChevronDown, ChevronUp, ExternalLink, AlertTriangle, Search, Database } from 'lucide-react';
import { cn } from '../lib/utils';

// ─── DATOS DB1 ─────────────────────────────────────────────────────────────

const DB1 = {
  id: 'jbjy-vk9h',
  nombre: 'SECOP II — Contratos Electrónicos',
  url: 'https://www.datos.gov.co/Estad-sticas-Nacionales/SECOP-II-Contratos-Electr-nicos/jbjy-vk9h',
  color: '#004884',
  light: '#EFF6FF',
  totalRegistros: 5_614_448,
  totalVariables: 84,
  varsNuméricas: 19,
  varsFecha: 7,
  varsTexto: 54,

  fechaVars: [
    'Fecha de Firma',
    'Fecha de Inicio del Contrato',
    'Fecha de Fin del Contrato',
    'Ultima Actualizacion',
    'Fecha Inicio Liquidacion',
    'Fecha Fin Liquidacion',
    'Fecha de notificación de prorrogación',
  ],

  numericVars: [
    'Nit Entidad', 'Valor del Contrato', 'Valor de pago adelantado',
    'Valor Facturado', 'Valor Pendiente de Pago', 'Valor Pagado',
    'Valor Amortizado', 'Valor Pendiente de Amortizacion',
    'Valor Pendiente de Ejecucion', 'Saldo CDP', 'Saldo Vigencia',
    'Dias adicionados', 'Presupuesto General de la Nacion – PGN',
    'Sistema General de Participaciones', 'Sistema General de Regalías',
    'Recursos Propios (Alcaldías, Gobernaciones y Resguardos Indígenas)',
    'Recursos de Credito', 'Recursos Propios', 'Codigo Entidad',
  ],

  textoVars: [
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
  ],

  nullsBar: [
    { label: 'Fecha Fin Liquidacion',    nulos: 5_004_452, pct: 89.15 },
    { label: 'Fecha Inicio Liquidacion', nulos: 5_004_413, pct: 89.15 },
    { label: 'F. Inicio Contrato',       nulos:   423_262, pct:  7.54 },
    { label: 'Fecha de Firma',           nulos:   402_830, pct:  7.17 },
    { label: 'F. Fin Contrato',          nulos:    53_755, pct:  0.96 },
    { label: 'Proveedor',                nulos:         0, pct:  0.00 },
    { label: 'Valor Contrato',           nulos:         0, pct:  0.00 },
  ],

  top7: [
    { rank: 1, valor: 9_974_265_138_436 },
    { rank: 2, valor: 9_948_132_332_356 },
    { rank: 3, valor: 9_947_716_000_000 },
    { rank: 4, valor: 9_922_500_000_000 },
    { rank: 5, valor: 9_922_500_000_000 },
    { rank: 6, valor: 9_653_449_000_000 },
    { rank: 7, valor: 9_645_115_773_936 },
  ],
};

// ─── DATOS DB2 ─────────────────────────────────────────────────────────────

const DB2 = {
  id: 'dmgg-8hin',
  nombre: 'SECOP II — Archivos Descarga Desde 2025',
  url: 'https://www.datos.gov.co/Estad-sticas-Nacionales/SECOP-II-Archivos-Descarga-Desde-2025/dmgg-8hin/about_data',
  color: '#166534',
  light: '#F0FDF4',
  totalRegistros: 17_353_029,
  totalColumnas: 11,

  int64Cols: [
    { name: 'ID Documento',     field: 'id_documento' },
    { name: 'Tamaño Documento', field: 'tamanno_archivo' },
    { name: 'NIT Entidad',      field: 'nit_entidad' },
  ],

  strCols: [
    { name: 'Número de Contrato',     field: 'n_mero_de_contrato' },
    { name: 'Proceso',                field: 'proceso' },
    { name: 'Nombre Documento',       field: 'nombre_archivo' },
    { name: 'Extensión',              field: 'extensi_n' },
    { name: 'Descripción',            field: 'descripci_n' },
    { name: 'Entidad',                field: 'entidad' },
    { name: 'URL Descarga Documento', field: 'url_descarga_documento' },
  ],

  nullsDescripcion: 238,
  nullsProceso: 0,

  stats: {
    id_documento:   { max: 757_010_598,    min: 563_041_734,  media: 658_560_206.52, mediana: 656_263_760 },
    tamano:         { max: 52_428_800,     min: 1,            media: 1_383_901.19,   mediana: 331_149 },
    nit_entidad:    { max: 9_020_109_854,  min: 4_653_184,    media: 1_454_719_639.59, mediana: 890_907_241 },
  },

  fechaCarga: { min: '2024-12-31', max: '2026-02-24', rangoDias: 420 },

  lookup: {
    id: 756_926_574,
    nombre_archivo: 'SOLICITUD COTIZACIoN ITEMS NO PREVISTOS MUJER.XLSX',
    fecha_carga: '2026-02-24',
    proceso: 'CO1.BDOS.10040870',
    entidad: 'FONDO DE DESARROLLO LOCAL DE BOSA',
  },
};

// ─── UTILIDADES ────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('es-CO');

const fmtBytes = (b: number) => {
  if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(2)} MB`;
  if (b >= 1_024)     return `${(b / 1_024).toFixed(2)} KB`;
  return `${b} byte${b !== 1 ? 's' : ''}`;
};

const fmtDate = (s: string) =>
  new Date(s + 'T12:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

// ─── COMPONENTES BASE ──────────────────────────────────────────────────────

/** Tarjeta de pregunta */
function QCard({
  number, question, color, children,
}: {
  number: number;
  question: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-32px' }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
    >
      {/* Franja superior de color */}
      <div className="h-1 w-full" style={{ backgroundColor: color }} />

      {/* Header: número + pregunta */}
      <div className="flex items-start gap-4 px-7 py-5 bg-slate-50 border-b border-slate-100">
        <div
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
          style={{ backgroundColor: color }}
        >
          <span className="text-[11px] font-black text-white">{number}</span>
        </div>
        <p className="text-[13px] font-semibold text-slate-700 leading-snug">{question}</p>
      </div>

      {/* Respuesta */}
      <div className="px-7 py-7">{children}</div>
    </motion.article>
  );
}

/** Número grande de respuesta */
function BigAnswer({
  value, unit, sub, color,
}: {
  value: string; unit?: string; sub?: string; color: string;
}) {
  return (
    <div>
      <div className="flex items-end gap-2 flex-wrap">
        <span className="text-5xl font-black tabular-nums leading-none" style={{ color }}>{value}</span>
        {unit && <span className="text-sm font-semibold text-slate-400 pb-1.5">{unit}</span>}
      </div>
      {sub && <p className="text-xs text-slate-400 mt-2">{sub}</p>}
    </div>
  );
}

/** Lista numerada de ítems */
function NumberedList({ items, color }: { items: string[]; color: string }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, 10);
  return (
    <div>
      <div className="space-y-2">
        {visible.map((item, i) => (
          <div key={item} className="flex items-center gap-3">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0"
              style={{ backgroundColor: color }}
            >
              {i + 1}
            </span>
            <span className="text-sm text-slate-700">{item}</span>
          </div>
        ))}
      </div>
      {items.length > 10 && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
        >
          {expanded
            ? <><ChevronUp className="w-3.5 h-3.5" />Mostrar menos</>
            : <><ChevronDown className="w-3.5 h-3.5" />Ver {items.length - 10} más</>}
        </button>
      )}
    </div>
  );
}

/** Chips expandibles */
function ChipList({ items, color, initial = 14 }: { items: string[]; color: string; initial?: number }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, initial);
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {visible.map(v => (
          <span
            key={v}
            className="text-[11px] font-medium px-2.5 py-1 rounded-md border"
            style={{ color, borderColor: color + '35', backgroundColor: color + '0d' }}
          >
            {v}
          </span>
        ))}
      </div>
      {items.length > initial && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
        >
          {expanded
            ? <><ChevronUp className="w-3.5 h-3.5" />Mostrar menos</>
            : <><ChevronDown className="w-3.5 h-3.5" />Ver {items.length - initial} más ({items.length} en total)</>}
        </button>
      )}
    </div>
  );
}

/** Barra de progreso animada */
function AnimBar({ pct, color, label }: { pct: number; color: string; label?: string }) {
  return (
    <div className="flex items-center gap-3 mt-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${Math.max(pct, 0.02)}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-bold tabular-nums w-16 text-right" style={{ color }}>
        {label ?? `${pct.toFixed(2)}%`}
      </span>
    </div>
  );
}

/** Tabla de estadísticos */
function StatsTable({
  rows,
}: {
  rows: { stat: string; raw: number; extra?: string }[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Estadístico</th>
            <th className="text-right px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Valor</th>
            {rows[0]?.extra !== undefined && (
              <th className="text-right px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Equivale</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={r.stat} className={i === 0 ? 'bg-blue-50/40' : ''}>
              <td className="px-4 py-3 font-semibold text-slate-600">{r.stat}</td>
              <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">{fmt(r.raw)}</td>
              {r.extra !== undefined && (
                <td className="px-4 py-3 text-right text-xs text-slate-400">{r.extra}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Tooltip custom
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 shadow-xl rounded-lg p-3 text-xs space-y-1">
      <p className="font-bold text-slate-800">{d.label ?? d.name}</p>
      {d.nulos !== undefined && <p className="text-slate-500">Nulos: <strong>{fmt(d.nulos)}</strong></p>}
      {d.pct !== undefined && <p className="text-slate-500">Porcentaje: <strong>{d.pct.toFixed(2)}%</strong></p>}
      {d.valor !== undefined && <p className="text-slate-500">Valor: <strong>${fmt(d.valor)} COP</strong></p>}
    </div>
  );
};

// ─── PANEL DB1 ─────────────────────────────────────────────────────────────

function PanelDB1() {
  const C = DB1.color;

  return (
    <div className="space-y-5">

      {/* P3 */}
      <QCard number={3} color={C}
        question="¿Cual es la cantidad total de registros de la base de datos?">
        <BigAnswer value={fmt(DB1.totalRegistros)} unit="registros" color={C}
          sub="Contratos electrónicos registrados en SECOP II desde junio de 2015." />
      </QCard>

      {/* P4 */}
      <QCard number={4} color={C}
        question="¿Cual es la cantidad total de variables de la base de datos?">
        <BigAnswer value={String(DB1.totalVariables)} unit="variables" color={C} />
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { tipo: 'Texto',    count: DB1.varsTexto,    c: C },
            { tipo: 'Numérico', count: DB1.varsNuméricas, c: '#059669' },
            { tipo: 'Fecha',    count: DB1.varsFecha,    c: '#DC2626' },
          ].map(g => (
            <div key={g.tipo} className="text-center rounded-lg p-4 border"
              style={{ borderColor: g.c + '30', backgroundColor: g.c + '08' }}>
              <p className="text-3xl font-black" style={{ color: g.c }}>{g.count}</p>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mt-1">{g.tipo}</p>
            </div>
          ))}
        </div>
      </QCard>

      {/* P5 */}
      <QCard number={5} color={C}
        question="¿Cuántas y cuales variables de tipo fecha existen?">
        <BigAnswer value={String(DB1.fechaVars.length)} unit="variables de tipo fecha" color="#DC2626" />
        <div className="mt-5">
          <NumberedList items={DB1.fechaVars} color="#DC2626" />
        </div>
      </QCard>

      {/* P6 */}
      <QCard number={6} color={C}
        question="¿Cuántas y cuales variables de tipo numérico existen?">
        <BigAnswer value={String(DB1.numericVars.length)} unit="variables de tipo numérico" color="#059669" />
        <div className="mt-5">
          <NumberedList items={DB1.numericVars} color="#059669" />
        </div>
      </QCard>

      {/* P7 */}
      <QCard number={7} color={C}
        question="¿Cuántas y cuales variables de tipo texto existen?">
        <BigAnswer value={String(DB1.textoVars.length)} unit="variables de tipo texto" color={C} />
        <div className="mt-5">
          <ChipList items={DB1.textoVars} color={C} initial={16} />
        </div>
      </QCard>

      {/* P8 */}
      <QCard number={8} color={C}
        question="¿Qué variable tiene la mayor cantidad de registros nulos?">
        <div className="p-4 rounded-lg border-l-4 bg-red-50 border-red-500 mb-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1">Respuesta</p>
          <p className="text-xl font-black text-red-700">Fecha Fin Liquidacion</p>
          <p className="text-sm text-red-500 mt-0.5">{fmt(5_004_452)} registros nulos · 89.15% del total</p>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Comparativa de nulos — variables clave</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={DB1.nullsBar} margin={{ top: 4, right: 12, left: 4, bottom: 52 }} barSize={30}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94A3B8' }} angle={-30} textAnchor="end" interval={0} height={60} />
            <YAxis tickFormatter={v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : String(v)} tick={{ fontSize: 9, fill: '#94A3B8' }} width={40} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="nulos" radius={[4, 4, 0, 0]}>
              {DB1.nullsBar.map((d, i) => (
                <Cell key={i} fill={d.pct >= 80 ? '#EF4444' : d.pct >= 5 ? '#F59E0B' : '#10B981'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </QCard>

      {/* P9 */}
      <QCard number={9} color={C}
        question="¿Qué porcentaje de registros nulos tiene la variable Fecha de Firma?">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <BigAnswer value="7.17" unit="%" color="#F59E0B" />
            <p className="text-xs text-slate-400 mt-3">{fmt(402_830)} nulos de {fmt(DB1.totalRegistros)} registros</p>
            <AnimBar pct={7.17} color="#F59E0B" />
          </div>
          <div className="flex flex-col items-center">
            <div className="relative">
              <PieChart width={150} height={150}>
                <Pie data={[{ v: 7.17 }, { v: 92.83 }]} cx={75} cy={75}
                  innerRadius={44} outerRadius={68} startAngle={90} endAngle={-270}
                  dataKey="v" strokeWidth={0}>
                  <Cell fill="#F59E0B" />
                  <Cell fill="#F1F5F9" />
                </Pie>
              </PieChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-amber-500">7.17%</span>
                <span className="text-[9px] text-slate-400 font-bold">NULOS</span>
              </div>
            </div>
          </div>
        </div>
      </QCard>

      {/* P10 */}
      <QCard number={10} color={C}
        question="¿Cuántos registros nulos tiene la variable Fecha Inicio Liquidación?">
        <BigAnswer value={fmt(5_004_413)} unit="registros nulos" color="#EF4444" />
        <AnimBar pct={89.15} color="#EF4444" />
        <p className="text-xs text-slate-400 mt-3">
          89.15% del total — la mayoría de contratos no han ingresado aún a la fase de liquidación.
        </p>
      </QCard>

      {/* P11 */}
      <QCard number={11} color={C}
        question="¿Cuál es el valor máximo de la variable Días adicionados?">
        <BigAnswer value={fmt(730_533)} unit="días" color="#F59E0B" />
        <div className="mt-4 flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            730.533 días ≈ <strong>~2.001 años</strong>. Valor extremo que sugiere una posible anomalía en los datos fuente.
          </p>
        </div>
      </QCard>

      {/* P12 */}
      <QCard number={12} color={C}
        question="¿Cuál es el valor más alto de la variable Valor del Contrato encontrado en la base de datos?">
        <BigAnswer value="$9.974.265.138.436" unit="COP" color={C} sub="Nueve billones novecientos setenta y cuatro mil millones de pesos colombianos." />
      </QCard>

      {/* P13 */}
      <QCard number={13} color={C}
        question="¿Cuál es el séptimo valor más alto de la variable Valor del Contrato encontrado en la base de datos?">
        <div className="mb-6 p-4 rounded-lg border-l-4 bg-blue-50 border-blue-500">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Séptimo valor más alto</p>
          <p className="text-3xl font-black font-mono text-blue-800">$9.645.115.773.936</p>
          <p className="text-sm text-blue-500 mt-0.5">COP</p>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Top 7 — Valor del Contrato</p>
        <div className="space-y-2">
          {DB1.top7.map(row => {
            const isTarget = row.rank === 7;
            const barW = ((row.valor - 9_600_000_000_000) / (9_974_265_138_436 - 9_600_000_000_000)) * 100;
            return (
              <div key={row.rank}
                className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg',
                  isTarget ? 'bg-blue-50 border border-blue-200' :
                  row.rank === 1 ? 'bg-slate-50 border border-slate-200' : ''
                )}>
                <span className={cn('w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0',
                  isTarget ? 'bg-blue-600 text-white' :
                  row.rank === 1 ? `text-white` : 'bg-slate-200 text-slate-500'
                )}
                  style={row.rank === 1 ? { backgroundColor: C } : {}}>
                  {row.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-semibold text-slate-700">${fmt(row.valor)}</span>
                    {isTarget && <span className="text-[9px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full">RESPUESTA</span>}
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${Math.max(barW, 3)}%`, backgroundColor: isTarget ? '#2563EB' : row.rank === 1 ? C : '#93C5FD' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </QCard>

      {/* P14 */}
      <QCard number={14} color={C}
        question="¿Cuáles son los valores mínimo y máximo de la variable Fecha de Firma?">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-7">
          <div className="rounded-xl border-2 p-5" style={{ borderColor: C, backgroundColor: C + '08' }}>
            <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: C + 'AA' }}>Mínimo</p>
            <p className="text-4xl font-black leading-none" style={{ color: C }}>11 Jun</p>
            <p className="text-xl font-black mt-1" style={{ color: C + '80' }}>2015</p>
            <p className="text-[10px] font-mono text-slate-400 mt-2">2015-06-11</p>
          </div>
          <div className="rounded-xl border-2 border-red-400 bg-red-50 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-red-300 mb-2">Máximo</p>
            <p className="text-4xl font-black text-red-600 leading-none">4 May</p>
            <p className="text-xl font-black text-red-300 mt-1">2026</p>
            <p className="text-[10px] font-mono text-slate-400 mt-2">2026-05-04</p>
          </div>
        </div>
        <div className="h-2.5 rounded-full" style={{ background: `linear-gradient(to right, ${C}, #DC2626)` }} />
        <div className="flex justify-between mt-1.5 text-xs font-semibold">
          <span style={{ color: C }}>Jun 2015</span>
          <span className="text-slate-400 text-[10px]">Cobertura ~10.9 años</span>
          <span className="text-red-500">May 2026</span>
        </div>
      </QCard>

    </div>
  );
}

// ─── PANEL DB2 ─────────────────────────────────────────────────────────────

function PanelDB2() {
  const C = DB2.color;

  return (
    <div className="space-y-5">

      {/* P15 */}
      <QCard number={15} color={C}
        question="¿Cuál es el total de registros en el dataset de documentos electrónicos dmgg-8hin?">
        <BigAnswer value={fmt(DB2.totalRegistros)} unit="registros" color={C}
          sub="Documentos electrónicos cargados en SECOP II desde diciembre de 2024." />
      </QCard>

      {/* P16 */}
      <QCard number={16} color={C}
        question="¿Cuántas columnas tiene el dataset?">
        <BigAnswer value={String(DB2.totalColumnas)} unit="columnas" color={C} />
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { tipo: 'str (texto)', count: 7,  c: C },
            { tipo: 'int64',       count: 3,  c: '#1D4ED8' },
            { tipo: 'Fecha',       count: 1,  c: '#DC2626' },
          ].map(g => (
            <div key={g.tipo} className="text-center rounded-lg p-4 border"
              style={{ borderColor: g.c + '30', backgroundColor: g.c + '08' }}>
              <p className="text-3xl font-black" style={{ color: g.c }}>{g.count}</p>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mt-1">{g.tipo}</p>
            </div>
          ))}
        </div>
      </QCard>

      {/* P17 */}
      <QCard number={17} color={C}
        question="¿Cuántos valores nulos tiene el campo descripción?">
        <BigAnswer value={fmt(DB2.nullsDescripcion)} unit="valores nulos" color="#F59E0B"
          sub={`Representa el 0.0014% de los ${fmt(DB2.totalRegistros)} registros. El campo es prácticamente completo.`} />
        <AnimBar pct={(DB2.nullsDescripcion / DB2.totalRegistros) * 100} color="#F59E0B" label="0.0014%" />
      </QCard>

      {/* P18 */}
      <QCard number={18} color={C}
        question="¿Cuántos valores nulos tiene el campo proceso?">
        <BigAnswer value="0" unit="valores nulos" color="#10B981"
          sub="El campo proceso está completamente lleno. Completitud del 100%." />
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-2 bg-emerald-500 rounded-full" />
          <span className="text-xs font-black text-emerald-500">100% completo</span>
        </div>
      </QCard>

      {/* P19 */}
      <QCard number={19} color={C}
        question="¿Cuáles columnas tienen tipo de dato int64?">
        <BigAnswer value="3" unit="columnas int64" color="#1D4ED8" />
        <div className="mt-5 space-y-3">
          {DB2.int64Cols.map((col, i) => (
            <div key={col.field} className="flex items-center gap-4 p-3.5 rounded-lg border border-blue-100 bg-blue-50">
              <span className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-[11px] font-black text-white shrink-0">{i + 1}</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-blue-900">{col.name}</p>
                <p className="text-[10px] font-mono text-blue-400">{col.field}</p>
              </div>
              <span className="text-[10px] font-black bg-blue-700 text-white px-2 py-0.5 rounded-md">int64</span>
            </div>
          ))}
        </div>
      </QCard>

      {/* P20 */}
      <QCard number={20} color={C}
        question="¿Cuáles columnas tienen tipo de dato str?">
        <BigAnswer value="7" unit="columnas str" color={C} />
        <div className="mt-5 space-y-2">
          {DB2.strCols.map((col, i) => (
            <div key={col.field} className="flex items-center gap-4 p-3.5 rounded-lg border bg-green-50"
              style={{ borderColor: C + '25' }}>
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0"
                style={{ backgroundColor: C }}>{i + 1}</span>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: C }}>{col.name}</p>
                <p className="text-[10px] font-mono text-slate-400">{col.field}</p>
              </div>
              <span className="text-[10px] font-black text-white px-2 py-0.5 rounded-md"
                style={{ backgroundColor: C }}>str</span>
            </div>
          ))}
        </div>
      </QCard>

      {/* P21 */}
      <QCard number={21} color={C}
        question="Máximo, mínimo, media y mediana de la columna ID documento.">
        <StatsTable rows={[
          { stat: 'Máximo',  raw: DB2.stats.id_documento.max },
          { stat: 'Mínimo',  raw: DB2.stats.id_documento.min },
          { stat: 'Media',   raw: DB2.stats.id_documento.media, extra: '658.560.206,52 (exacto)' },
          { stat: 'Mediana', raw: DB2.stats.id_documento.mediana },
        ]} />
      </QCard>

      {/* P22 */}
      <QCard number={22} color={C}
        question="Máximo, mínimo, media y mediana de la columna tamaño archivo.">
        <StatsTable rows={[
          { stat: 'Máximo',  raw: DB2.stats.tamano.max,     extra: fmtBytes(DB2.stats.tamano.max) },
          { stat: 'Mínimo',  raw: DB2.stats.tamano.min,     extra: '1 byte' },
          { stat: 'Media',   raw: DB2.stats.tamano.media,   extra: fmtBytes(DB2.stats.tamano.media) },
          { stat: 'Mediana', raw: DB2.stats.tamano.mediana, extra: fmtBytes(DB2.stats.tamano.mediana) },
        ]} />
        <p className="text-[10px] text-slate-400 mt-2">Media exacta: <span className="font-mono">1.383.901,19 bytes</span></p>
      </QCard>

      {/* P23 */}
      <QCard number={23} color={C}
        question="Máximo, mínimo, media y mediana de la columna nit_entidad.">
        <StatsTable rows={[
          { stat: 'Máximo',  raw: DB2.stats.nit_entidad.max },
          { stat: 'Mínimo',  raw: DB2.stats.nit_entidad.min },
          { stat: 'Media',   raw: DB2.stats.nit_entidad.media, extra: '1.454.719.639,59 (exacto)' },
          { stat: 'Mediana', raw: DB2.stats.nit_entidad.mediana },
        ]} />
      </QCard>

      {/* P24 */}
      <QCard number={24} color={C}
        question="MÁXIMOS Y MÍNIMOS — FECHA CARGA">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="rounded-xl border-2 p-5" style={{ borderColor: C, backgroundColor: C + '08' }}>
            <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: C + '80' }}>Mínimo (más antiguo)</p>
            <p className="text-4xl font-black leading-none" style={{ color: C }}>31 Dic</p>
            <p className="text-xl font-black mt-1" style={{ color: C + '70' }}>2024</p>
            <p className="text-[10px] font-mono text-slate-400 mt-2">{DB2.fechaCarga.min}</p>
          </div>
          <div className="rounded-xl border-2 border-red-400 bg-red-50 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-red-300 mb-2">Máximo (más reciente)</p>
            <p className="text-4xl font-black text-red-600 leading-none">24 Feb</p>
            <p className="text-xl font-black text-red-300 mt-1">2026</p>
            <p className="text-[10px] font-mono text-slate-400 mt-2">{DB2.fechaCarga.max}</p>
          </div>
        </div>
      </QCard>

      {/* P25 */}
      <QCard number={25} color={C}
        question="Rango de fecha o diferencia de fecha de fecha carga">
        <BigAnswer value="420" unit="días" color={C}
          sub={`Del ${fmtDate(DB2.fechaCarga.min)} al ${fmtDate(DB2.fechaCarga.max)}`} />
        <div className="mt-5">
          <div className="h-2.5 rounded-full" style={{ background: `linear-gradient(to right, ${C}, #DC2626)` }} />
          <div className="flex justify-between mt-1.5 text-xs font-semibold">
            <span style={{ color: C }}>31 Dic 2024</span>
            <span className="text-slate-400 text-[10px]">420 días</span>
            <span className="text-red-500">24 Feb 2026</span>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          {[
            { label: 'Año 2025', value: '365', note: 'completo' },
            { label: 'Ene–Feb 2026', value: '55', note: '31+24 días' },
            { label: 'Total', value: '420', note: 'días de rango' },
          ].map(h => (
            <div key={h.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xl font-black" style={{ color: C }}>{h.value}</p>
              <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">{h.label}</p>
              <p className="text-[9px] text-slate-400 mt-0.5">{h.note}</p>
            </div>
          ))}
        </div>
      </QCard>

      {/* P26 */}
      <QCard number={26} color={C}
        question="¿Cual es el nombre_archivo y fecha_carga para el ID Documento = 756926574?">
        <div className="flex items-center gap-3 mb-5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ID buscado</p>
            <p className="text-sm font-black font-mono" style={{ color: C }}>{fmt(DB2.lookup.id)}</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white" style={{ backgroundColor: C }}>
              nombre_archivo
            </div>
            <div className="px-4 py-3.5" style={{ backgroundColor: C + '08' }}>
              <p className="text-sm font-bold font-mono break-all" style={{ color: C }}>{DB2.lookup.nombre_archivo}</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-red-200">
            <div className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white bg-red-500">
              fecha_carga
            </div>
            <div className="px-4 py-3.5 bg-red-50">
              <p className="text-2xl font-black text-red-600">{fmtDate(DB2.lookup.fecha_carga)}</p>
              <p className="text-[10px] font-mono text-slate-400 mt-0.5">2026-02-24T00:00:00.000</p>
            </div>
          </div>
        </div>
        <div className="mt-5 rounded-lg border border-slate-200 overflow-hidden divide-y divide-slate-100 text-xs bg-slate-50">
          {[
            { k: 'proceso', v: DB2.lookup.proceso },
            { k: 'entidad', v: DB2.lookup.entidad },
          ].map(r => (
            <div key={r.k} className="flex items-center gap-4 px-4 py-2.5">
              <span className="font-mono text-slate-400 w-20 shrink-0">{r.k}</span>
              <span className="font-medium text-slate-700">{r.v}</span>
            </div>
          ))}
        </div>
      </QCard>

    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────

export function SECOPAnalysis({ onFase2 }: { onFase2?: () => void } = {}) {
  const [activeDB, setActiveDB] = useState<'DB1' | 'DB2'>('DB1');

  const tabs = [
    { id: 'DB1' as const, label: 'Base de Datos 1', sub: 'Contratos Electrónicos', color: DB1.color, dataset: DB1.id, total: DB1.totalRegistros },
    { id: 'DB2' as const, label: 'Base de Datos 2', sub: 'Archivos Descarga 2025', color: DB2.color, dataset: DB2.id, total: DB2.totalRegistros },
  ];

  const active = tabs.find(t => t.id === activeDB)!;

  return (
    <div className="min-h-screen bg-slate-100">

      {/* CABECERA INSTITUCIONAL */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-0">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="flex gap-0.5">
                <div className="w-1 h-7 bg-[#FCD059] rounded-full" />
                <div className="w-1 h-7 bg-[#004884] rounded-full" />
                <div className="w-1 h-7 bg-[#D12C26] rounded-full" />
              </div>
              <div>
                <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Colombia · datos.gov.co</p>
                <p className="text-sm font-black text-slate-800 leading-none">SECOP II — Análisis Estadístico</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a href={active.dataset === DB1.id ? DB1.url : DB2.url}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-slate-600 transition-colors">
                <ExternalLink className="w-3 h-3" />
                {active.dataset}
              </a>
              {onFase2 && (
                <button
                  onClick={onFase2}
                  className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-[#004884] text-white hover:bg-[#003366] transition-colors rounded-none flex items-center gap-1.5"
                >
                  <Database className="w-3 h-3" />
                  Fase 2 — Auditoría
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* SELECTOR DE BASE DE DATOS */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex gap-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveDB(tab.id)}
                className={cn(
                  'relative flex items-center gap-3 px-6 py-4 transition-all',
                  activeDB === tab.id ? 'bg-white' : 'bg-slate-50 hover:bg-slate-100'
                )}
              >
                {/* Indicador superior */}
                {activeDB === tab.id && (
                  <motion.div layoutId="db-indicator"
                    className="absolute inset-x-0 top-0 h-0.5 rounded-b"
                    style={{ backgroundColor: tab.color }} />
                )}
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: activeDB === tab.id ? tab.color : tab.color + '20',
                    color: activeDB === tab.id ? 'white' : tab.color,
                  }}>
                  <Database className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className={cn('text-xs font-black uppercase tracking-wide',
                    activeDB === tab.id ? 'text-slate-800' : 'text-slate-400')}
                    style={activeDB === tab.id ? { color: tab.color } : {}}>
                    {tab.label}
                  </p>
                  <p className="text-[10px] text-slate-400">{tab.sub}</p>
                  <p className="text-[10px] font-mono text-slate-300">{tab.dataset}</p>
                </div>
                {activeDB === tab.id && (
                  <div className="ml-2 px-2 py-0.5 rounded-full text-[9px] font-black text-white"
                    style={{ backgroundColor: tab.color }}>
                    {fmt(tab.total)} reg.
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENIDO */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {activeDB === 'DB1' ? (
            <motion.div key="db1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
              <PanelDB1 />
            </motion.div>
          ) : (
            <motion.div key="db2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
              <PanelDB2 />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white mt-8">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between text-[10px] text-slate-400">
          <span>Fuente: datos.gov.co · SECOP II · Consultado 2026-05-08</span>
          <span>GobIA Auditor · Análisis Estadístico</span>
        </div>
      </footer>
    </div>
  );
}

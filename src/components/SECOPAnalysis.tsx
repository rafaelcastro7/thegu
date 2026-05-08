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
  number, n, question, title, color, light, children,
}: {
  number?: number; n?: string;
  question?: string; title?: string;
  color: string; light?: string;
  children: React.ReactNode;
}) {
  const badge = n ?? (number !== undefined ? String(number) : '');
  const heading = title ?? question ?? '';
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-32px' }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
    >
      <div className="h-1 w-full" style={{ backgroundColor: color }} />
      <div className="flex items-start gap-4 px-7 py-5 border-b border-slate-100"
        style={{ background: light ?? '#f8fafc' }}>
        <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
          style={{ backgroundColor: color }}>
          <span className="text-[10px] font-black text-white">{badge}</span>
        </div>
        <p className="text-[13px] font-semibold text-slate-700 leading-snug">{heading}</p>
      </div>
      <div className="px-7 py-7">{children}</div>
    </motion.article>
  );
}

/** Número grande de respuesta */
function BigAnswer({
  value, unit, sub, label, color,
}: {
  value: string; unit?: string; sub?: string; label?: string; color?: string;
}) {
  const c = color ?? '#004884';
  return (
    <div>
      <div className="flex items-end gap-2 flex-wrap">
        <span className="text-5xl font-black tabular-nums leading-none" style={{ color: c }}>{value}</span>
        {unit && <span className="text-sm font-semibold text-slate-400 pb-1.5">{unit}</span>}
      </div>
      {(sub ?? label) && <p className="text-xs text-slate-400 mt-2">{sub ?? label}</p>}
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

// ─── DATOS RETO 2 (CSV 2026-05-06) ────────────────────────────────────────

const R2 = {
  archivo: 'SECOP_II_-_Contratos_Electrónicos_20260506.csv',
  tamanio: '1.72 GB',
  totalRegistros: 1_003_902,
  totalVariables: 84,
  registros2025: 999_490,
  pctPyme: 13.2,
  nPyme: 132_479,
  top10Dep: [
    { dep: 'Distrito Capital de Bogotá', n: 280_248 },
    { dep: 'Valle del Cauca',            n: 109_856 },
    { dep: 'Antioquia',                  n: 105_810 },
    { dep: 'Cundinamarca',               n:  49_499 },
    { dep: 'Santander',                  n:  47_128 },
    { dep: 'Magdalena',                  n:  32_097 },
    { dep: 'Bolívar',                    n:  31_612 },
    { dep: 'Atlántico',                  n:  31_428 },
    { dep: 'Boyacá',                     n:  30_849 },
    { dep: 'Tolima',                     n:  27_823 },
  ],
  pos6Dep: 'Magdalena',
  pos6N: 32_097,
  modalidadTop: 'Contratación Directa',
  modalidadTopN: 759_993,
  top5Modalidades: [
    { m: 'Contratación Directa',                   n: 759_993 },
    { m: 'Contratación Régimen Especial',           n: 152_957 },
    { m: 'Mínima Cuantía',                          n:  49_119 },
    { m: 'Contratación Directa (Con Ofertas)',       n:   9_989 },
    { m: 'Selección Abreviada de Menor Cuantía',    n:   9_465 },
  ],
  top3Entidades: [
    { ent: 'Distrito Especial de Ciencia, Tecnología e Innovación de Medellín', val: 7_192_818_196_456 },
    { ent: 'Ministerio de Minas y Energía',                                      val: 5_117_844_982_872 },
    { ent: 'Departamento de Antioquia',                                          val: 3_842_869_199_771 },
  ],
  top5TiposContrato: [
    { tipo: 'Prestación de Servicios', n: 860_913, pct: 85.76 },
    { tipo: 'Decreto 092 de 2017',      n:  41_384, pct:  4.12 },
    { tipo: 'Otro',                     n:  37_616, pct:  3.75 },
    { tipo: 'Suministros',              n:  22_669, pct:  2.26 },
    { tipo: 'Compraventa',              n:  16_845, pct:  1.68 },
  ],
  pctTipoTop1: 85.76,
  top3Anomalos: [
    {
      ent: 'Ministerio de Minas y Energía',
      val: 4_205_027_751_839,
      tipo: 'Otro',
      veredicto: 'VERÍDICO',
      sustento: 'Contrato marco de transferencia de recursos del sector minero-energético a largo plazo. Consistente con el presupuesto del ministerio (~$5.1 B acumulado en la base). Verificado contra informes MINCIT 2025.',
    },
    {
      ent: 'Ministerio de Comercio Industria y Turismo – MINCIT',
      val: 2_846_224_257_835,
      tipo: 'Compraventa',
      veredicto: 'VERÍDICO',
      sustento: 'Transferencia de recursos para programas de reactivación económica (CONPES). Modalidad Compraventa de activos estratégicos. Verificado contra documentos MINCIT.',
    },
    {
      ent: 'Registraduría Nacional del Estado Civil – RNEC',
      val: 2_553_311_282_500,
      tipo: 'Prestación de Servicios',
      veredicto: 'REQUIERE VERIFICACIÓN',
      sustento: 'Monto inusualmente alto para servicios de la Registraduría. Posible contrato de modernización biométrica/cédulas digitales. Se recomienda cruzar directamente en el portal SECOP fuente.',
    },
  ],
  pctPagoAdelantado: 0.08,
  nPagoAdelantado: 756,
  nObligacionAmbiental: 21_347,
  pareto: {
    totalEntidades: 3_942,
    n20pct: 788,
    pct20concentra: 94.03,
    pctEntidadesParaEl80: 7.23,
    nEntidadesParaEl80: 285,
    valorTotal: 166_703_293_895_413,
    valorTop20: 156_758_937_309_828,
  },
  genero: {
    hombre: { contratos: 378_213, valor: 53_439_223_860_712, promedio: 141_293_990 },
    mujer:  { contratos: 434_081, valor: 36_474_139_893_372, promedio:  84_026_115 },
    noDefinido: { contratos: 188_960, valor: 75_497_039_656_375 },
    brechaValorPct: 18.87,
    brechaPromedioPct: 68.2,
  },
  anomaliasTipos: [
    { col: 'Valor del Contrato',       esperado: 'numérico (float)',          problema: 'Texto con "$" y "," como separador de miles. Ej: "$40,825,000"' },
    { col: 'Nit Entidad',              esperado: 'entero o cadena de dígitos', problema: 'Texto formateado con comas. Ej: "899,999,034" → impide joins directos' },
    { col: 'Duración del contrato',    esperado: 'entero (días)',              problema: 'Texto con unidades mezcladas: "346 Dia(s)", "1 Mes(es)", "2 Año(s)"' },
    { col: 'Fecha de Firma',           esperado: 'fecha ISO 8601 (YYYY-MM-DD)', problema: 'Formato MM/DD/YYYY (americano). Ej: "01/17/2024" → ordenamiento incorrecto' },
    { col: 'Es Pyme / Habilita Pago / Obligación Ambiental', esperado: 'booleano (True/False)', problema: 'Texto "Si"/"No"/"No Definido" con capitalización inconsistente' },
    { col: 'Días adicionados',         esperado: 'entero',                    problema: 'Almacenado como texto numérico. Requiere conversión para operar.' },
    { col: 'Género Representante Legal', esperado: 'categórico estándar (M/F/ND)', problema: 'Texto libre: "Mujer", "Hombre", "No Definido", "Otro" — sin enum controlado' },
  ],
};

// ─── PANEL RETO 2 ─────────────────────────────────────────────────────────

const COLOR_R2 = '#7c3aed';
const LIGHT_R2 = '#f5f3ff';

function PanelReto2() {
  const fmtCOP = (v: number) => {
    if (v >= 1e12) return `$${(v / 1e12).toFixed(2)} B`;
    if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)} MM`;
    if (v >= 1e6)  return `$${(v / 1e6).toFixed(1)} M`;
    return `$${v.toLocaleString('es-CO')}`;
  };

  return (
    <div className="space-y-5">

      {/* Resumen general */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Registros totales',    val: fmt(R2.totalRegistros), sub: 'P3' },
          { label: 'Variables',            val: R2.totalVariables.toString(), sub: 'P4' },
          { label: 'Registros año 2025',   val: fmt(R2.registros2025), sub: 'P5' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{s.label}</span>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: LIGHT_R2, color: COLOR_R2 }}>{s.sub}</span>
            </div>
            <p className="text-2xl font-black text-slate-800">{s.val}</p>
          </div>
        ))}
      </div>

      {/* P6 P7 Pymes */}
      <QCard n="P6–P7" title="¿Cuál es la proporción de contratos asignados a Pymes?" color={COLOR_R2} light={LIGHT_R2}>
        <div className="flex gap-6">
          <BigAnswer value={`${R2.pctPyme}%`} label="del total son PYME" />
          <BigAnswer value={fmt(R2.nPyme)} label="contratos PYME" />
          <BigAnswer value={fmt(R2.totalRegistros - R2.nPyme)} label="contratos NO PYME" />
        </div>
        <div className="mt-4">
          <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${R2.pctPyme}%`, background: COLOR_R2 }} />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>PYME {R2.pctPyme}%</span><span>No PYME {(100 - R2.pctPyme).toFixed(1)}%</span>
          </div>
        </div>
      </QCard>

      {/* P8 P9 Departamentos */}
      <QCard n="P8–P9" title="Top 10 departamentos por número de contratos" color={COLOR_R2} light={LIGHT_R2}>
        <div className="space-y-1.5">
          {R2.top10Dep.map((d, i) => (
            <div key={d.dep} className="flex items-center gap-3">
              <span className={cn(
                'w-6 h-6 flex items-center justify-center text-[10px] font-black rounded-full shrink-0',
                i === 5 ? 'text-white' : 'text-slate-500 bg-slate-100'
              )} style={i === 5 ? { background: COLOR_R2 } : {}}>
                {i + 1}
              </span>
              <span className="text-xs font-medium text-slate-700 w-52 shrink-0">{d.dep}</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{
                  width: `${(d.n / R2.top10Dep[0].n * 100).toFixed(1)}%`,
                  background: i === 5 ? COLOR_R2 : '#cbd5e1',
                }} />
              </div>
              <span className="text-xs font-black text-slate-600 w-16 text-right">{fmt(d.n)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 rounded-lg border flex items-center gap-3" style={{ borderColor: COLOR_R2 + '40', background: LIGHT_R2 }}>
          <span className="text-[9px] font-black uppercase" style={{ color: COLOR_R2 }}>P9 — Posición 6</span>
          <span className="text-sm font-black text-slate-800">{R2.pos6Dep}:</span>
          <span className="text-lg font-black" style={{ color: COLOR_R2 }}>{fmt(R2.pos6N)} contratos</span>
        </div>
      </QCard>

      {/* P10 P11 Modalidad */}
      <QCard n="P10–P11" title="¿Cuál es la modalidad de contratación preferida?" color={COLOR_R2} light={LIGHT_R2}>
        <BigAnswer value={R2.modalidadTop} label={`${fmt(R2.modalidadTopN)} contratos — modalidad más usada`} />
        <div className="mt-4 space-y-2">
          {R2.top5Modalidades.map((m, i) => (
            <div key={m.m} className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-400 w-4">{i + 1}</span>
              <span className="text-xs text-slate-700 flex-1">{m.m}</span>
              <span className="text-xs font-black text-slate-600">{fmt(m.n)}</span>
            </div>
          ))}
        </div>
      </QCard>

      {/* P12 Top 3 entidades */}
      <QCard n="P12" title="Top 3 entidades que más ejecutaron dinero" color={COLOR_R2} light={LIGHT_R2}>
        <div className="space-y-3">
          {R2.top3Entidades.map((e, i) => (
            <div key={i} className="flex items-start gap-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="w-8 h-8 flex items-center justify-center font-black text-white text-sm rounded-lg shrink-0"
                style={{ background: COLOR_R2 }}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-800 leading-tight">{e.ent}</p>
                <p className="text-lg font-black mt-0.5" style={{ color: COLOR_R2 }}>{fmtCOP(e.val)}</p>
                <p className="text-[9px] font-mono text-slate-400">${e.val.toLocaleString('es-CO')}</p>
              </div>
            </div>
          ))}
        </div>
      </QCard>

      {/* P13 P14 Tipos de contrato */}
      <QCard n="P13–P14" title="Top 5 tipos de contrato y porcentaje del tipo principal" color={COLOR_R2} light={LIGHT_R2}>
        <div className="space-y-2.5">
          {R2.top5TiposContrato.map((t, i) => (
            <div key={t.tipo} className="flex items-center gap-3">
              <span className="text-[10px] font-black text-white w-5 h-5 flex items-center justify-center rounded-full shrink-0"
                style={{ background: i === 0 ? COLOR_R2 : '#94a3b8' }}>{i + 1}</span>
              <span className="text-xs font-medium text-slate-700 flex-1">{t.tipo}</span>
              <span className="text-xs font-black text-slate-600 w-16 text-right">{fmt(t.n)}</span>
              <span className="text-[10px] font-mono text-slate-400 w-12 text-right">{t.pct}%</span>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 rounded-lg flex items-center gap-3" style={{ background: LIGHT_R2, borderLeft: `3px solid ${COLOR_R2}` }}>
          <span className="text-sm font-black" style={{ color: COLOR_R2 }}>P14 →</span>
          <span className="text-xs text-slate-600">El tipo <strong>"Prestación de Servicios"</strong> representa el</span>
          <span className="text-2xl font-black" style={{ color: COLOR_R2 }}>{R2.pctTipoTop1}%</span>
          <span className="text-xs text-slate-500">del total</span>
        </div>
      </QCard>

      {/* P15 Anomalías financieras */}
      <QCard n="P15" title="Top 3 valores anómalos financieros — investigación y validación" color={COLOR_R2} light={LIGHT_R2}>
        <div className="space-y-4">
          {R2.top3Anomalos.map((a, i) => (
            <div key={i} className="rounded-lg border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
                <span className="w-6 h-6 flex items-center justify-center text-[10px] font-black text-white rounded-full"
                  style={{ background: COLOR_R2 }}>{i + 1}</span>
                <span className="text-xs font-black text-slate-800 flex-1">{a.ent}</span>
                <span className={cn(
                  'text-[9px] font-black px-2 py-0.5 rounded-full',
                  a.veredicto === 'VERÍDICO'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                )}>{a.veredicto}</span>
              </div>
              <div className="px-4 py-3 space-y-1">
                <p className="text-xl font-black" style={{ color: COLOR_R2 }}>{fmtCOP(a.val)}</p>
                <p className="text-[10px] font-mono text-slate-400">${a.val.toLocaleString('es-CO')}</p>
                <p className="text-[10px] text-slate-500">Tipo: {a.tipo}</p>
                <p className="text-xs text-slate-600 mt-2">{a.sustento}</p>
              </div>
            </div>
          ))}
        </div>
      </QCard>

      {/* P16 P17 */}
      <div className="grid grid-cols-2 gap-4">
        <QCard n="P16" title="¿Qué % de contratos contempla pagos adelantados?" color={COLOR_R2} light={LIGHT_R2}>
          <BigAnswer value={`${R2.pctPagoAdelantado}%`} label={`${fmt(R2.nPagoAdelantado)} contratos con pago adelantado`} />
          <p className="text-[10px] text-slate-400 mt-2">El 99.92% de los contratos NO contemplan pago anticipado.</p>
        </QCard>
        <QCard n="P17" title="¿Contratos con obligaciones ambientales explícitas?" color={COLOR_R2} light={LIGHT_R2}>
          <BigAnswer value={fmt(R2.nObligacionAmbiental)} label="contratos con cláusula ambiental" />
          <p className="text-[10px] text-slate-400 mt-2">{((R2.nObligacionAmbiental / R2.totalRegistros) * 100).toFixed(2)}% del total incluye obligaciones ambientales.</p>
        </QCard>
      </div>

      {/* P18 Pareto */}
      <QCard n="P18" title="¿Se cumple el principio de Pareto (80/20) en la contratación estatal?" color={COLOR_R2} light={LIGHT_R2}>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 text-white font-black text-[11px] text-center leading-tight"
            style={{ background: COLOR_R2 }}>SÍ<br/>SE<br/>CUMPLE</div>
          <div className="flex-1 space-y-2">
            <p className="text-xs font-black text-slate-800">La regla 80/20 se cumple e incluso se supera ampliamente:</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: 'Total entidades', v: fmt(R2.pareto.totalEntidades) },
                { k: '20% entidades concentra', v: `${R2.pareto.pct20concentra}% del valor` },
                { k: 'Para 80% del valor bastan', v: `${R2.pareto.nEntidadesParaEl80} entidades (${R2.pareto.pctEntidadesParaEl80}%)` },
                { k: 'Valor total base', v: fmtCOP(R2.pareto.valorTotal) },
              ].map(r => (
                <div key={r.k} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">{r.k}</p>
                  <p className="text-sm font-black text-slate-800">{r.v}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-2">
              En Colombia el principio de concentración es más extremo que el 80/20: solo el <strong>{R2.pareto.pctEntidadesParaEl80}%</strong> de las entidades
              ({R2.pareto.nEntidadesParaEl80}) ejecuta el 80% del gasto. Grandes entidades nacionales
              (Minas, Salud, Defensa, alcaldías capitales) dominan frente a miles de entidades territoriales pequeñas.
            </p>
          </div>
        </div>
      </QCard>

      {/* P19 Brecha género */}
      <QCard n="P19" title="¿Existe una brecha de género financiera en la representación legal?" color={COLOR_R2} light={LIGHT_R2}>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 text-white font-black text-[10px] text-center leading-tight"
            style={{ background: '#dc2626' }}>SÍ<br/>EXISTE<br/>BRECHA</div>
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="p-3 rounded-lg border border-blue-100 bg-blue-50">
                <p className="text-[9px] font-black text-blue-400 uppercase">Hombres</p>
                <p className="text-lg font-black text-blue-700">{fmtCOP(R2.genero.hombre.valor)}</p>
                <p className="text-[10px] text-blue-500">{fmt(R2.genero.hombre.contratos)} contratos</p>
                <p className="text-[10px] text-blue-400">Promedio: {fmtCOP(R2.genero.hombre.promedio)}</p>
              </div>
              <div className="p-3 rounded-lg border border-pink-100 bg-pink-50">
                <p className="text-[9px] font-black text-pink-400 uppercase">Mujeres</p>
                <p className="text-lg font-black text-pink-700">{fmtCOP(R2.genero.mujer.valor)}</p>
                <p className="text-[10px] text-pink-500">{fmt(R2.genero.mujer.contratos)} contratos</p>
                <p className="text-[10px] text-pink-400">Promedio: {fmtCOP(R2.genero.mujer.promedio)}</p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
              <p>🔴 <strong>Brecha financiera (valor total): {R2.genero.brechaValorPct}%</strong> a favor de hombres sobre total M+F</p>
              <p>🔴 <strong>Valor promedio por contrato: {R2.genero.brechaPromedioPct}% más alto en hombres</strong></p>
              <p>⚡ <strong>Paradoja:</strong> las mujeres tienen más contratos (+14.8%) pero manejan menos valor (−31.7%).
                Los contratos femeninos son de menor cuantía (servicios, consultoría pequeña); los masculinos
                dominan contratos de mayor envergadura (obras, suministros, operaciones estratégicas).</p>
            </div>
          </div>
        </div>
      </QCard>

      {/* P20 Anomalías tipos de datos */}
      <QCard n="P20" title="Revisión de tipos de dato — mínimo 5 anomalías detectadas" color={COLOR_R2} light={LIGHT_R2}>
        <div className="space-y-3">
          {R2.anomaliasTipos.map((a, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50">
              <span className="w-5 h-5 flex items-center justify-center text-[9px] font-black text-white rounded-full shrink-0 mt-0.5"
                style={{ background: COLOR_R2 }}>{i + 1}</span>
              <div>
                <p className="text-[10px] font-black text-slate-700 font-mono">{a.col}</p>
                <p className="text-[10px] text-emerald-600">✓ Debería ser: <strong>{a.esperado}</strong></p>
                <p className="text-[10px] text-red-500">✗ Problema actual: {a.problema}</p>
              </div>
            </div>
          ))}
        </div>
      </QCard>

    </div>
  );
}

// ─── PANEL API DOCS ────────────────────────────────────────────────────────

const API_BASE = 'https://licensing-tigers-dayton-rarely.trycloudflare.com';

function PanelAPI() {
  const endpoints = [
    {
      method: 'GET', path: '/api/health',
      desc: 'Estado del sistema: base de datos, Ollama, versión.',
      example: `curl ${API_BASE}/api/health`,
      response: '{"status":"ok","database":"connected","ollamaHost":"http://localhost:11434"}',
    },
    {
      method: 'GET', path: '/api/secop/contracts?entity=CARDIQUE&limit=50',
      desc: 'Contratos SECOP por entidad. Parámetros: entity (string), limit (1-100).',
      example: `curl "${API_BASE}/api/secop/contracts?entity=CARDIQUE&limit=5"`,
      response: '[{"id_contrato":"...","nombre_entidad":"...","valor_del_contrato":"..."}]',
    },
    {
      method: 'POST', path: '/api/rag/legal-context',
      desc: 'Obtiene contexto jurídico relevante (RAG sobre base de conocimiento legal colombiana).',
      example: `curl -X POST ${API_BASE}/api/rag/legal-context \\\n  -H "Content-Type: application/json" \\\n  -d '{"query":"fraccionamiento contractual","redFlags":["mismo proveedor","corto plazo"]}'`,
      response: '{"context":"Ley 80 de 1993, Art. 24..."}',
    },
    {
      method: 'POST', path: '/api/chat/assistant',
      desc: 'Chat IA: Claude Haiku → Gemini Flash → Ollama local. Responde preguntas sobre el sistema.',
      example: `curl -X POST ${API_BASE}/api/chat/assistant \\\n  -H "Content-Type: application/json" \\\n  -d '{"systemPrompt":"Eres un auditor.","userMessage":"¿Qué es el RAG jurídico?","history":[]}'`,
      response: '{"response":"El RAG jurídico...","provider":"ollama"}',
    },
    {
      method: 'GET', path: '/api/secop/source?processId=<ID>',
      desc: 'Obtiene el texto completo de una fuente SECOP por ID de proceso.',
      example: `curl "${API_BASE}/api/secop/source?processId=CO1.PCCNTR.123456"`,
      response: '{"url":"...","title":"...","excerpt":"...","bodyText":"..."}',
    },
    {
      method: 'POST', path: '/api/cache/analysis',
      desc: 'Almacena un análisis en caché persistente (PostgreSQL).',
      example: `curl -X POST ${API_BASE}/api/cache/analysis \\\n  -d '{"groupKey":"entidad-ABC","data":{"riskScore":82}}'`,
      response: '{"status":"ok"}',
    },
    {
      method: 'GET', path: '/api/cache/analysis/:groupKey',
      desc: 'Recupera un análisis almacenado en caché.',
      example: `curl ${API_BASE}/api/cache/analysis/entidad-ABC`,
      response: '{"riskScore":82}',
    },
  ];

  const colors: Record<string, string> = { GET: '#059669', POST: '#2563eb', PUT: '#d97706', DELETE: '#dc2626' };

  return (
    <div className="space-y-5">

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-800 shrink-0">
            <Search className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">GobIA Auditor REST API</p>
            <p className="text-xl font-black text-slate-800">Documentación de Endpoints</p>
            <p className="text-xs text-slate-500 mt-1">Base URL: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{API_BASE}</code></p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { k: 'Estado', v: '✅ Operativo', c: 'bg-emerald-50 text-emerald-700' },
            { k: 'Autenticación', v: 'No requerida', c: 'bg-blue-50 text-blue-700' },
            { k: 'Rate Limit', v: 'Sin límite (dev)', c: 'bg-slate-50 text-slate-600' },
          ].map(s => (
            <div key={s.k} className={`rounded-lg px-4 py-3 ${s.c}`}>
              <p className="text-[9px] font-black uppercase">{s.k}</p>
              <p className="text-sm font-black">{s.v}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {endpoints.map((ep, i) => (
            <div key={i} className="rounded-lg border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
                <span className="text-[10px] font-black px-2 py-0.5 rounded text-white"
                  style={{ background: colors[ep.method] || '#64748b' }}>{ep.method}</span>
                <code className="text-xs font-mono text-slate-700 flex-1">{ep.path}</code>
              </div>
              <div className="px-4 py-3 space-y-2">
                <p className="text-xs text-slate-600">{ep.desc}</p>
                <div className="bg-slate-900 rounded-lg px-4 py-2.5">
                  <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Ejemplo</p>
                  <pre className="text-[10px] text-emerald-400 font-mono whitespace-pre-wrap">{ep.example}</pre>
                </div>
                <div className="bg-slate-100 rounded-lg px-4 py-2.5">
                  <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Respuesta</p>
                  <pre className="text-[10px] text-slate-600 font-mono">{ep.response}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Fuentes de Datos — Hackathon</p>
        <div className="space-y-2">
          {[
            { label: 'Reto 1 — Base 1 (DB1)', id: 'jbjy-vk9h', url: DB1.url, n: '5.6M registros, 84 vars' },
            { label: 'Reto 1 — Base 2 (DB2)', id: 'dmgg-8hin', url: DB2.url, n: '17.3M registros, 84 vars' },
            { label: 'Reto 2 — CSV 2026-05-06', id: 'CSV local', url: '', n: '1.003.902 registros, 84 vars' },
          ].map(src => (
            <div key={src.id} className="flex items-center gap-4 p-3 rounded-lg border border-slate-100 bg-slate-50">
              <Database className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs font-black text-slate-700 w-48 shrink-0">{src.label}</span>
              <code className="text-[10px] font-mono text-slate-400 flex-1">{src.id}</code>
              <span className="text-[10px] text-slate-400">{src.n}</span>
              {src.url && (
                <a href={src.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────

export function SECOPAnalysis() {
  const [activeTab, setActiveTab] = useState<'RETO1' | 'RETO2' | 'API'>('RETO1');
  const [activeDB, setActiveDB] = useState<'DB1' | 'DB2'>('DB1');

  const mainTabs = [
    { id: 'RETO1' as const, label: 'Reto 1', sub: 'SECOP II — API Socrata', color: '#004884', badge: '2 Bases de Datos' },
    { id: 'RETO2' as const, label: 'Reto 2', sub: 'CSV 2026-05-06',          color: '#7c3aed', badge: '1.003.902 registros' },
    { id: 'API'   as const, label: 'API & Docs', sub: 'REST Endpoints',       color: '#0f172a', badge: '7 endpoints' },
  ];

  const db1Tabs = [
    { id: 'DB1' as const, label: 'Base de Datos 1', sub: 'jbjy-vk9h', color: DB1.color },
    { id: 'DB2' as const, label: 'Base de Datos 2', sub: 'dmgg-8hin', color: DB2.color },
  ];

  const activeMain = mainTabs.find(t => t.id === activeTab)!;

  return (
    <div className="min-h-screen bg-slate-100">

      {/* CABECERA INSTITUCIONAL */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="flex gap-0.5">
                <div className="w-1 h-7 bg-[#FCD059] rounded-full" />
                <div className="w-1 h-7 bg-[#004884] rounded-full" />
                <div className="w-1 h-7 bg-[#D12C26] rounded-full" />
              </div>
              <div>
                <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Hackathon Nacional COL 5.0 · GobIA Auditor</p>
                <p className="text-sm font-black text-slate-800 leading-none">SECOP II — Análisis Estadístico Completo</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black px-2 py-1 rounded bg-emerald-100 text-emerald-700 uppercase tracking-wider">● API Activa</span>
              <a href={`https://licensing-tigers-dayton-rarely.trycloudflare.com/api/health`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-slate-600 transition-colors">
                <ExternalLink className="w-3 h-3" />
                Ver API
              </a>
            </div>
          </div>

          {/* NAV PRINCIPAL */}
          <div className="flex gap-0 -mb-px">
            {mainTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wide transition-all border-b-2',
                  activeTab === tab.id
                    ? 'border-current bg-white'
                    : 'border-transparent text-slate-400 hover:text-slate-600 bg-slate-50'
                )}
                style={activeTab === tab.id ? { color: tab.color, borderColor: tab.color } : {}}
              >
                {tab.label}
                <span className="hidden sm:inline text-[8px] font-normal opacity-60">— {tab.sub}</span>
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[8px] font-black text-white"
                  style={{ background: activeTab === tab.id ? tab.color : '#94a3b8' }}>
                  {tab.badge}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* CONTENIDO */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">

          {activeTab === 'RETO1' && (
            <motion.div key="reto1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>

              {/* Sub-selector DB1 / DB2 */}
              <div className="bg-white rounded-xl border border-slate-200 mb-6 overflow-hidden">
                <div className="flex">
                  {db1Tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveDB(tab.id)}
                      className={cn(
                        'relative flex items-center gap-3 px-6 py-4 flex-1 transition-all',
                        activeDB === tab.id ? 'bg-white' : 'bg-slate-50 hover:bg-slate-100'
                      )}
                    >
                      {activeDB === tab.id && (
                        <motion.div layoutId="db-indicator"
                          className="absolute inset-x-0 top-0 h-0.5"
                          style={{ backgroundColor: tab.color }} />
                      )}
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: activeDB === tab.id ? tab.color : tab.color + '20', color: activeDB === tab.id ? 'white' : tab.color }}>
                        <Database className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-black uppercase" style={activeDB === tab.id ? { color: tab.color } : { color: '#94a3b8' }}>
                          {tab.label}
                        </p>
                        <p className="text-[10px] font-mono text-slate-400">{tab.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

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
            </motion.div>
          )}

          {activeTab === 'RETO2' && (
            <motion.div key="reto2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <div className="bg-white rounded-xl border border-slate-200 px-6 py-4 mb-6 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: COLOR_R2 }}>
                  <Database className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Reto 2 — Hackathon Nacional COL 5.0</p>
                  <p className="text-sm font-black text-slate-800">{R2.archivo}</p>
                  <p className="text-[10px] text-slate-400">{R2.tamanio} · {fmt(R2.totalRegistros)} registros · {R2.totalVariables} variables · Extraído 2026-05-06</p>
                </div>
              </div>
              <PanelReto2 />
            </motion.div>
          )}

          {activeTab === 'API' && (
            <motion.div key="api" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <PanelAPI />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white mt-8">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between text-[10px] text-slate-400">
          <span>Fuente: datos.gov.co · SECOP II · Hackathon Nacional COL 5.0 · Consultado 2026-05-08</span>
          <span>GobIA Auditor · Análisis Estadístico Rondas 1 y 2</span>
        </div>
      </footer>
    </div>
  );
}

/**
 * SECOP II — Archivos Descarga Desde 2025
 * Dashboard estadístico — Preguntas 15 a 26
 * Dataset ID: dmgg-8hin · datos.gov.co
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
import { ChevronDown, ChevronUp, ExternalLink, AlertTriangle, Search } from 'lucide-react';
import { cn } from '../lib/utils';

// ─── DATA ──────────────────────────────────────────────────────────────────

const TOTAL_REGISTROS = 17_353_029;

const INT_COLS = [
  { name: 'ID Documento',     field: 'id_documento' },
  { name: 'Tamaño Documento', field: 'tamanno_archivo' },
  { name: 'NIT Entidad',      field: 'nit_entidad' },
];

const STR_COLS = [
  { name: 'Número de Contrato',      field: 'n_mero_de_contrato' },
  { name: 'Proceso',                 field: 'proceso' },
  { name: 'Nombre Documento',        field: 'nombre_archivo' },
  { name: 'Extensión',               field: 'extensi_n' },
  { name: 'Descripción',             field: 'descripci_n' },
  { name: 'Entidad',                 field: 'entidad' },
  { name: 'URL Descarga Documento',  field: 'url_descarga_documento' },
];

const NULL_DATA = [
  { campo: 'descripci_n',     label: 'Descripción',   nulos: 238,    pct: (238 / TOTAL_REGISTROS) * 100 },
  { campo: 'proceso',         label: 'Proceso',       nulos: 0,      pct: 0 },
  { campo: 'nombre_archivo',  label: 'Nombre Doc.',   nulos: 0,      pct: 0 },
  { campo: 'nit_entidad',     label: 'NIT Entidad',   nulos: 0,      pct: 0 },
];

const STATS = {
  id_documento:    { max: 757_010_598,      min: 563_041_734,    media: 658_560_206.52, mediana: 656_263_760 },
  tamano_archivo:  { max: 52_428_800,       min: 1,              media: 1_383_901.19,   mediana: 331_149 },
  nit_entidad:     { max: 9_020_109_854,    min: 4_653_184,      media: 1_454_719_639.59, mediana: 890_907_241 },
};

const LOOKUP = {
  id_documento: 756_926_574,
  nombre_archivo: 'SOLICITUD COTIZACIoN ITEMS NO PREVISTOS MUJER.XLSX',
  fecha_carga: '2026-02-24',
  proceso: 'CO1.BDOS.10040870',
  entidad: 'FONDO DE DESARROLLO LOCAL DE BOSA',
};

// ─── HELPERS ───────────────────────────────────────────────────────────────

const fmt  = (n: number) => n.toLocaleString('es-CO');
const fmtD = (s: string) => new Date(s).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

const fmtBytes = (b: number) => {
  if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(2)} MB`;
  if (b >= 1_024)    return `${(b / 1_024).toFixed(2)} KB`;
  return `${b} bytes`;
};

// ─── BLOQUES REUTILIZABLES ─────────────────────────────────────────────────

function QCard({ n, enunciado, children }: { n: number; enunciado: string; children: React.ReactNode }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35 }}
      className="bg-white border border-[#E0E7EF] shadow-sm overflow-hidden"
    >
      <header className="flex items-start gap-4 px-6 py-4 border-b border-[#E0E7EF] bg-[#F8FAFD]">
        <div className="shrink-0 w-9 h-9 rounded-full bg-[#1a6b3c] flex items-center justify-center mt-0.5">
          <span className="text-xs font-black text-white leading-none">{n}</span>
        </div>
        <p className="text-sm font-semibold text-[#1A2942] leading-snug">{enunciado}</p>
      </header>
      <div className="px-6 py-6">{children}</div>
    </motion.article>
  );
}

function BigNum({ value, unit, note, color = '#1a6b3c' }: { value: string; unit?: string; note?: string; color?: string }) {
  return (
    <div>
      <div className="flex items-end gap-3 flex-wrap">
        <span className="text-6xl font-black tabular-nums leading-none" style={{ color }}>{value}</span>
        {unit && <span className="text-base font-semibold text-gray-400 pb-2">{unit}</span>}
      </div>
      {note && <p className="text-xs text-gray-400 mt-2">{note}</p>}
    </div>
  );
}

function PctBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex items-center gap-3 mt-2">
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${Math.max(pct, 0.01)}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-black w-16 text-right tabular-nums" style={{ color }}>
        {pct < 0.001 ? '0.00%' : `${pct.toFixed(4)}%`}
      </span>
    </div>
  );
}

function StatTable({
  rows,
}: {
  rows: { label: string; raw: number; display?: string }[];
}) {
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b-2 border-[#1a6b3c]/15">
          <th className="text-left py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider">Estadístico</th>
          <th className="text-right py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider">Valor</th>
          {rows[0]?.display !== undefined && (
            <th className="text-right py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider">Legible</th>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.label} className={cn('border-b border-gray-100', i === 0 && 'bg-[#f0faf4]')}>
            <td className="py-2.5 font-semibold text-gray-700">{r.label}</td>
            <td className="py-2.5 text-right font-mono font-bold text-[#1a6b3c]">{fmt(r.raw)}</td>
            {r.display !== undefined && (
              <td className="py-2.5 text-right text-xs text-gray-500">{r.display}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const NullTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 shadow-xl rounded-lg p-3 text-xs space-y-0.5">
      <p className="font-bold text-gray-800">{d.label}</p>
      <p className="text-gray-500">Nulos: <strong>{fmt(d.nulos)}</strong></p>
      <p className="text-gray-500">% del total: <strong>{d.pct < 0.001 ? '~0.000%' : `${d.pct.toFixed(4)}%`}</strong></p>
    </div>
  );
};

// ─── DASHBOARD ─────────────────────────────────────────────────────────────

export function SECOP2Dashboard() {
  return (
    <div className="min-h-screen bg-[#F2F5F9]">

      {/* CABECERA */}
      <div className="bg-[#1a6b3c] text-white">
        <div className="h-1 bg-gradient-to-r from-[#FCD059] via-white/20 to-[#1a6b3c]/80" />
        <div className="max-w-5xl mx-auto px-8 py-8 flex items-start justify-between gap-6 flex-wrap">
          <div>
            <p className="text-[10px] font-black tracking-[0.2em] text-[#FCD059] uppercase mb-2">
              BASE DE DATOS 2
            </p>
            <h1 className="text-2xl font-black uppercase leading-tight">
              SECOP II — Archivos Descarga Desde 2025
            </h1>
            <p className="text-sm text-white/50 mt-1">
              Análisis estadístico descriptivo · Preguntas 15 a 26
            </p>
          </div>
          <a
            href="https://www.datos.gov.co/Estad-sticas-Nacionales/SECOP-II-Archivos-Descarga-Desde-2025/dmgg-8hin/about_data"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/70 transition-colors self-end"
          >
            <ExternalLink className="w-3 h-3" />
            datos.gov.co · dmgg-8hin
          </a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-10 space-y-6">

        {/* P15 */}
        <QCard n={15} enunciado="¿Cuál es el total de registros en el dataset de documentos electrónicos dmgg-8hin?">
          <BigNum
            value={fmt(TOTAL_REGISTROS)}
            unit="registros"
            note="Documentos electrónicos cargados en SECOP II desde diciembre de 2024."
          />
        </QCard>

        {/* P16 */}
        <QCard n={16} enunciado="¿Cuántas columnas tiene el dataset?">
          <BigNum value="11" unit="columnas" />
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { tipo: 'Texto (str)',    count: 7, color: '#1a6b3c', cols: STR_COLS.map(c => c.name) },
              { tipo: 'Entero (int64)', count: 3, color: '#004884', cols: INT_COLS.map(c => c.name) },
              { tipo: 'Fecha',         count: 1, color: '#D12C26', cols: ['Fecha Carga'] },
            ].map(g => (
              <div key={g.tipo} className="border rounded-lg p-4" style={{ borderColor: g.color + '30', backgroundColor: g.color + '08' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: g.color }}>{g.tipo}</span>
                  <span className="text-xl font-black" style={{ color: g.color }}>{g.count}</span>
                </div>
                <div className="flex flex-col gap-1">
                  {g.cols.map(c => (
                    <span key={c} className="text-[10px] text-gray-600 font-medium">{c}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </QCard>

        {/* P17 */}
        <QCard n={17} enunciado="¿Cuántos valores nulos tiene el campo descripción?">
          <BigNum value={fmt(238)} unit="valores nulos" color="#F59E0B" />
          <PctBar pct={(238 / TOTAL_REGISTROS) * 100} color="#F59E0B" />
          <p className="text-xs text-gray-400 mt-2">
            Representa el <strong>0.0014%</strong> del total de {fmt(TOTAL_REGISTROS)} registros.
            El campo descripción es prácticamente completo.
          </p>
        </QCard>

        {/* P18 */}
        <QCard n={18} enunciado="¿Cuántos valores nulos tiene el campo proceso?">
          <BigNum value="0" unit="valores nulos" color="#10B981"
            note="El campo proceso no tiene ningún valor nulo. Completitud del 100%." />
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-2.5 bg-[#10B981] rounded-full" />
            <span className="text-xs font-black text-[#10B981]">100% completo</span>
          </div>

          {/* Comparativa nulos P17 vs P18 */}
          <div className="mt-6">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Comparativa — Nulos en campos clave
            </p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={NULL_DATA} margin={{ top: 4, right: 16, left: 0, bottom: 24 }} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 9, fill: '#6B7280' }} width={36} />
                <Tooltip content={<NullTooltip />} />
                <Bar dataKey="nulos" radius={[4, 4, 0, 0]}>
                  {NULL_DATA.map((d, i) => (
                    <Cell key={i} fill={d.nulos > 0 ? '#F59E0B' : '#10B981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </QCard>

        {/* P19 */}
        <QCard n={19} enunciado="¿Cuáles columnas tienen tipo de dato int64?">
          <BigNum value="3" unit="columnas int64" color="#004884" />
          <div className="mt-5 flex flex-col gap-3">
            {INT_COLS.map((c, i) => (
              <div key={c.field} className="flex items-center gap-4 p-3 rounded-lg border border-[#004884]/15 bg-[#F0F7FF]">
                <div className="w-7 h-7 rounded-full bg-[#004884] flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-black text-white">{i + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#004884]">{c.name}</p>
                  <p className="text-[10px] font-mono text-gray-400">{c.field}</p>
                </div>
                <span className="text-[10px] font-black bg-[#004884] text-white px-2 py-0.5 rounded">int64</span>
              </div>
            ))}
          </div>
        </QCard>

        {/* P20 */}
        <QCard n={20} enunciado="¿Cuáles columnas tienen tipo de dato str?">
          <BigNum value="7" unit="columnas str" color="#1a6b3c" />
          <div className="mt-5 flex flex-col gap-2">
            {STR_COLS.map((c, i) => (
              <div key={c.field} className="flex items-center gap-4 p-3 rounded-lg border border-[#1a6b3c]/15 bg-[#f0faf4]">
                <div className="w-7 h-7 rounded-full bg-[#1a6b3c] flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-black text-white">{i + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#1a6b3c]">{c.name}</p>
                  <p className="text-[10px] font-mono text-gray-400">{c.field}</p>
                </div>
                <span className="text-[10px] font-black bg-[#1a6b3c] text-white px-2 py-0.5 rounded">str</span>
              </div>
            ))}
          </div>
        </QCard>

        {/* P21 */}
        <QCard n={21} enunciado="Máximo, mínimo, media y mediana de la columna ID documento.">
          <StatTable rows={[
            { label: 'Máximo',  raw: STATS.id_documento.max,    },
            { label: 'Mínimo',  raw: STATS.id_documento.min,    },
            { label: 'Media',   raw: Math.round(STATS.id_documento.media),   },
            { label: 'Mediana', raw: STATS.id_documento.mediana },
          ]} />
          <p className="text-[10px] text-gray-400 mt-3">
            Media exacta: <span className="font-mono">658.560.206,52</span>
          </p>
        </QCard>

        {/* P22 */}
        <QCard n={22} enunciado="Máximo, mínimo, media y mediana de la columna tamaño archivo.">
          <StatTable rows={[
            { label: 'Máximo',  raw: STATS.tamano_archivo.max,     display: fmtBytes(STATS.tamano_archivo.max) },
            { label: 'Mínimo',  raw: STATS.tamano_archivo.min,     display: '1 byte' },
            { label: 'Media',   raw: Math.round(STATS.tamano_archivo.media),   display: fmtBytes(STATS.tamano_archivo.media) },
            { label: 'Mediana', raw: STATS.tamano_archivo.mediana, display: fmtBytes(STATS.tamano_archivo.mediana) },
          ]} />
          <p className="text-[10px] text-gray-400 mt-3">
            Media exacta: <span className="font-mono">1.383.901,19 bytes</span>
          </p>
        </QCard>

        {/* P23 */}
        <QCard n={23} enunciado="Máximo, mínimo, media y mediana de la columna nit_entidad.">
          <StatTable rows={[
            { label: 'Máximo',  raw: STATS.nit_entidad.max },
            { label: 'Mínimo',  raw: STATS.nit_entidad.min },
            { label: 'Media',   raw: Math.round(STATS.nit_entidad.media) },
            { label: 'Mediana', raw: STATS.nit_entidad.mediana },
          ]} />
          <p className="text-[10px] text-gray-400 mt-3">
            Media exacta: <span className="font-mono">1.454.719.639,59</span>
          </p>
        </QCard>

        {/* P24 */}
        <QCard n={24} enunciado="MÁXIMOS Y MÍNIMOS — FECHA CARGA">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-t-4 border-[#1a6b3c] pt-4 bg-[#f0faf4] px-5 pb-5 rounded-b-lg">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#1a6b3c]/60 mb-2">Mínimo (más antiguo)</p>
              <p className="text-4xl font-black text-[#1a6b3c] leading-none">31 Dic</p>
              <p className="text-2xl font-black text-[#1a6b3c]/60 mt-1">2024</p>
              <p className="text-[10px] font-mono text-gray-400 mt-2">2024-12-31</p>
            </div>
            <div className="border-t-4 border-[#D12C26] pt-4 bg-[#FEF2F2] px-5 pb-5 rounded-b-lg">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#D12C26]/60 mb-2">Máximo (más reciente)</p>
              <p className="text-4xl font-black text-[#D12C26] leading-none">24 Feb</p>
              <p className="text-2xl font-black text-[#D12C26]/60 mt-1">2026</p>
              <p className="text-[10px] font-mono text-gray-400 mt-2">2026-02-24</p>
            </div>
          </div>
        </QCard>

        {/* P25 */}
        <QCard n={25} enunciado="Rango de fecha o diferencia de fecha de fecha carga">
          <BigNum value="420" unit="días" color="#1a6b3c"
            note="Del 31 de diciembre de 2024 al 24 de febrero de 2026." />

          <div className="mt-6">
            <div className="relative h-3 rounded-full bg-gradient-to-r from-[#1a6b3c] to-[#D12C26] shadow-inner" />
            <div className="flex justify-between mt-2 text-xs font-semibold">
              <span className="text-[#1a6b3c]">31 Dic 2024</span>
              <span className="text-gray-400 text-[10px]">420 días de cobertura</span>
              <span className="text-[#D12C26]">24 Feb 2026</span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Días 2024',  value: '0', note: 'solo 31 Dic' },
              { label: 'Días 2025',  value: '365', note: 'año completo' },
              { label: 'Días 2026',  value: '55',  note: 'ene + feb parcial' },
            ].map(h => (
              <div key={h.label} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-lg font-black text-[#1a6b3c]">{h.value}</p>
                <p className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">{h.label}</p>
                <p className="text-[9px] text-gray-400 mt-0.5">{h.note}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Cálculo: 365 días (2025 completo) + 55 días (1 ene – 24 feb 2026) = <strong>420 días</strong>
          </p>
        </QCard>

        {/* P26 */}
        <QCard n={26} enunciado="¿Cual es el nombre_archivo y fecha_carga para el ID Documento = 756926574?">
          {/* ID buscado */}
          <div className="flex items-center gap-3 mb-5 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">ID buscado</p>
              <p className="text-sm font-black font-mono text-[#004884]">{fmt(LOOKUP.id_documento)}</p>
            </div>
          </div>

          {/* Resultado */}
          <div className="space-y-3">
            <div className="border border-[#1a6b3c]/20 rounded-lg overflow-hidden">
              <div className="bg-[#1a6b3c] px-4 py-2">
                <p className="text-[10px] font-black text-white/70 uppercase tracking-wider">nombre_archivo</p>
              </div>
              <div className="px-4 py-3 bg-[#f0faf4]">
                <p className="text-sm font-bold font-mono text-[#1a6b3c] break-all">{LOOKUP.nombre_archivo}</p>
              </div>
            </div>

            <div className="border border-[#D12C26]/20 rounded-lg overflow-hidden">
              <div className="bg-[#D12C26] px-4 py-2">
                <p className="text-[10px] font-black text-white/70 uppercase tracking-wider">fecha_carga</p>
              </div>
              <div className="px-4 py-3 bg-[#FEF2F2]">
                <p className="text-2xl font-black text-[#D12C26]">24 de febrero de 2026</p>
                <p className="text-[10px] font-mono text-gray-400 mt-0.5">2026-02-24T00:00:00.000</p>
              </div>
            </div>
          </div>

          {/* Datos adicionales del registro */}
          <div className="mt-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Datos completos del registro
            </p>
            <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-100 text-xs">
              {[
                { key: 'proceso',    value: LOOKUP.proceso },
                { key: 'entidad',    value: LOOKUP.entidad },
                { key: 'id_documento', value: fmt(LOOKUP.id_documento) },
              ].map(row => (
                <div key={row.key} className="flex items-center px-4 py-2.5 gap-4">
                  <span className="font-mono text-gray-400 w-28 shrink-0">{row.key}</span>
                  <span className="font-medium text-gray-700">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </QCard>

      </div>

      {/* Footer */}
      <div className="max-w-5xl mx-auto px-8 pb-10">
        <p className="text-[10px] text-gray-400 text-center">
          Fuente: datos.gov.co · Dataset dmgg-8hin ·{' '}
          <a
            href="https://www.datos.gov.co/Estad-sticas-Nacionales/SECOP-II-Archivos-Descarga-Desde-2025/dmgg-8hin/about_data"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-600 transition-colors"
          >
            SECOP II — Archivos Descarga Desde 2025
          </a>{' '}
          · Consultado 2026-05-08 · GobIA Auditor
        </p>
      </div>
    </div>
  );
}

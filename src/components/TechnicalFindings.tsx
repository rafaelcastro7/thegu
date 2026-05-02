
import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ShieldCheck, Info, FileText, Fingerprint, Activity, Scale, Gavel, ExternalLink, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { AnalysisResult } from '../lib/analysis';
import { Contract } from '../lib/secop';

interface TechnicalFindingsProps {
  result: AnalysisResult;
  lang: 'ES' | 'EN';
  onAskAuditor: (finding: any) => void;
  expandedContract: string | null;
  setExpandedContract: (id: string | null) => void;
}

export function TechnicalFindings({ result, lang, onAskAuditor, expandedContract, setExpandedContract }: TechnicalFindingsProps) {
  const isEs = lang === 'ES';

  return (
    <div className="space-y-12">
      {/* Forensic Intelligence Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-red-50 border-2 border-red-100 p-8 space-y-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertTriangle size={120} className="text-red-600" />
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-red-600 text-white flex items-center justify-center">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h3 className="text-[12px] font-black text-red-600 uppercase tracking-[0.2em]">
                {isEs ? 'ÍNDICE DE VULNERABILIDAD CRÍTICA' : 'CRITICAL VULNERABILITY INDEX'}
              </h3>
              <p className="text-3xl font-black text-red-950 tabular-nums tracking-tighter">
                {result.riskScore.toFixed(1)}/100
              </p>
            </div>
          </div>
          
          <div className="space-y-3 relative z-10">
            {result.redFlags.map((flag, i) => (
              <motion.div 
                key={i}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-3 bg-white/60 p-3 border border-red-200/50"
              >
                <div className="mt-1 w-1.5 h-1.5 bg-red-600 rounded-full shrink-0" />
                <p className="text-[11px] font-bold text-red-900 leading-tight uppercase">{flag}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="bg-[#004884]/5 border-2 border-[#004884]/10 p-8 space-y-6 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Scale size={120} className="text-[#004884]" />
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-[#004884] text-white flex items-center justify-center">
              <Gavel size={28} />
            </div>
            <div>
              <h3 className="text-[12px] font-black text-[#004884] uppercase tracking-[0.2em]">
                {isEs ? 'MARCO NORMATIVO AFECTADO' : 'AFFECTED REGULATORY FRAMEWORK'}
              </h3>
              <p className="text-sm font-bold text-[#004884] uppercase">
                {isEs ? 'Hallazgos de Integridad' : 'Integrity Findings'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 relative z-10">
             {[
               { id: 'L1', title: 'Ley 80/93', active: result.redFlags.some(f => f.includes('directa')) },
               { id: 'L2', title: 'Ley 1474/11', active: result.riskScore > 60 },
               { id: 'L3', title: 'Circular 17', active: result.similarityScore > 0.8 },
               { id: 'L4', title: 'Sent. C-300', active: result.maxDayDiff < 5 }
             ].map(law => (
               <div key={law.id} className={cn(
                 "p-3 border text-center transition-all",
                 law.active ? "bg-[#004884] text-white border-[#004884] shadow-lg" : "bg-white text-gray-300 border-gray-100 opacity-50"
               )}>
                 <p className="text-[10px] font-black tracking-widest">{law.title}</p>
                 <p className="text-[7px] uppercase font-bold mt-1 opacity-60">
                   {law.active ? (isEs ? 'VIOLACIÓN PROBABLE' : 'PROBABLE VIOLATION') : (isEs ? 'NO DETECTADO' : 'NOT DETECTED')}
                 </p>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Contract Scrutiny List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b-2 border-gray-100 pb-4">
           <div className="flex items-center gap-3">
              <Activity className="text-gray-400" size={18} />
              <h4 className="text-[12px] font-black text-gray-500 uppercase tracking-[0.15em]">
                {isEs ? 'DESGLOSE DE EXPEDIENTES TÉCNICOS' : 'TECHNICAL CASE BREAKDOWN'}
              </h4>
           </div>
           <p className="text-[10px] font-mono text-gray-400">N={result.contracts.length} NODES</p>
        </div>

        <div className="grid gap-4">
          {result.detailedFindings
            ?.filter(f => f.reasons.length > 0 || result.riskScore > 80) // Filter out clearly baseline nodes unless group is critical
            .sort((a, b) => b.reasons.length - a.reasons.length) // Sort by number of triggered reasons
            .map((finding, idx) => {
            const contractData = result.contracts.find(c => c.id_contrato === finding.contractId);
            const isExpanded = expandedContract === finding.contractId;

            if (!contractData) return null;

            return (
              <div 
                key={idx} 
                className={cn(
                  "bg-white border-2 transition-all overflow-hidden",
                  isExpanded ? "border-[#004884] shadow-xl" : "border-gray-100 hover:border-gray-200"
                )}
              >
                <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black bg-gray-100 px-3 py-1 text-gray-600 tabular-nums">
                        #{finding.contractId}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {finding.reasons.map((reason, ridx) => (
                          <span key={ridx} className="text-[9px] font-bold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 uppercase flex items-center gap-1">
                            <Zap size={8} /> {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                    <h5 className="text-sm font-black text-[#333333] uppercase leading-tight line-clamp-1">
                      {contractData.objeto_del_contrato}
                    </h5>
                  </div>

                  <div className="shrink-0 flex items-center gap-4">
                    <div className="text-right">
                       <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{isEs ? 'VALOR' : 'VALUE'}</p>
                       <p className="text-xs font-black text-[#004884] tabular-nums">${parseFloat(contractData.valor_del_contrato).toLocaleString('es-CO')}</p>
                    </div>
                    <div className="h-8 w-px bg-gray-100" />
                    <div className="flex gap-2">
                       <button 
                         onClick={() => setExpandedContract(isExpanded ? null : finding.contractId)}
                         className={cn(
                           "w-10 h-10 flex items-center justify-center transition-all",
                           isExpanded ? "bg-[#004884] text-white" : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                         )}
                       >
                         {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                       </button>
                       <button 
                         onClick={() => onAskAuditor(finding)}
                         className="px-4 h-10 bg-black text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#004884] transition-all"
                       >
                         {isEs ? 'CONSULTAR' : 'QUERY'}
                       </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    className="border-t border-gray-100 bg-gray-50/50 p-8 grid grid-cols-1 md:grid-cols-2 gap-8"
                  >
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-[#004884] uppercase tracking-[0.2em]">{isEs ? 'DETALLES DEL CONTRATO' : 'CONTRACT DETAILS'}</p>
                      <div className="grid grid-cols-2 gap-4">
                        <DetailItem label={isEs ? "Entidad" : "Entity"} value={contractData.nombre_entidad} />
                        <DetailItem label={isEs ? "Estado" : "Status"} value={contractData.estado_contrato} />
                        <DetailItem label={isEs ? "Modalidad" : "Modality"} value={contractData.modalidad_de_contratacion} />
                        <DetailItem label={isEs ? "Fecha" : "Date"} value={new Date(contractData.fecha_de_firma).toLocaleDateString()} />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-[#004884] uppercase tracking-[0.2em]">{isEs ? 'OBJETO TÉCNICO' : 'TECHNICAL OBJECT'}</p>
                      <div className="bg-white p-4 border border-gray-200 text-[11px] leading-relaxed text-gray-600 h-32 overflow-y-auto custom-scrollbar font-medium">
                        {contractData.objeto_del_contrato}
                      </div>
                      <button 
                        onClick={() => window.open(`https://www.secop.gov.co/Consultas/busqueda/detalle-del-proceso.aspx?IdProcess=${finding.contractId}`, '_blank')}
                        className="w-full py-2 bg-gray-200 text-gray-600 text-[9px] font-black uppercase tracking-widest hover:bg-gray-300 transition-all flex items-center justify-center gap-2"
                      >
                        <ExternalLink size={12} /> {isEs ? 'VER EN SECOP II' : 'VIEW IN SECOP II'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] font-bold text-gray-400 uppercase leading-none">{label}</p>
      <p className="text-[11px] font-black text-gray-800 uppercase truncate" title={value}>{value}</p>
    </div>
  );
}

function ChevronDown(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg> }
function ChevronUp(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg> }

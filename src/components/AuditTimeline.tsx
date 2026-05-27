import React from 'react';
import { Clock, ShieldAlert, FileMinus, FilePlus, Play, CheckCircle2, AlertTriangle, User } from 'lucide-react';
import { TimelineLog, OrderStatus } from '../types';

interface AuditTimelineProps {
  timeline: TimelineLog[];
}

// Function to map status to Portuguese description and visual styling
function getStatusLabel(status: OrderStatus) {
  switch (status) {
    case 'Draft':
      return { text: 'Rascunho Inicial', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    case 'Waiting':
      return { text: 'Aguardando Liberação', color: 'bg-amber-100 text-amber-800 border-amber-200' };
    case 'Completed':
      return { text: 'Ordem Aberta (Concluído)', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    case 'Cancelled':
      return { text: 'Ordem Cancelada', color: 'bg-rose-100 text-rose-800 border-rose-200' };
    default:
      return { text: status, color: 'bg-neutral-100 text-neutral-800 border-neutral-200' };
  }
}

export default function AuditTimeline({ timeline }: AuditTimelineProps) {
  // Sort timeline chronological - oldest first or newest first?
  // Let's show newest first in the stream but clearly denote chronology
  const sortedLogs = [...timeline].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden" id="audit-timeline">
      <div className="bg-[#1E293B] text-white px-5 py-3.5 flex items-center justify-between">
        <h4 className="font-mono text-xs uppercase tracking-wider font-semibold inline-flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-emerald-400" />
          Rastreabilidade Completa (Log de Auditoria Imutável)
        </h4>
        <span className="text-[10px] font-mono bg-neutral-800 px-2.5 py-0.5 rounded-full text-neutral-300">
          {timeline.length} {timeline.length === 1 ? 'evento registrado' : 'eventos registrados'}
        </span>
      </div>

      <div className="p-5 max-h-[380px] overflow-y-auto bg-slate-50/50">
        <div className="relative border-l border-neutral-200 pl-6 ml-3 space-y-6">
          {sortedLogs.map((log) => {
            const hasStatusChange = log.fromStatus || log.toStatus;
            
            return (
              <div key={log.id} className="relative group">
                {/* Timeline node icon */}
                <span className="absolute -left-[31px] top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white border border-neutral-300 shadow-sm text-neutral-500">
                  {log.toStatus === 'Waiting' && <Play className="h-3 w-3 text-amber-500" />}
                  {log.toStatus === 'Completed' && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                  {log.toStatus === 'Cancelled' && <FileMinus className="h-3 w-3 text-rose-600" />}
                  {log.toStatus === 'Draft' && <FilePlus className="h-3 w-3 text-slate-500" />}
                  {!log.toStatus && <Clock className="h-3 w-3 text-neutral-400" />}
                </span>

                {/* Event detail */}
                <div className="bg-white p-3 rounded-lg border border-neutral-200 shadow-sm group-hover:border-neutral-300 transition-colors">
                  <div className="flex flex-wrap justify-between items-start gap-2 mb-1.5 ">
                    <span className="text-xs font-semibold text-neutral-800 font-sans leading-relaxed">
                      {log.description}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400 bg-slate-50 px-2 py-0.5 rounded border border-neutral-100 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  {/* Status transitions badges if any */}
                  {hasStatusChange && (
                    <div className="flex items-center gap-1.5 text-xs font-mono my-2 text-neutral-500 flex-wrap">
                      <span className="text-[10px] uppercase text-neutral-400 font-bold">Fluxo:</span>
                      {log.fromStatus ? (
                        <>
                          <span className={`px-1.5 py-0.5 text-[10px] rounded border ${getStatusLabel(log.fromStatus).color}`}>
                            {getStatusLabel(log.fromStatus).text}
                          </span>
                          <span className="text-neutral-400">→</span>
                        </>
                      ) : (
                        <span className="text-[10px] text-neutral-400 italic">Novo</span>
                      )}
                      
                      {log.toStatus && (
                        <span className={`px-1.5 py-0.5 text-[10px] rounded border ${getStatusLabel(log.toStatus).color}`}>
                          {getStatusLabel(log.toStatus).text}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Author block */}
                  <div className="flex items-center gap-1 mt-1 text-[10px] font-mono text-[#0E6C40] bg-emerald-50/50 px-2 py-1 rounded inline-flex">
                    <User className="h-3 w-3" />
                    <span>Usuário: <strong className="text-neutral-700">{log.user}</strong></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

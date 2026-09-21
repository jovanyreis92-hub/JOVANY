import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  Search, 
  CheckCircle2, 
  Building2, 
  Hash, 
  QrCode, 
  Calendar, 
  Sparkles,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { Participant } from '../types';

interface RecentAttendanceLogProps {
  participants: Participant[];
  onViewBadge?: (participant: Participant) => void;
}

export const RecentAttendanceLog: React.FC<RecentAttendanceLogProps> = ({
  participants,
  onViewBadge,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [limit, setLimit] = useState<number>(15);

  // Filtra apenas participantes que têm presença confirmada e ordena pelos mais recentes primeiro
  const attendedParticipants = useMemo(() => {
    return participants
      .filter((p) => p.attended && p.attendedAt)
      .sort((a, b) => {
        const timeA = a.attendedAt ? new Date(a.attendedAt).getTime() : 0;
        const timeB = b.attendedAt ? new Date(b.attendedAt).getTime() : 0;
        return timeB - timeA;
      });
  }, [participants]);

  // Filtro de busca adicional
  const filteredLog = useMemo(() => {
    if (!searchTerm.trim()) {
      return attendedParticipants;
    }
    const term = searchTerm.toLowerCase();
    return attendedParticipants.filter((p) => {
      const matchName = p.fullName.toLowerCase().includes(term);
      const matchMatricula = p.registrationNumber.toLowerCase().includes(term);
      const matchCompany = p.company.toLowerCase().includes(term);
      const matchEvent = p.eventName ? p.eventName.toLowerCase().includes(term) : false;
      return matchName || matchMatricula || matchCompany || matchEvent;
    });
  }, [attendedParticipants, searchTerm]);

  const displayedLog = useMemo(() => {
    return filteredLog.slice(0, limit);
  }, [filteredLog, limit]);

  // Função para formatar a data e hora exata da validação do QR Code
  const formatExactTime = (dateStr?: string | null) => {
    if (!dateStr) return { time: '--:--:--', date: 'Data não informada', full: '' };

    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return { time: dateStr, date: '', full: dateStr };
      }

      const time = date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const today = new Date();
      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday =
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear();

      let dateLabel = '';
      if (isToday) {
        dateLabel = 'Hoje';
      } else if (isYesterday) {
        dateLabel = 'Ontem';
      } else {
        dateLabel = date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      }

      return {
        time,
        date: dateLabel,
        full: `${dateLabel} às ${time}`,
      };
    } catch {
      return { time: dateStr, date: '', full: dateStr };
    }
  };

  return (
    <div
      id="recent-attendance-log-card"
      className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
    >
      {/* Cabeçalho do Log de Eventos de Entrada */}
      <div className="p-5 sm:p-6 border-b border-slate-200/80 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300/60">
                Transmissão em Tempo Real
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-600" />
              <span>Log de Eventos de Entrada Recente</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hora exata de validação e credenciamento de cada participante via leitura de QR Code.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <div className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{attendedParticipants.length} presenças validadas</span>
            </div>
          </div>
        </div>

        {/* Barra de Filtro e Busca Rápida no Log */}
        {attendedParticipants.length > 0 && (
          <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="input-filter-attendance-log"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar log por nome, matrícula ou empresa..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  Limpar
                </button>
              )}
            </div>

            {filteredLog.length > 15 && (
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <span className="text-xs text-slate-500">Exibir:</span>
                <select
                  id="select-attendance-log-limit"
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                >
                  <option value={10}>10 mais recentes</option>
                  <option value={15}>15 mais recentes</option>
                  <option value={30}>30 mais recentes</option>
                  <option value={50}>50 mais recentes</option>
                  <option value={100}>100 mais recentes</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabela / Lista de Eventos de Entrada */}
      <div className="p-0">
        {attendedParticipants.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center justify-center text-slate-400">
            <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 mb-3 border border-slate-200">
              <Clock className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-700 mb-1">
              Nenhuma presença validada até o momento
            </p>
            <p className="text-xs text-slate-500 max-w-sm">
              Assim que os participantes realizarem o check-in no leitor QR ou tiverem presença confirmada, os eventos de validação serão exibidos aqui instantaneamente com a hora exata.
            </p>
          </div>
        ) : displayedLog.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p className="text-xs">Nenhum evento encontrado para o filtro informado.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
            {displayedLog.map((participant, index) => {
              const { time, date, full } = formatExactTime(participant.attendedAt);
              const isFirst = index === 0;

              return (
                <div
                  key={participant.id}
                  className={`p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors ${
                    isFirst ? 'bg-emerald-50/40' : ''
                  }`}
                >
                  {/* Dados do Participante */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs shadow-2xs ${
                        isFirst
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {participant.fullName}
                        </span>
                        {isFirst && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                            Última entrada
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                        <span className="inline-flex items-center gap-1 font-mono font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          <Hash className="h-3 w-3 text-slate-400" />
                          {participant.registrationNumber}
                        </span>

                        <span className="inline-flex items-center gap-1 text-slate-600">
                          <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[180px] sm:max-w-[240px]">
                            {participant.company}
                          </span>
                        </span>

                        {participant.eventName && (
                          <span className="inline-flex items-center gap-1 text-slate-600">
                            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[160px]">
                              {participant.eventName}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hora Exata da Validação e Ações */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 self-end sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto">
                    <div className="text-left sm:text-right">
                      <div className="flex items-center sm:justify-end gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span className="text-sm font-mono font-bold text-slate-900">
                          {time}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {date}
                      </div>
                    </div>

                    {onViewBadge && (
                      <button
                        type="button"
                        onClick={() => onViewBadge(participant)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                        title="Visualizar crachá e QR Code do participante"
                      >
                        <QrCode className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Rodapé do Log */}
        {attendedParticipants.length > displayedLog.length && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
            <button
              type="button"
              onClick={() => setLimit((prev) => prev + 20)}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
            >
              Carregar mais validações (+20)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Plus, 
  MapPin, 
  Users, 
  CheckCircle, 
  Clock, 
  Star, 
  Edit3, 
  Trash2, 
  FileSpreadsheet, 
  FileText, 
  AlertCircle,
  X,
  Save,
  Check,
  Building,
  QrCode,
  AlertTriangle,
  Timer
} from 'lucide-react';
import { EventItem, Participant, CompanySettings } from '../types';
import { 
  getStoredEvents, 
  addEvent, 
  updateEvent, 
  deleteEvent, 
  setActiveEvent,
  DEFAULT_COMPANY_SETTINGS
} from '../utils/storage';
import { exportToExcel, exportToPDF } from '../utils/export';
import { getEventRegistrationStatus, formatEventDateTime } from '../utils/eventHelper';
import { EventQrModal } from './EventQrModal';

interface EventManagerProps {
  participants: Participant[];
  onUpdateParticipants: () => void;
  onShowToast: (text: string, type?: 'success' | 'info') => void;
  companySettings?: CompanySettings;
}

export const EventManager: React.FC<EventManagerProps> = ({
  participants,
  onUpdateParticipants,
  onShowToast,
  companySettings,
}) => {
  const [events, setEvents] = useState<EventItem[]>(() => getStoredEvents());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [qrModalEvent, setQrModalEvent] = useState<EventItem | null>(null);

  // Campos do formulário
  const [formName, setFormName] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formRegStartDate, setFormRegStartDate] = useState('');
  const [formRegEndDate, setFormRegEndDate] = useState('');
  const [formActive, setFormActive] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Confirmação de exclusão
  const [eventToDelete, setEventToDelete] = useState<EventItem | null>(null);

  // Sincroniza lista quando alterada por outros componentes ou dispositivos
  useEffect(() => {
    const handleEventsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<EventItem[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setEvents(customEvent.detail);
      } else {
        setEvents(getStoredEvents());
      }
    };

    window.addEventListener('events-updated', handleEventsUpdated);
    return () => window.removeEventListener('events-updated', handleEventsUpdated);
  }, []);

  // Estatísticas de participantes por evento
  const eventStats = useMemo(() => {
    const map = new Map<string, { total: number; present: number; absent: number; rate: string }>();

    events.forEach((evt) => {
      const parts = participants.filter((p) => p.eventId === evt.id || (!p.eventId && evt.active));
      const total = parts.length;
      const present = parts.filter((p) => p.attended).length;
      const absent = total - present;
      const rate = total > 0 ? ((present / total) * 100).toFixed(1) : '0';
      map.set(evt.id, { total, present, absent, rate });
    });

    return map;
  }, [events, participants]);

  const openNewEventModal = () => {
    setEditingEvent(null);
    setFormName('');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormLocation('');
    setFormDescription('');
    setFormRegStartDate('');
    setFormRegEndDate('');
    setFormActive(events.length === 0);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (evt: EventItem) => {
    setEditingEvent(evt);
    setFormName(evt.name);
    setFormDate(evt.date || '');
    setFormLocation(evt.location || '');
    setFormDescription(evt.description || '');
    setFormRegStartDate(evt.registrationStartDate || '');
    setFormRegEndDate(evt.registrationEndDate || '');
    setFormActive(evt.active);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = formName.trim();
    if (!cleanName || cleanName.length < 3) {
      setFormError('O nome do evento deve conter no mínimo 3 caracteres.');
      return;
    }

    if (formRegStartDate && formRegEndDate) {
      const startD = new Date(formRegStartDate);
      const endD = new Date(formRegEndDate);
      if (!isNaN(startD.getTime()) && !isNaN(endD.getTime()) && endD < startD) {
        setFormError('A data final de inscrição (prazo de validade) não pode ser anterior à data de início.');
        return;
      }
    }

    if (editingEvent) {
      // Edição
      const updated: EventItem = {
        ...editingEvent,
        name: cleanName,
        date: formDate || new Date().toISOString().slice(0, 10),
        location: formLocation.trim() || 'A definir',
        description: formDescription.trim(),
        registrationStartDate: formRegStartDate ? formRegStartDate : undefined,
        registrationEndDate: formRegEndDate ? formRegEndDate : undefined,
        active: formActive,
      };

      const success = updateEvent(updated);
      if (success) {
        setEvents(getStoredEvents());
        onShowToast(`Evento "${cleanName}" atualizado com sucesso!`, 'success');
        setIsModalOpen(false);
        onUpdateParticipants();
      } else {
        setFormError('Erro ao atualizar o evento.');
      }
    } else {
      // Novo Evento
      const result = addEvent({
        name: cleanName,
        date: formDate,
        location: formLocation,
        description: formDescription,
        registrationStartDate: formRegStartDate ? formRegStartDate : undefined,
        registrationEndDate: formRegEndDate ? formRegEndDate : undefined,
        active: formActive,
      });

      if (!result.success || !result.event) {
        setFormError(result.error || 'Erro ao criar evento.');
        return;
      }

      setEvents(getStoredEvents());
      onShowToast(`Evento "${cleanName}" cadastrado com sucesso!`, 'success');
      setIsModalOpen(false);
      onUpdateParticipants();
    }
  };

  const handleSetActive = (evt: EventItem) => {
    if (evt.active) return;
    setActiveEvent(evt.id);
    setEvents(getStoredEvents());
    onShowToast(`"${evt.name}" agora é o evento ativo padrão para cadastros e credenciamento!`, 'success');
    onUpdateParticipants();
  };

  const handleConfirmDelete = () => {
    if (!eventToDelete) return;
    const name = eventToDelete.name;
    const result = deleteEvent(eventToDelete.id);
    if (!result.success) {
      onShowToast(result.error || 'Não foi possível excluir o evento.', 'info');
      setEventToDelete(null);
      return;
    }

    setEvents(getStoredEvents());
    setEventToDelete(null);
    onShowToast(`Evento "${name}" excluído com sucesso.`, 'info');
    onUpdateParticipants();
  };

  // Exportação isolada por evento
  const handleExportEventExcel = (evt: EventItem) => {
    const eventParticipants = participants.filter(
      (p) => p.eventId === evt.id || (!p.eventId && evt.active)
    );
    const cleanFileName = `lista-presenca-${evt.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    exportToExcel(eventParticipants, cleanFileName);
    onShowToast(`Planilha Excel do evento "${evt.name}" exportada com sucesso!`, 'success');
  };

  const handleExportEventPDF = (evt: EventItem) => {
    const eventParticipants = participants.filter(
      (p) => p.eventId === evt.id || (!p.eventId && evt.active)
    );
    const cleanFileName = `relatorio-presenca-${evt.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    exportToPDF(eventParticipants, cleanFileName);
    onShowToast(`Relatório em PDF do evento "${evt.name}" exportado com sucesso!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Gestão de Eventos */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-semibold border border-sky-200 mb-2">
            <Calendar className="h-3.5 w-3.5" />
            <span>Multi-Eventos & Conferências</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            Gerenciamento de Eventos
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Cadastre múltiplos eventos, defina o evento ativo do momento e exporte listas de presença personalizadas.
          </p>
        </div>

        <button
          id="btn-create-event-top"
          type="button"
          onClick={openNewEventModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-colors cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Evento</span>
        </button>
      </div>

      {/* Grid de Cards de Eventos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {events.map((evt) => {
          const stats = eventStats.get(evt.id) || { total: 0, present: 0, absent: 0, rate: '0' };
          const formattedDate = evt.date
            ? new Date(evt.date + 'T12:00:00').toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })
            : 'Data não informada';

          return (
            <div
              key={evt.id}
              className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs ${
                evt.active
                  ? 'border-sky-500 ring-2 ring-sky-500/15'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="p-5 sm:p-6 space-y-4">
                {/* Topo do Card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {evt.active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-600 text-white shadow-xs">
                          <Star className="h-3 w-3 fill-current" />
                          <span>Ativo Agora</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetActive(evt)}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                          title="Clique para tornar este o evento ativo padrão"
                        >
                          <Check className="h-3 w-3" />
                          <span>Tornar Ativo</span>
                        </button>
                      )}
                      <span className="text-xs text-slate-400">
                        ID: {evt.id}
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-slate-900 pt-1 leading-snug">
                      {evt.name}
                    </h4>
                  </div>

                  {/* Ações de Edição e Exclusão */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditModal(evt)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Editar detalhes do evento"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEventToDelete(evt)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Excluir evento"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Local e Data */}
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                    <span className="font-medium text-slate-800">{formattedDate}</span>
                  </div>
                  {evt.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span className="font-medium text-slate-800">Local: {evt.location}</span>
                    </div>
                  )}
                  {evt.description && (
                    <p className="text-slate-500 text-xs italic pt-1 line-clamp-2">
                      "{evt.description}"
                    </p>
                  )}
                </div>

                {/* Período de Inscrição e Prazo de Validade */}
                {(() => {
                  const validity = getEventRegistrationStatus(evt);
                  return (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                          <Timer className="h-3.5 w-3.5 text-sky-600" />
                          <span>Inscrições & Validade:</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${validity.badgeClass}`}>
                          {validity.badgeLabel}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-0.5 border-t border-slate-200/60">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Início das Inscrições:</span>
                          <span className="font-medium text-slate-700">
                            {evt.registrationStartDate ? formatEventDateTime(evt.registrationStartDate) : 'Imediato'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Prazo de Validade (Fim):</span>
                          <span className={`font-medium ${validity.status === 'ended' ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                            {evt.registrationEndDate ? formatEventDateTime(evt.registrationEndDate) : 'Sem restrição'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Estatísticas Rápidas do Evento */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Inscritos</span>
                    <span className="text-base font-bold text-slate-800 font-mono">
                      {stats.total}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-emerald-700 block font-medium">Presentes</span>
                    <span className="text-base font-bold text-emerald-600 font-mono">
                      {stats.present}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-amber-700 block font-medium">Ausentes</span>
                    <span className="text-base font-bold text-amber-600 font-mono">
                      {stats.absent}
                    </span>
                  </div>
                </div>
              </div>

              {/* Barra Inferior com Exportações do Evento e QR Único */}
              <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-slate-500 font-medium">
                  Presença: <strong className="text-slate-800">{stats.rate}%</strong>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQrModalEvent(evt)}
                    className="inline-flex items-center gap-1.5 py-1.5 px-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                    title={`Visualizar e compartilhar o QR Code único com prazo de validade para ${evt.name}`}
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    <span>QR Único</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportEventExcel(evt)}
                    className="inline-flex items-center gap-1.5 py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                    title={`Exportar lista de presença de ${evt.name} em Excel (.xlsx)`}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>Excel (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportEventPDF(evt)}
                    className="inline-flex items-center gap-1.5 py-1.5 px-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                    title={`Exportar relatório de presença de ${evt.name} em PDF (.pdf)`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>PDF (.pdf)</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Criação / Edição de Evento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden">
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-400/20">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {editingEvent ? 'Editar Evento' : 'Cadastrar Novo Evento'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Defina nome, data, local e parâmetros do evento
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSaveForm} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Nome do Evento */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Nome do Evento <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Convenção Anual de Vendas 2026"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm"
                  required
                />
              </div>

              {/* Data e Local em 2 colunas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Data do Evento
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Local do Evento ou Reunião
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="Ex: Auditório Principal, Sala 04, Sede ou Online"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Descrição ou Observações
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ex: Alinhamento de metas corporativas e integração de novos membros."
                  rows={2}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm"
                />
              </div>

              {/* Período de Inscrição e Prazo de Validade para Cadastro */}
              <div className="p-3.5 bg-sky-50/70 rounded-xl border border-sky-200/80 space-y-3">
                <div className="flex items-center gap-2 text-sky-950 font-bold text-xs">
                  <Timer className="h-4 w-4 text-sky-600 shrink-0" />
                  <span>Prazo de Validade & Período de Inscrição</span>
                </div>
                <p className="text-[11px] text-sky-800 leading-relaxed">
                  Defina as datas limites para os participantes se cadastrarem. Fora deste período, o formulário e o QR Code bloqueiam novos cadastros automaticamente.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Início das Inscrições
                    </label>
                    <input
                      type="datetime-local"
                      value={formRegStartDate}
                      onChange={(e) => setFormRegStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-xs font-mono"
                    />
                    <span className="text-[10px] text-slate-500 block">Vazio = Início imediato</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Prazo Final de Validade (Fim)
                    </label>
                    <input
                      type="datetime-local"
                      value={formRegEndDate}
                      onChange={(e) => setFormRegEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-xs font-mono"
                    />
                    <span className="text-[10px] text-slate-500 block">Limite final para inscrições</span>
                  </div>
                </div>
              </div>

              {/* Checkbox Ativo */}
              <div className="pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-xs font-medium text-slate-800">
                    Definir este como o <strong>evento ativo</strong> no sistema (padrão para novos participantes)
                  </span>
                </label>
              </div>

              {/* Botões do Rodapé */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>{editingEvent ? 'Salvar Alterações' : 'Criar Evento'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-200 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="h-6 w-6" />
            </div>

            <div>
              <h4 className="text-base font-bold text-slate-900">
                Excluir Evento?
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Deseja realmente remover o evento <strong>"{eventToDelete.name}"</strong>?
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de QR Code Único do Evento com Prazo de Validade */}
      <EventQrModal
        isOpen={!!qrModalEvent}
        onClose={() => setQrModalEvent(null)}
        event={qrModalEvent}
        companySettings={companySettings || DEFAULT_COMPANY_SETTINGS}
      />
    </div>
  );
};

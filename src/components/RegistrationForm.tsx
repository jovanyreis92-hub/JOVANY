import React, { useState, useEffect } from 'react';
import { 
  User, 
  Hash, 
  Building2, 
  UserPlus, 
  CheckCircle, 
  QrCode, 
  Sparkles, 
  Calendar, 
  MapPin, 
  Share2, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Timer,
  Loader2 
} from 'lucide-react';
import { Participant, CompanySettings, EventItem } from '../types';
import { addParticipant, getStoredEvents, getActiveEvent } from '../utils/storage';
import { getEventRegistrationStatus, formatEventDateTime } from '../utils/eventHelper';
import { QrBadgeModal } from './QrBadgeModal';

interface RegistrationFormProps {
  onParticipantAdded: (participant: Participant) => void;
  companySettings?: CompanySettings;
  onOpenMobileShare?: () => void;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  onParticipantAdded,
  companySettings,
  onOpenMobileShare,
}) => {
  const [fullName, setFullName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [company, setCompany] = useState('');
  const [events, setEvents] = useState<EventItem[]>(() => getStoredEvents());
  const [selectedEventId, setSelectedEventId] = useState<string>(() => {
    // Verifica se há eventId na URL primeiro
    const params = new URLSearchParams(window.location.search);
    const paramEventId = params.get('eventId');
    const stored = getStoredEvents();
    if (paramEventId && stored.some((e) => e.id === paramEventId)) {
      return paramEventId;
    }
    const active = getActiveEvent();
    return active?.id || 'event_1';
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Escuta alteração da URL ou sincronização de eventos
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramEventId = params.get('eventId');
    if (paramEventId && events.some((e) => e.id === paramEventId)) {
      setSelectedEventId(paramEventId);
    }
  }, [events]);

  // Sincroniza eventos quando atualizados
  useEffect(() => {
    const handleEventsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<EventItem[]>;
      const list = customEvent.detail && Array.isArray(customEvent.detail) ? customEvent.detail : getStoredEvents();
      setEvents(list);

      const params = new URLSearchParams(window.location.search);
      const paramEventId = params.get('eventId');
      if (paramEventId && list.some((i) => i.id === paramEventId)) {
        setSelectedEventId(paramEventId);
      } else if (!list.some((item) => item.id === selectedEventId)) {
        const active = list.find((i) => i.active) || list[0];
        if (active) setSelectedEventId(active.id);
      }
    };

    window.addEventListener('events-updated', handleEventsUpdated);
    return () => window.removeEventListener('events-updated', handleEventsUpdated);
  }, [selectedEventId]);

  // Modal para exibir e baixar o QR code recém-gerado
  const [createdParticipant, setCreatedParticipant] = useState<Participant | null>(null);
  const [showModal, setShowModal] = useState(false);

  const selectedEvent = events.find((e) => e.id === selectedEventId) || events[0];
  const validity = selectedEvent ? getEventRegistrationStatus(selectedEvent) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validação estrita do prazo de validade
    if (validity && !validity.canRegister) {
      setErrorMessage(validity.detail);
      return;
    }

    if (!fullName.trim()) {
      setErrorMessage('Por favor, informe o nome completo.');
      return;
    }
    const cleanRegistration = registrationNumber.replace(/\D/g, '').trim();
    if (!cleanRegistration) {
      setErrorMessage('Por favor, informe o número de matrícula (somente números).');
      return;
    }
    if (!company.trim()) {
      setErrorMessage('Por favor, informe a empresa.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await addParticipant({
        fullName,
        registrationNumber: cleanRegistration,
        company,
        eventId: selectedEvent?.id,
        eventName: selectedEvent?.name,
      });

      if (!result.success || !result.participant) {
        setErrorMessage(result.error || 'Erro ao registrar participante no sistema.');
        setIsSubmitting(false);
        return;
      }

      // Sucesso confirmado pelo servidor!
      const newPart = result.participant;
      onParticipantAdded(newPart);
      setCreatedParticipant(newPart);
      setShowModal(true);

      // Limpa os campos do formulário para o próximo cadastro
      setFullName('');
      setRegistrationNumber('');
      setCompany('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha na conexão ao enviar o cadastro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillExample = () => {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const names = [
      'Beatriz Vasconcelos',
      'Rodrigo Fernandes',
      'Aline Moreira',
      'Gabriel Henrique Lima',
      'Carla Mendonça',
    ];
    const companies = [
      'InovaTech Soluções',
      'Apex Engenharia',
      'Alpha Logística',
      'BioPharma Saúde',
      'Vértice Consultoria',
    ];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomComp = companies[Math.floor(Math.random() * companies.length)];

    setFullName(randomName);
    setRegistrationNumber(String(randomId));
    setCompany(randomComp);
    setErrorMessage(null);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Cabeçalho do Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 sm:p-8">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-400 text-xs font-semibold tracking-wide border border-sky-400/20">
                <UserPlus className="h-3.5 w-3.5" />
                <span>Formulário de Inscrição</span>
              </div>
              {companySettings?.companyName && (
                <span className="text-xs text-slate-300 font-medium hidden sm:inline">
                  • {companySettings.companyName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {onOpenMobileShare && (
                <button
                  id="btn-share-registration-form"
                  type="button"
                  onClick={onOpenMobileShare}
                  className="text-xs text-sky-300 hover:text-white flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-sky-950/70 hover:bg-sky-900 transition-colors border border-sky-700/60 cursor-pointer"
                  title="Compartilhar link de inscrição para celulares e outras redes"
                >
                  <Share2 className="h-3.5 w-3.5 text-sky-400" />
                  <span>Compartilhar Link / QR</span>
                </button>
              )}
              <button
                id="btn-fill-example"
                type="button"
                onClick={fillExample}
                className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition-colors border border-slate-700 cursor-pointer"
                title="Preencher com dados de teste"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Exemplo rápido</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Cadastro de Participante
              </h2>
              <p className="text-slate-300 text-sm mt-1">
                {selectedEvent 
                  ? `${selectedEvent.name} • Preencha os dados para gerar sua credencial com QR Code.`
                  : 'Preencha os dados abaixo para gerar instantaneamente seu QR Code individual de credenciamento.'}
              </p>
            </div>

            {companySettings?.logoUrl && (
              <div className="shrink-0 bg-white/95 rounded-xl px-3 py-1.5 shadow-sm border border-white/20 self-start sm:self-center">
                <img
                  src={companySettings.logoUrl}
                  alt={companySettings.companyName}
                  className="h-9 max-w-[120px] object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          {errorMessage && (
            <div
              id="registration-error-alert"
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0"></div>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Seletor de Evento */}
          <div className="space-y-1.5">
            <label
              htmlFor="select-event"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
            >
              <Calendar className="h-3.5 w-3.5 text-sky-600" />
              <span>Evento Destinado</span> <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                id="select-event"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full pl-3.5 pr-8 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm font-medium cursor-pointer"
              >
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.name} {evt.date ? `(${new Date(evt.date + 'T12:00:00').toLocaleDateString('pt-BR')})` : ''} {evt.active ? '★ [Ativo]' : ''}
                  </option>
                ))}
              </select>
            </div>
            {selectedEvent && (
              <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                {selectedEvent.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    {selectedEvent.location}
                  </span>
                )}
                {selectedEvent.description && (
                  <span className="truncate max-w-[300px]">
                    • {selectedEvent.description}
                  </span>
                )}
              </div>
            )}

            {/* Banner Informativo de Prazo de Validade da Inscrição */}
            {validity && (
              <div className={`mt-2 p-3 rounded-xl border flex items-start gap-3 transition-colors ${
                validity.status === 'open'
                  ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                  : validity.status === 'ended'
                  ? 'bg-rose-50 border-rose-200 text-rose-950'
                  : validity.status === 'not_started'
                  ? 'bg-amber-50 border-amber-200 text-amber-950'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}>
                <div className="mt-0.5 shrink-0">
                  {validity.status === 'open' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                  {validity.status === 'ended' && <AlertTriangle className="h-4 w-4 text-rose-600" />}
                  {validity.status === 'not_started' && <Clock className="h-4 w-4 text-amber-600" />}
                  {validity.status === 'no_restriction' && <Timer className="h-4 w-4 text-sky-600" />}
                </div>

                <div className="space-y-0.5 text-xs flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold">
                      {validity.headline}
                    </span>
                    <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${validity.badgeClass}`}>
                      {validity.badgeLabel}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-normal">
                    {validity.detail}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Nome Completo */}
          <div className="space-y-1.5">
            <label
              htmlFor="input-fullName"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
            >
              Nome Completo <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="h-4 w-4" />
              </div>
              <input
                id="input-fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ex: Amanda Cristina Ferreira"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm"
                required
              />
            </div>
          </div>

          {/* Número de Matrícula (Somente Números) */}
          <div className="space-y-1.5">
            <label
              htmlFor="input-registrationNumber"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
            >
              Número de Matrícula (Apenas Números) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Hash className="h-4 w-4" />
              </div>
              <input
                id="input-registrationNumber"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 10452"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm font-mono tracking-wider"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Digite apenas números (Ex: 10452). Identificador individual utilizado para validação na portaria.
            </p>
          </div>

          {/* Empresa */}
          <div className="space-y-1.5">
            <label
              htmlFor="input-company"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
            >
              Empresa <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Building2 className="h-4 w-4" />
              </div>
              <input
                id="input-company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Ex: Petróleo Brasileiro S/A ou TechCorp"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm"
                required
              />
            </div>
          </div>

          {/* Botão de Envio */}
          <div className="pt-2">
            <button
              id="btn-submit-registration"
              type="submit"
              disabled={isSubmitting || (validity ? !validity.canRegister : false)}
              className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm transition-all shadow-sm ${
                validity && !validity.canRegister
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-300'
                  : 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white shadow-sky-600/20 hover:shadow-md cursor-pointer'
              } disabled:opacity-60`}
            >
              {validity && !validity.canRegister ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-slate-500" />
                  <span>
                    {validity.status === 'ended'
                      ? 'Inscrições Encerradas (Prazo Expirado)'
                      : 'Inscrições Não Iniciadas'}
                  </span>
                </>
              ) : (
                <>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>Cadastrando e sincronizando em tempo real...</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="h-4 w-4" />
                      <span>Cadastrar e Gerar Código QR</span>
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </form>

        {/* Notificação / Destaque de último cadastrado */}
        {createdParticipant && !showModal && (
          <div className="border-t border-slate-100 bg-slate-50/80 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Último participante cadastrado:</p>
                <p className="text-sm font-semibold text-slate-800">
                  {createdParticipant.fullName} ({createdParticipant.registrationNumber})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                id="btn-view-last-qr"
                type="button"
                onClick={() => setShowModal(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 py-2 px-3.5 rounded-lg transition-colors cursor-pointer"
              >
                <QrCode className="h-4 w-4 text-sky-600" />
                <span>Visualizar / Baixar Credencial QR</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal do QR Code com tecla para download individual */}
      {showModal && createdParticipant && (
        <QrBadgeModal
          participant={createdParticipant}
          onClose={() => setShowModal(false)}
          isNewRegistration={true}
        />
      )}
    </div>
  );
};

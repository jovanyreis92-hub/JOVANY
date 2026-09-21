import React, { useState, useEffect } from 'react';
import { 
  Pencil, 
  X, 
  User, 
  Hash, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Save, 
  AlertCircle,
  Loader2,
  QrCode,
  MapPin
} from 'lucide-react';
import { Participant, EventItem } from '../types';
import { updateParticipant } from '../utils/storage';
import { autoCorrectAndAccent, isValidFullName } from '../utils/textCorrector';

interface EditParticipantModalProps {
  isOpen: boolean;
  participant: Participant | null;
  events: EventItem[];
  onClose: () => void;
  onSuccess: (updated: Participant) => void;
}

export const EditParticipantModal: React.FC<EditParticipantModalProps> = ({
  isOpen,
  participant,
  events,
  onClose,
  onSuccess,
}) => {
  const [fullName, setFullName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [company, setCompany] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [attended, setAttended] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Inicializa o formulário com os dados do participante selecionado
  useEffect(() => {
    if (participant && isOpen) {
      setFullName((participant.fullName || '').toUpperCase());
      setRegistrationNumber(participant.registrationNumber || '');
      setCompany((participant.company || '').toUpperCase());
      setSelectedEventId(participant.eventId || (events[0]?.id ?? 'event_1'));
      setAttended(Boolean(participant.attended));
      setErrorMessage(null);
      setIsSaving(false);
    }
  }, [participant, isOpen, events]);

  // Tecla ESC fecha o modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSaving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen || !participant) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = autoCorrectAndAccent(fullName.trim());
    const cleanRegistration = registrationNumber.replace(/\D/g, '').trim();
    const cleanCompany = autoCorrectAndAccent(company.trim());

    // Validação estrita de Nome Completo (exige nome e sobrenome)
    const nameValidation = isValidFullName(cleanName);
    if (!nameValidation.valid) {
      setErrorMessage(nameValidation.error || 'Por favor, informe o nome completo (nome e sobrenome).');
      return;
    }

    if (!cleanRegistration) {
      setErrorMessage('Por favor, informe o número de matrícula (apenas números).');
      return;
    }

    const targetEvent = events.find((evt) => evt.id === selectedEventId) || events[0];

    setIsSaving(true);
    try {
      const result = await updateParticipant(participant.id, {
        fullName: cleanName,
        registrationNumber: cleanRegistration,
        company: cleanCompany,
        eventId: targetEvent?.id || participant.eventId,
        eventName: targetEvent?.name || participant.eventName,
        attended,
      });

      if (!result.success || !result.participant) {
        setErrorMessage(result.error || 'Erro ao atualizar dados do participante.');
        setIsSaving(false);
        return;
      }

      onSuccess(result.participant);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro inesperado na conexão ao salvar as alterações.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="edit-participant-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-participant-modal-title"
    >
      <div 
        id="edit-participant-dialog"
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 text-left my-8"
      >
        {/* Cabeçalho do Modal */}
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent px-6 py-5 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Pencil className="h-5 w-5" />
            </div>
            <div>
              <h3 
                id="edit-participant-modal-title"
                className="text-base font-bold text-slate-900 leading-tight"
              >
                Editar Participante
              </h3>
              <p className="text-xs text-slate-500">
                Altere os dados cadastrais individualmente
              </p>
            </div>
          </div>

          <button
            id="btn-close-edit-modal"
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fechar janela de edição"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Formulário de Edição */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Mensagem de Erro se houver */}
          {errorMessage && (
            <div 
              id="edit-participant-error-banner"
              className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in duration-150"
            >
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Campo: Nome Completo */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label 
                htmlFor="edit-participant-fullname"
                className="block text-xs font-semibold text-slate-700"
              >
                Nome Completo (Nome e Sobrenome) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">Obrigatório nome e sobrenome</span>
            </div>
            <div className="relative">
              <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="edit-participant-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value.toUpperCase())}
                onBlur={() => setFullName(autoCorrectAndAccent(fullName))}
                spellCheck={true}
                autoCorrect="on"
                autoCapitalize="words"
                lang="pt-BR"
                required
                disabled={isSaving}
                placeholder="EX: CARLOS EDUARDO DE OLIVEIRA (NOME E SOBRENOME)"
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all disabled:opacity-60 uppercase"
              />
            </div>
            {fullName.trim().length > 0 && fullName.trim().split(/\s+/).filter((w) => w.length > 0).length < 2 && (
              <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1 mt-1">
                <span>Informe o nome completo (nome e sobrenome).</span>
              </p>
            )}
          </div>

          {/* Grid: Matrícula e Empresa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Campo: Matrícula */}
            <div>
              <label 
                htmlFor="edit-participant-registration"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Número de Matrícula <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Hash className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="edit-participant-registration"
                  type="text"
                  inputMode="numeric"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value.replace(/\D/g, ''))}
                  required
                  disabled={isSaving}
                  placeholder="Ex: 102030"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all disabled:opacity-60"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                <QrCode className="h-3 w-3 text-primary-theme shrink-0" />
                <span>Atualiza o Código QR vinculado</span>
              </p>
            </div>

            {/* Campo: Empresa / Órgão */}
            <div>
              <label 
                htmlFor="edit-participant-company"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Empresa / Instituição
              </label>
              <div className="relative">
                <Building2 className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="edit-participant-company"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value.toUpperCase())}
                  onBlur={() => setCompany(autoCorrectAndAccent(company))}
                  spellCheck={true}
                  autoCorrect="on"
                  autoCapitalize="words"
                  lang="pt-BR"
                  disabled={isSaving}
                  placeholder="EX: PREFEITURA MUNICIPAL"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all disabled:opacity-60 uppercase"
                />
              </div>
            </div>
          </div>

          {/* Campo: Evento Vinculado */}
          <div>
            <label 
              htmlFor="edit-participant-event"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Evento Vinculado
            </label>
            <div className="relative">
              <Calendar className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                id="edit-participant-event"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                disabled={isSaving}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer disabled:opacity-60"
              >
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.name} {evt.active ? '★ (Evento Ativo)' : ''}
                  </option>
                ))}
              </select>
            </div>
            {(() => {
              const evt = events.find((e) => e.id === selectedEventId);
              if (!evt?.location) return null;
              return (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1 pl-1">
                  <MapPin className="h-3 w-3 text-amber-600 shrink-0" />
                  <span>Local do Evento ou Reunião: <strong className="text-slate-700">{evt.location}</strong></span>
                </div>
              );
            })()}
          </div>

          {/* Campo: Status de Presença */}
          <div className="pt-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Status de Presença no Evento
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="btn-edit-status-absent"
                type="button"
                onClick={() => setAttended(false)}
                disabled={isSaving}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  !attended
                    ? 'bg-amber-50 text-amber-900 border-amber-300 ring-2 ring-amber-400/20 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <XCircle className={`h-4 w-4 ${!attended ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>Ausente</span>
              </button>

              <button
                id="btn-edit-status-present"
                type="button"
                onClick={() => setAttended(true)}
                disabled={isSaving}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  attended
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300 ring-2 ring-emerald-400/20 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className={`h-4 w-4 ${attended ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Presente</span>
              </button>
            </div>
            {attended && participant.attendedAt && (
              <p className="text-[11px] text-emerald-700 mt-1.5 font-mono">
                Presença confirmada em: {new Date(participant.attendedAt).toLocaleString('pt-BR')}
              </p>
            )}
          </div>

          {/* Rodapé com Ações */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              id="btn-cancel-edit-participant"
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              id="btn-save-edit-participant"
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 py-2.5 px-5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Salvando Alterações...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

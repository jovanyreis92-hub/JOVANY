import React, { useEffect, useState } from 'react';
import { 
  X, 
  Download, 
  QrCode, 
  CheckCircle2, 
  Shield, 
  Building2, 
  Hash, 
  IdCard, 
  Sparkles, 
  MapPin, 
  Calendar,
  Zap,
  Check
} from 'lucide-react';
import { Participant } from '../types';
import { createQrPayload, generateQrCodeDataUrl, downloadQrCodeImage, downloadBadgeImage } from '../utils/qr';
import { getCompanySettings, getStoredEvents, toggleAttendance } from '../utils/storage';
import { playSuccessBeep } from '../utils/audio';

interface QrBadgeModalProps {
  participant: Participant | null;
  onClose: () => void;
  isNewRegistration?: boolean;
}

export const QrBadgeModal: React.FC<QrBadgeModalProps> = ({
  participant: initialParticipant,
  onClose,
  isNewRegistration = false,
}) => {
  const [liveParticipant, setLiveParticipant] = useState<Participant | null>(initialParticipant);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isDownloadingQr, setIsDownloadingQr] = useState(false);
  const [isDownloadingBadge, setIsDownloadingBadge] = useState(false);
  const [justConfirmedLive, setJustConfirmedLive] = useState(false);
  const [scanTimeStr, setScanTimeStr] = useState<string>('');
  const [scanSourceLabel, setScanSourceLabel] = useState<string>('');

  const companySettings = getCompanySettings();
  const events = getStoredEvents();
  const currentEvent = events.find((e) => e.id === liveParticipant?.eventId || e.name === liveParticipant?.eventName);
  const eventLocation = currentEvent?.location || '';

  // Sincroniza se o participante inicial mudar
  useEffect(() => {
    setLiveParticipant(initialParticipant);
    setJustConfirmedLive(false);
  }, [initialParticipant]);

  // Escuta confirmações de presença e alterações em tempo real via celular ou computador
  useEffect(() => {
    if (!liveParticipant) return;

    const handleAttendanceConfirmed = (e: Event) => {
      const custom = e as CustomEvent<{ participant?: Participant; timestamp?: string; source?: string }>;
      if (custom.detail?.participant) {
        const p = custom.detail.participant;
        if (p.id === liveParticipant.id || p.registrationNumber === liveParticipant.registrationNumber) {
          setLiveParticipant(p);
          setJustConfirmedLive(true);
          const time = custom.detail.timestamp
            ? new Date(custom.detail.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setScanTimeStr(time);
          const isMobile = custom.detail.source === 'mobile_qr' || custom.detail.source === 'mobile_toggle';
          setScanSourceLabel(isMobile ? 'Leitor no Celular' : 'Leitor no Computador/PC');
          playSuccessBeep();
        }
      }
    };

    const handleAttendanceAbsent = (e: Event) => {
      const custom = e as CustomEvent<{ participant?: Participant }>;
      if (custom.detail?.participant) {
        const p = custom.detail.participant;
        if (p.id === liveParticipant.id || p.registrationNumber === liveParticipant.registrationNumber) {
          setLiveParticipant(p);
          setJustConfirmedLive(false);
        }
      }
    };

    const handleParticipantUpdated = (e: Event) => {
      const custom = e as CustomEvent<Participant>;
      if (custom.detail) {
        const p = custom.detail;
        if (p.id === liveParticipant.id || p.registrationNumber === liveParticipant.registrationNumber) {
          setLiveParticipant(p);
        }
      }
    };

    window.addEventListener('attendance-confirmed', handleAttendanceConfirmed);
    window.addEventListener('attendance-absent', handleAttendanceAbsent);
    window.addEventListener('participant-updated', handleParticipantUpdated);

    return () => {
      window.removeEventListener('attendance-confirmed', handleAttendanceConfirmed);
      window.removeEventListener('attendance-absent', handleAttendanceAbsent);
      window.removeEventListener('participant-updated', handleParticipantUpdated);
    };
  }, [liveParticipant]);

  // Gera o QR Code com dados estruturados oficiais para leitura
  useEffect(() => {
    if (!liveParticipant) {
      setQrDataUrl('');
      return;
    }

    const payload = createQrPayload(liveParticipant);
    generateQrCodeDataUrl(payload)
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Erro ao gerar QR:', err));
  }, [liveParticipant?.id, liveParticipant?.fullName, liveParticipant?.registrationNumber, liveParticipant?.company]);

  if (!liveParticipant) return null;

  const handleDownloadQr = async () => {
    try {
      setIsDownloadingQr(true);
      await downloadQrCodeImage(liveParticipant);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloadingQr(false);
    }
  };

  const handleDownloadBadge = async () => {
    try {
      setIsDownloadingBadge(true);
      await downloadBadgeImage(liveParticipant);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloadingBadge(false);
    }
  };

  const handleToggleAttendance = () => {
    const res = toggleAttendance(liveParticipant.id);
    if (res.participant) {
      setLiveParticipant(res.participant);
      if (res.attended) {
        setJustConfirmedLive(true);
        setScanTimeStr(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setScanSourceLabel('Painel');
        playSuccessBeep();
      } else {
        setJustConfirmedLive(false);
      }
    }
  };

  return (
    <div
      id="qr-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="qr-modal-card"
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 transition-all my-8 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Cabeçalho do Modal */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 relative">
          <button
            id="btn-close-qr-modal"
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Logomarca da Empresa ou Identificador */}
          <div className="flex items-center gap-2.5 mb-3 pr-8">
            {companySettings.logoUrl ? (
              <div className="h-9 max-w-[120px] bg-white/95 rounded-lg px-2 py-1 flex items-center justify-center shadow-xs">
                <img
                  src={companySettings.logoUrl}
                  alt={companySettings.companyName}
                  className="max-h-7 max-w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="h-7 px-2.5 rounded-md bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300 text-xs font-semibold">
                {companySettings.companyName || 'Credencial Oficial'}
              </div>
            )}
            <span className="text-[11px] text-slate-300 font-medium truncate">
              {liveParticipant.eventName || companySettings.eventName || 'COZINHA SHOW'}
            </span>
          </div>

          {isNewRegistration ? (
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span>Cadastro Concluído com Sucesso!</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <QrCode className="h-4 w-4" />
              <span>Credencial Individual</span>
            </div>
          )}

          <h2 className="text-xl font-bold text-white leading-tight">
            {liveParticipant.fullName}
          </h2>
          <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <span>{liveParticipant.company}</span>
          </p>
        </div>

        {/* Banner de Leitura Simultânea Recebida da Tela do Computador pelo Celular */}
        {justConfirmedLive && (
          <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white px-5 py-3 border-b border-emerald-400/30 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-3 w-3 rounded-full bg-emerald-300 animate-ping shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wider text-emerald-100 flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 fill-emerald-200" />
                  <span>Leitura na Tela Confirmada!</span>
                </p>
                <p className="text-[11px] text-white/90 truncate">
                  Validado simultaneamente via {scanSourceLabel || 'Celular'} {scanTimeStr ? `às ${scanTimeStr}` : ''}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider bg-white text-emerald-800 px-2.5 py-1 rounded-full shadow-xs shrink-0">
              <Check className="h-3 w-3 stroke-[3]" />
              PRESENTE
            </span>
          </div>
        )}

        {/* Corpo com QR Code */}
        <div className="p-6 flex flex-col items-center text-center">
          <div className={`p-4 rounded-2xl shadow-inner relative group mb-4 transition-all duration-300 ${
            liveParticipant.attended 
              ? 'bg-emerald-50/70 border-2 border-emerald-400 ring-4 ring-emerald-400/20' 
              : 'bg-slate-50 border-2 border-dashed border-slate-200'
          }`}>
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code de ${liveParticipant.fullName}`}
                className="w-56 h-56 mx-auto object-contain transition-transform group-hover:scale-[1.02]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                <span className="text-sm">Gerando QR Code...</span>
              </div>
            )}
            <div className="mt-2 text-xs font-mono font-bold text-slate-800 tracking-wider">
              Matrícula: {liveParticipant.registrationNumber}
            </div>
            <div className="mt-2 flex items-center justify-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <Sparkles className="h-3 w-3 shrink-0 text-emerald-600" />
              <span>Aponte o Leitor QR do celular para esta tela para validar presença instantaneamente</span>
            </div>
          </div>

          {/* Dados do Participante */}
          <div className="w-full bg-slate-50 rounded-xl p-3 mb-4 text-left border border-slate-200/80 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1">
                <Hash className="h-3.5 w-3.5 text-slate-400" /> Matrícula:
              </span>
              <span className="font-semibold text-slate-800 font-mono">
                {liveParticipant.registrationNumber}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-slate-400" /> Empresa:
              </span>
              <span className="font-semibold text-slate-800">
                {liveParticipant.company}
              </span>
            </div>
            {liveParticipant.eventName && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" /> Evento:
                </span>
                <span className="font-semibold text-slate-800 text-right truncate max-w-[200px]" title={liveParticipant.eventName}>
                  {liveParticipant.eventName}
                </span>
              </div>
            )}
            {eventLocation && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-primary-theme" /> Local do Evento ou Reunião:
                </span>
                <span className="font-semibold text-slate-800 text-right truncate max-w-[200px]" title={eventLocation}>
                  {eventLocation}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/70">
              <span className="text-slate-600 font-medium flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-slate-400" /> Status de Presença:
              </span>
              {liveParticipant.attended ? (
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Presença Confirmada</span>
                  </span>
                  {liveParticipant.attendedAt && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      ({new Date(liveParticipant.attendedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})
                    </span>
                  )}
                </div>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                  Aguardando Presença
                </span>
              )}
            </div>
          </div>

          {/* Botão de Alternar Presença Direto no Modal */}
          <div className="w-full mb-4">
            <button
              id="btn-toggle-badge-attendance"
              type="button"
              onClick={handleToggleAttendance}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer border ${
                liveParticipant.attended
                  ? 'bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-900 border-amber-300'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border-emerald-600 shadow-md'
              }`}
              title="Alternar status de presença deste participante com sincronização em rede"
            >
              {liveParticipant.attended ? (
                <>
                  <X className="h-4 w-4 text-amber-700" />
                  <span>Alterar Status para Ausente</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  <span>Confirmar Presença Agora (Presente)</span>
                </>
              )}
            </button>
          </div>

          {/* Botões de Download do QR Code e Crachá */}
          <div className="w-full space-y-2.5">
            <button
              id="btn-download-qr-code"
              type="button"
              onClick={handleDownloadQr}
              disabled={isDownloadingQr || !qrDataUrl}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 btn-primary-action text-white rounded-xl font-medium text-sm transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>{isDownloadingQr ? 'Baixando...' : 'Baixar Código QR (PNG)'}</span>
            </button>

            <button
              id="btn-download-badge"
              type="button"
              onClick={handleDownloadBadge}
              disabled={isDownloadingBadge || !qrDataUrl}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white rounded-xl font-medium text-sm transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <IdCard className="h-4 w-4" />
              <span>{isDownloadingBadge ? 'Gerando Crachá...' : 'Baixar Crachá Completo (PNG)'}</span>
            </button>
          </div>
        </div>

        {/* Rodapé informativo */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 text-center">
          <p className="text-[11px] text-slate-500">
            Aponte a câmera do aplicativo no celular para esta tela para confirmar a presença do participante em tempo real.
          </p>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { X, Download, QrCode, CheckCircle2, Shield, Building2, Hash, IdCard, Sparkles, MapPin, Calendar } from 'lucide-react';
import { Participant } from '../types';
import { createQrPayload, generateQrCodeDataUrl, downloadQrCodeImage, downloadBadgeImage } from '../utils/qr';
import { getCompanySettings, getStoredEvents } from '../utils/storage';

interface QrBadgeModalProps {
  participant: Participant | null;
  onClose: () => void;
  isNewRegistration?: boolean;
}

export const QrBadgeModal: React.FC<QrBadgeModalProps> = ({
  participant,
  onClose,
  isNewRegistration = false,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isDownloadingQr, setIsDownloadingQr] = useState(false);
  const [isDownloadingBadge, setIsDownloadingBadge] = useState(false);
  const companySettings = getCompanySettings();
  const events = getStoredEvents();
  const currentEvent = events.find((e) => e.id === participant?.eventId || e.name === participant?.eventName);
  const eventLocation = currentEvent?.location || '';

  useEffect(() => {
    if (!participant) {
      setQrDataUrl('');
      return;
    }

    const payload = createQrPayload(participant);
    generateQrCodeDataUrl(payload)
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Erro ao gerar QR:', err));
  }, [participant]);

  if (!participant) return null;

  const handleDownloadQr = async () => {
    try {
      setIsDownloadingQr(true);
      await downloadQrCodeImage(participant);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloadingQr(false);
    }
  };

  const handleDownloadBadge = async () => {
    try {
      setIsDownloadingBadge(true);
      await downloadBadgeImage(participant);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloadingBadge(false);
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
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 transition-all my-8"
      >
        {/* Cabeçalho do Modal */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 relative">
          <button
            id="btn-close-qr-modal"
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
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
              {participant.eventName || companySettings.eventName || 'COZINHA SHOW'}
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
            {participant.fullName}
          </h2>
          <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <span>{participant.company}</span>
          </p>
        </div>

        {/* Corpo com QR Code */}
        <div className="p-6 flex flex-col items-center text-center">
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-4 rounded-2xl shadow-inner relative group mb-4">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code de ${participant.fullName}`}
                className="w-56 h-56 mx-auto object-contain transition-transform group-hover:scale-[1.02]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                <span className="text-sm">Gerando QR Code...</span>
              </div>
            )}
            <div className="mt-2 text-xs font-mono font-medium text-slate-700 tracking-wider">
              Matrícula: {participant.registrationNumber}
            </div>
            <div className="mt-2 flex items-center justify-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <Sparkles className="h-3 w-3 shrink-0 text-emerald-600" />
              <span>Escaneável por qualquer câmera de celular (iOS/Android) e sincronizado em rede</span>
            </div>
          </div>

          {/* Dados do Participante */}
          <div className="w-full bg-slate-50 rounded-xl p-3 mb-5 text-left border border-slate-200/80 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1">
                <Hash className="h-3.5 w-3.5 text-slate-400" /> Matrícula:
              </span>
              <span className="font-semibold text-slate-800 font-mono">
                {participant.registrationNumber}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-slate-400" /> Empresa:
              </span>
              <span className="font-semibold text-slate-800">
                {participant.company}
              </span>
            </div>
            {participant.eventName && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" /> Evento:
                </span>
                <span className="font-semibold text-slate-800 text-right truncate max-w-[200px]" title={participant.eventName}>
                  {participant.eventName}
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
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-slate-400" /> Status:
              </span>
              {participant.attended ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  Presença Confirmada
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  Aguardando Presença
                </span>
              )}
            </div>
          </div>

          {/* Botões de Download do QR Code e Crachá */}
          <div className="w-full space-y-2.5">
            <button
              id="btn-download-qr-code"
              type="button"
              onClick={handleDownloadQr}
              disabled={isDownloadingQr || !qrDataUrl}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 btn-primary-action text-white rounded-xl font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{isDownloadingQr ? 'Baixando...' : 'Baixar Código QR (PNG)'}</span>
            </button>

            <button
              id="btn-download-badge"
              type="button"
              onClick={handleDownloadBadge}
              disabled={isDownloadingBadge || !qrDataUrl}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white rounded-xl font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              <IdCard className="h-4 w-4" />
              <span>{isDownloadingBadge ? 'Gerando Crachá...' : 'Baixar Crachá Completo (PNG)'}</span>
            </button>
          </div>
        </div>

        {/* Rodapé informativo */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 text-center">
          <p className="text-[11px] text-slate-500">
            Salve o QR Code no seu celular ou imprima para apresentar na entrada do evento.
          </p>
        </div>
      </div>
    </div>
  );
};

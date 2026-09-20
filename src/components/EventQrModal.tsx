import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  QrCode, 
  Copy, 
  Check, 
  Download, 
  Share2, 
  Calendar, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink 
} from 'lucide-react';
import { EventItem, CompanySettings } from '../types';
import { resolvePublicRegistrationUrl } from '../utils/urlHelper';
import { getEventRegistrationStatus, formatEventDateTime, buildEventRegistrationUrl } from '../utils/eventHelper';

interface EventQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem | null;
  companySettings: CompanySettings;
}

export const EventQrModal: React.FC<EventQrModalProps> = ({
  isOpen,
  onClose,
  event,
  companySettings,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const validity = event ? getEventRegistrationStatus(event) : null;
  const basePublicUrl = resolvePublicRegistrationUrl(companySettings).url.split('?')[0];
  const uniqueEventUrl = event ? buildEventRegistrationUrl(basePublicUrl, event.id) : '';

  useEffect(() => {
    if (!isOpen || !event || !uniqueEventUrl) return;

    QRCode.toDataURL(uniqueEventUrl, {
      width: 380,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((dataUri) => {
        setQrDataUrl(dataUri);
      })
      .catch((err) => {
        console.error('Erro ao gerar QR do evento:', err);
      });
  }, [isOpen, event, uniqueEventUrl]);

  if (!isOpen || !event) return null;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && uniqueEventUrl) {
        await navigator.clipboard.writeText(uniqueEventUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // fallback
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const cleanName = event.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qrcode-evento-${cleanName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNativeShare = async () => {
    const text = `Inscrições para o evento "${event.name}". ${
      event.registrationEndDate ? `Prazo de validade: até ${formatEventDateTime(event.registrationEndDate)}.` : ''
    } Acesse pelo link: ${uniqueEventUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Inscrição - ${event.name}`,
          text,
          url: uniqueEventUrl,
        });
      } catch {
        // Usuário cancelou
      }
    } else {
      handleCopyLink();
    }
  };

  const formattedEventDate = event.date
    ? new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : 'Data não informada';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Topo do Modal */}
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-400/25">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sky-400/15 text-sky-300 text-[11px] font-semibold border border-sky-400/20">
                <span>QR Único do Evento</span>
              </div>
              <h3 className="font-bold text-base text-white mt-0.5 line-clamp-1">
                {event.name}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 space-y-5">
          {/* Card de Prazo de Validade & Status da Inscrição */}
          {validity && (
            <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
              validity.status === 'open' 
                ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                : validity.status === 'ended'
                ? 'bg-rose-50/90 border-rose-200 text-rose-950'
                : validity.status === 'not_started'
                ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
              <div className="mt-0.5 shrink-0">
                {validity.status === 'open' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                {validity.status === 'ended' && <AlertTriangle className="h-5 w-5 text-rose-600" />}
                {validity.status === 'not_started' && <Clock className="h-5 w-5 text-amber-600" />}
                {validity.status === 'no_restriction' && <Clock className="h-5 w-5 text-primary-theme" />}
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm">
                    {validity.headline}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${validity.badgeClass}`}>
                    {validity.badgeLabel}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {validity.detail}
                </p>
                
                {/* Linha com datas detalhadas de início e fim */}
                {(event.registrationStartDate || event.registrationEndDate) && (
                  <div className="pt-1.5 border-t border-slate-200/70 grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Início das Inscrições:</span>
                      <span>{event.registrationStartDate ? formatEventDateTime(event.registrationStartDate) : 'Imediato'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Prazo Final de Validade:</span>
                      <span className={validity.status === 'ended' ? 'text-rose-600 font-bold' : ''}>
                        {event.registrationEndDate ? formatEventDateTime(event.registrationEndDate) : 'Sem expiração'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Área do QR Code Único */}
          <div className="flex flex-col items-center">
            <div className="p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-inner flex items-center justify-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code para inscrição no evento ${event.name}`}
                  className="w-56 h-56 object-contain"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center bg-slate-50 text-slate-400 text-xs animate-pulse rounded-xl">
                  Gerando QR Code único...
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-2 text-center">
              Ao escanear, o participante abre o formulário pré-configurado exclusivamente para este evento.
            </p>
          </div>

          {/* Dados do Evento */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-slate-700">
              <Calendar className="h-4 w-4 text-primary-theme shrink-0" />
              <span><strong>Data do Evento:</strong> {formattedEventDate}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2 text-slate-700">
                <MapPin className="h-4 w-4 text-rose-500 shrink-0" />
                <span><strong>Local:</strong> {event.location}</span>
              </div>
            )}
          </div>

          {/* Link Único do Evento */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Link Direto de Inscrição deste Evento:
            </label>
            <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-xl border border-slate-200">
              <input
                type="text"
                readOnly
                value={uniqueEventUrl}
                className="w-full bg-transparent text-xs text-slate-800 focus:outline-none select-all font-mono"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white hover:bg-slate-200 text-slate-800 border border-slate-300'
                }`}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Ações: Download, Compartilhar, Testar */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleDownloadQr}
              className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <Download className="h-4 w-4" />
              <span>Baixar Imagem QR</span>
            </button>

            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full py-2.5 px-3 btn-primary-action rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs"
            >
              <Share2 className="h-4 w-4" />
              <span>Compartilhar Link</span>
            </button>
          </div>

          <div className="text-center">
            <a
              href={uniqueEventUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary-theme hover:underline font-medium transition-colors"
            >
              <span>Testar formulário deste evento em nova aba</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

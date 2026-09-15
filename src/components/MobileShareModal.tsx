import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  QrCode, 
  Copy, 
  Check, 
  ExternalLink, 
  Share2,
  Link
} from 'lucide-react';
import { CompanySettings } from '../types';
import { getSyncStatus, SyncStatus } from '../utils/storage';

interface MobileShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  companySettings: CompanySettings;
}

export const MobileShareModal: React.FC<MobileShareModalProps> = ({
  isOpen,
  onClose,
  companySettings,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getSyncStatus());
  const [registrationUrl, setRegistrationUrl] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}${window.location.pathname}?tab=register`;
      setRegistrationUrl(url);

      QRCode.toDataURL(url, {
        width: 320,
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
          console.error('Erro ao gerar QR de compartilhamento:', err);
        });
    }

    const handleSyncChange = (e: Event) => {
      const custom = e as CustomEvent<{ status: SyncStatus }>;
      if (custom.detail?.status) {
        setSyncStatus(custom.detail.status);
      }
    };

    window.addEventListener('sync-status-changed', handleSyncChange);
    return () => {
      window.removeEventListener('sync-status-changed', handleSyncChange);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && registrationUrl) {
        await navigator.clipboard.writeText(registrationUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // fallback
    }
  };

  const handleOpenLink = () => {
    if (registrationUrl) {
      window.open(registrationUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 text-white p-5 sm:p-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0 shadow-inner">
              <Share2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Compartilhar Inscrição
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {companySettings.eventName || 'Credenciamento e Presença em Tempo Real'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo com QR Code e Link */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* QR Code de Inscrição */}
          <div className="flex flex-col items-center justify-center p-5 bg-gradient-to-b from-sky-50/40 to-slate-50 border border-sky-100/80 rounded-2xl text-center">
            <p className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
              <QrCode className="h-4 w-4 text-sky-600" />
              Aponte a câmera para abrir o formulário de cadastro:
            </p>

            <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200/80 inline-block">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code para Inscrição"
                  className="w-52 h-52 sm:w-56 sm:h-56 object-contain"
                />
              ) : (
                <div className="w-52 h-52 flex items-center justify-center text-slate-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-500 mt-3 max-w-xs">
              Abre diretamente no navegador de qualquer dispositivo, sem necessidade de instalar aplicativos.
            </p>
          </div>

          {/* Link direto para compartilhamento */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Link className="h-3.5 w-3.5 text-sky-600" />
                Link Direto de Inscrição:
              </span>
              <span className="text-[11px] text-sky-600 font-normal">Copie e envie por WhatsApp ou e-mail</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={registrationUrl}
                className="flex-1 bg-slate-100 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2.5 font-mono select-all focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-white" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-white" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleOpenLink}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors shrink-0 cursor-pointer"
                title="Abrir em nova aba para testar"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

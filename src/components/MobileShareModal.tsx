import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  QrCode, 
  Copy, 
  Check, 
  ExternalLink, 
  Share2,
  Link,
  AlertTriangle,
  Settings2,
  RotateCcw,
  Smartphone
} from 'lucide-react';
import { CompanySettings } from '../types';
import { getSyncStatus, SyncStatus, saveCompanySettings } from '../utils/storage';
import { resolvePublicRegistrationUrl, PublicUrlInfo } from '../utils/urlHelper';

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
  const [urlInfo, setUrlInfo] = useState<PublicUrlInfo>(() => resolvePublicRegistrationUrl(companySettings));
  const [isEditingUrl, setIsEditingUrl] = useState<boolean>(false);
  const [customInputUrl, setCustomInputUrl] = useState<string>('');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const resolved = resolvePublicRegistrationUrl(companySettings);
    setUrlInfo(resolved);
    setCustomInputUrl(resolved.url);

    generateQr(resolved.url);

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
  }, [isOpen, companySettings]);

  const generateQr = (url: string) => {
    QRCode.toDataURL(url, {
      width: 340,
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
  };

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && urlInfo.url) {
        await navigator.clipboard.writeText(urlInfo.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // fallback manual
    }
  };

  const handleOpenLink = () => {
    if (urlInfo.url) {
      window.open(urlInfo.url, '_blank');
    }
  };

  const handleNativeShare = async () => {
    const text = `Acesse o formulário de cadastro e credenciamento para o evento "${companySettings.eventName}": ${urlInfo.url}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Inscrição - ${companySettings.eventName}`,
          text,
          url: urlInfo.url,
        });
      } catch {
        // Usuário cancelou
      }
    } else {
      handleCopyLink();
    }
  };

  const handleSaveCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInputUrl.trim()) return;

    const updated = resolvePublicRegistrationUrl(companySettings, customInputUrl.trim());
    setUrlInfo(updated);
    generateQr(updated.url);

    // Salva nas configurações da empresa
    saveCompanySettings({
      ...companySettings,
      publicAppUrl: customInputUrl.trim(),
    });

    setSaveFeedback('URL pública salva e QR Code atualizado com sucesso!');
    setIsEditingUrl(false);
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handleResetToAutoUrl = () => {
    // Remove override manual
    saveCompanySettings({
      ...companySettings,
      publicAppUrl: undefined,
    });
    const resetResolved = resolvePublicRegistrationUrl({ ...companySettings, publicAppUrl: undefined });
    setUrlInfo(resetResolved);
    setCustomInputUrl(resetResolved.url);
    generateQr(resetResolved.url);
    setIsEditingUrl(false);
    setSaveFeedback('Restaurado para a URL pública automática (ais-pre).');
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-lg w-full overflow-hidden flex flex-col max-h-[94vh]"
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
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Compartilhar Formulário
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Todas as Redes
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 truncate max-w-[280px] sm:max-w-sm">
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
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-slate-700 text-sm">
          {saveFeedback && (
            <div className="p-2.5 bg-emerald-100/80 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-semibold text-center">
              {saveFeedback}
            </div>
          )}

          {/* QR Code de Inscrição */}
          <div className="flex flex-col items-center justify-center p-4 sm:p-5 bg-gradient-to-b from-sky-50/40 to-slate-50 border border-sky-100/80 rounded-2xl text-center">
            <p className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
              <QrCode className="h-4 w-4 text-sky-600" />
              Aponte a câmera do celular para abrir o formulário de cadastro:
            </p>

            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200/80 inline-block">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code para Inscrição"
                  className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-slate-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-500 mt-3 max-w-xs">
              Abre instantaneamente em navegadores mobile (Chrome, Safari, Firefox) via 4G, 5G ou Wi-Fi.
            </p>
          </div>

          {/* Link direto para compartilhamento */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Link className="h-3.5 w-3.5 text-sky-600" />
                Link Direto para Inscrição:
              </label>

              <button
                type="button"
                onClick={() => setIsEditingUrl(!isEditingUrl)}
                className="text-[11px] text-sky-600 hover:text-sky-800 font-medium flex items-center gap-1 cursor-pointer"
                title="Personalizar endereço do link"
              >
                <Settings2 className="h-3.5 w-3.5" />
                <span>{isEditingUrl ? 'Ocultar ajuste' : 'Ajustar link'}</span>
              </button>
            </div>

            {/* Editor de URL pública */}
            {isEditingUrl ? (
              <form onSubmit={handleSaveCustomUrl} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                <div className="font-semibold text-slate-800">
                  Configurar Endereço Público Personalizado:
                </div>
                <p className="text-[11px] text-slate-500">
                  Caso utilize um domínio próprio ou queira forçar uma URL específica para os participantes:
                </p>
                <input
                  type="text"
                  value={customInputUrl}
                  onChange={(e) => setCustomInputUrl(e.target.value)}
                  placeholder="Ex: https://meuevento.com ou https://ais-pre-...run.app"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
                  >
                    Salvar e Atualizar QR
                  </button>
                  <button
                    type="button"
                    onClick={handleResetToAutoUrl}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Restaurar Automático
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={urlInfo.url}
                  className="flex-1 bg-slate-100 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2.5 font-mono select-all focus:outline-hidden truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3.5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
                  title="Copiar link"
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
            )}

            {/* Ações de Compartilhamento Rápido */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Smartphone className="h-4 w-4" />
                <span>Enviar para WhatsApp / Celular</span>
              </button>
              <button
                type="button"
                onClick={handleOpenLink}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Testar Acesso</span>
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Sincronização em tempo real ativa
          </span>
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


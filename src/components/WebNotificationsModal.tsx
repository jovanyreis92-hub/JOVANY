import React, { useState } from 'react';
import { 
  Bell, 
  BellRing, 
  BellOff, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  X, 
  Info,
  Laptop
} from 'lucide-react';
import { isNotificationSupported } from '../utils/notifications';

interface WebNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  permission: NotificationPermission | 'unsupported';
  isEnabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  onRequestPermission: () => Promise<void>;
  onSendTestNotification: () => void;
}

export const WebNotificationsModal: React.FC<WebNotificationsModalProps> = ({
  isOpen,
  onClose,
  permission,
  isEnabled,
  onToggleEnabled,
  onRequestPermission,
  onSendTestNotification,
}) => {
  const [requesting, setRequesting] = useState(false);
  const [testSent, setTestSent] = useState(false);

  if (!isOpen) return null;

  const supported = isNotificationSupported();

  const handleRequest = async () => {
    setRequesting(true);
    try {
      await onRequestPermission();
    } finally {
      setRequesting(false);
    }
  };

  const handleTest = () => {
    onSendTestNotification();
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3500);
  };

  return (
    <div
      id="modal-web-notifications-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        id="modal-web-notifications-container"
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Topo do Modal */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Notificações no Navegador
              </h3>
              <p className="text-xs text-slate-300">
                Web Notifications API para alertas instantâneos de presença
              </p>
            </div>
          </div>
          <button
            id="btn-close-notifications-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Conteúdo Principal */}
        <div className="p-6 space-y-5">
          {/* Status Atual da Permissão */}
          <div className="p-4 rounded-xl border flex items-start gap-3.5 bg-slate-50 border-slate-200">
            {permission === 'granted' && (
              <>
                <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                      Permissão Autorizada
                    </span>
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    O navegador está autorizado a emitir notificações nativas no seu sistema operacional (desktop/celular).
                  </p>
                </div>
              </>
            )}

            {permission === 'default' && (
              <>
                <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Bell className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                    Permissão Pendente
                  </span>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Clique no botão abaixo para permitir que o navegador envie avisos na tela quando um participante confirmar presença.
                  </p>
                </div>
              </>
            )}

            {permission === 'denied' && (
              <>
                <div className="h-9 w-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                  <BellOff className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
                    Notificações Bloqueadas
                  </span>
                  <p className="text-xs text-slate-600 mt-0.5">
                    O acesso a notificações está bloqueado nas preferências do seu navegador para este site.
                  </p>
                </div>
              </>
            )}

            {permission === 'unsupported' && (
              <>
                <div className="h-9 w-9 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Navegador Não Compatível
                  </span>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Este navegador não dá suporte à Web Notifications API.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Botão de Solicitação de Permissão (quando 'default') */}
          {permission === 'default' && supported && (
            <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-amber-900 text-xs font-semibold">
                <Info className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Ative as notificações para receber avisos em tempo real</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Ao clicar em &quot;Ativar Notificações&quot;, seu navegador exibirá uma caixa de diálogo perguntando se você deseja permitir notificações. Clique em <strong>Permitir</strong>.
              </p>
              <button
                id="btn-request-notification-permission"
                type="button"
                onClick={handleRequest}
                disabled={requesting}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <BellRing className="h-4 w-4" />
                <span>{requesting ? 'Aguardando autorização...' : 'Ativar Notificações no Navegador'}</span>
              </button>
            </div>
          )}

          {/* Opções quando 'granted' */}
          {permission === 'granted' && (
            <div className="space-y-4">
              {/* Toggle de Ativação Geral de Notificações */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <div className="space-y-0.5 pr-3">
                  <p className="text-xs font-bold text-slate-800">
                    Alertar no Check-in por QR Code
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Exibe alerta nativo com nome, matrícula e empresa sempre que um participante confirmar presença.
                  </p>
                </div>
                <button
                  id="btn-toggle-notifications-switch"
                  type="button"
                  onClick={() => onToggleEnabled(!isEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                  role="switch"
                  aria-checked={isEnabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Botão de Envio de Teste */}
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-white">
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Validar Notificação no Sistema
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Dispara uma notificação imediata para você conferir a aparência no seu dispositivo.
                  </p>
                </div>
                <button
                  id="btn-send-test-notification"
                  type="button"
                  onClick={handleTest}
                  className="shrink-0 flex items-center gap-1.5 py-2 px-3 bg-primary-theme-soft hover:opacity-90 text-primary-theme-text border border-primary-theme/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5 text-primary-theme" />
                  <span>{testSent ? 'Enviada!' : 'Enviar Teste'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Dica para desbloquear quando 'denied' */}
          {permission === 'denied' && (
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl space-y-2 text-xs text-rose-900">
              <div className="flex items-center gap-2 font-bold text-rose-950">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>Como reativar as notificações:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-rose-800">
                <li>Clique no ícone de <strong>Cadeado</strong> ou <strong>Ajustes do Site</strong> ao lado da barra de endereço URL.</li>
                <li>Localize a opção <strong>Notificações</strong>.</li>
                <li>Altere de <em>Bloqueado</em> para <strong>Permitir</strong>.</li>
                <li>Recarregue esta página para validar a nova permissão.</li>
              </ol>
            </div>
          )}

          {/* Explicação de funcionamento em segundo plano */}
          <div className="bg-slate-100/80 p-3.5 rounded-xl flex items-start gap-2.5 text-xs text-slate-600">
            <Laptop className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              <strong>Multitarefa sem preocupação:</strong> As notificações nativas da Web Notifications API funcionam mesmo se a aba estiver em segundo plano ou minimizada, permitindo que a administração acompanhe a recepção sem precisar manter a tela aberta.
            </p>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end">
          <button
            id="btn-close-web-notifications-footer"
            type="button"
            onClick={onClose}
            className="py-2 px-5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};

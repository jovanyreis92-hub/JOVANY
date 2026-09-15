import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Building2, 
  Sparkles, 
  Trash2, 
  Check, 
  Image as ImageIcon,
  Lock,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { CompanySettings } from '../types';
import { saveCompanySettings, updateAdminPassword } from '../utils/storage';

interface CompanySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: CompanySettings;
  onSaved: (newSettings: CompanySettings) => void;
}

// Logotipos pré-definidos elegantes caso a empresa queira usar imediatamente
const PRESET_LOGOS = [
  {
    id: 'preset-tech',
    label: 'Tech Corp',
    color: 'from-sky-500 to-blue-700',
    icon: '⚡',
  },
  {
    id: 'preset-shield',
    label: 'Segurança & Gestão',
    color: 'from-emerald-500 to-teal-700',
    icon: '🛡️',
  },
  {
    id: 'preset-global',
    label: 'Global Group',
    color: 'from-indigo-500 to-violet-700',
    icon: '🌐',
  },
  {
    id: 'preset-energy',
    label: 'Inovação & Energia',
    color: 'from-amber-500 to-orange-600',
    icon: '💎',
  }
];

export const CompanySettingsModal: React.FC<CompanySettingsModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onSaved,
}) => {
  const [companyName, setCompanyName] = useState(currentSettings.companyName || 'Minha Empresa');
  const [eventName, setEventName] = useState(currentSettings.eventName || 'Evento Corporativo');
  const [logoUrl, setLogoUrl] = useState<string | null>(currentSettings.logoUrl);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Alteração de login e senha
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [adminUser, setAdminUser] = useState(currentSettings.adminUsername || 'admin');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Processa a imagem enviada, redimensionando via canvas para tamanho ideal
  const processImageFile = (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError('O arquivo selecionado não é uma imagem válida.');
      return;
    }

    // Limite de 5MB
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('A imagem deve ter no máximo 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        // Redimensionar para no máximo 400x400 para otimizar storage
        const maxDim = 400;
        let w = img.width;
        let h = img.height;

        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const optimizedDataUrl = canvas.toDataURL('image/png', 0.9);
          setLogoUrl(optimizedDataUrl);
        } else {
          setLogoUrl(src);
        }
      };
      img.onerror = () => {
        setUploadError('Erro ao carregar a imagem. Tente outro formato.');
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  // Criar logo SVG estilizado a partir de preset
  const handleSelectPreset = (preset: typeof PRESET_LOGOS[0]) => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0284c7" />
            <stop offset="100%" stop-color="#0f172a" />
          </linearGradient>
        </defs>
        <rect width="160" height="160" rx="36" fill="url(#grad)" />
        <text x="80" y="98" font-size="52" text-anchor="middle" font-family="sans-serif">${preset.icon}</text>
      </svg>
    `;
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    setLogoUrl(dataUrl);
  };

  const handleSave = () => {
    setPasswordError(null);

    let finalUsername = currentSettings.adminUsername || 'admin';
    let finalPassword = currentSettings.adminPassword || '1234';

    // Validação de login e senha caso o usuário queira trocar
    if (showPasswordChange) {
      const cleanUser = adminUser.trim();
      if (!cleanUser || cleanUser.length < 3) {
        setPasswordError('O login (usuário) deve conter pelo menos 3 caracteres.');
        return;
      }
      finalUsername = cleanUser;

      if (newPassword.trim().length > 0) {
        if (newPassword.trim().length < 3) {
          setPasswordError('A nova senha deve ter pelo menos 3 dígitos.');
          return;
        }
        if (newPassword !== confirmPassword) {
          setPasswordError('A confirmação de senha não coincide com a nova senha digitada.');
          return;
        }
        finalPassword = newPassword.trim();
      }
    }

    const updated: CompanySettings = {
      ...currentSettings,
      companyName: companyName.trim() || 'Minha Empresa',
      eventName: eventName.trim() || 'Evento Corporativo',
      logoUrl: logoUrl,
      adminUsername: finalUsername,
      adminPassword: finalPassword,
    };

    saveCompanySettings(updated);
    onSaved(updated);
    onClose();
  };

  return (
    <div
      id="company-settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 my-8 animate-in fade-in zoom-in duration-150">
        {/* Cabeçalho */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Personalização da Empresa
              </h2>
              <p className="text-xs text-slate-400">
                Logomarca, nome da empresa e credenciais
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulário */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Campo: Nome da Empresa */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Nome da Empresa / Instituição
            </label>
            <div className="relative">
              <input
                id="input-company-name"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex: PetroSoft Tecnologia, Hospital Central, etc."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Aparecerá no cabeçalho do app, crachás impressos e relatórios em PDF.
            </p>
          </div>

          {/* Campo: Nome do Evento */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Nome do Evento / Treinamento
            </label>
            <input
              id="input-event-name"
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Ex: Workshop Anual de Segurança, Convenção 2026"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          {/* Seção de Upload da Logomarca */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Logomarca Oficial da Empresa
              </label>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => setLogoUrl(null)}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Remover Logo</span>
                </button>
              )}
            </div>

            {/* Caixa de Drop / Upload */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-sky-500 bg-sky-50/70'
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50/60'
              }`}
            >
              <input
                ref={fileInputRef}
                id="file-logo-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {logoUrl ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="h-24 max-w-full px-4 py-2 bg-white rounded-xl shadow-xs border border-slate-200 flex items-center justify-center">
                    <img
                      src={logoUrl}
                      alt="Prévia da Logomarca"
                      className="max-h-20 max-w-[200px] object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <Check className="h-3.5 w-3.5" />
                    <span>Logomarca carregada com sucesso</span>
                  </div>
                  <span className="text-[11px] text-slate-500 underline hover:text-slate-700">
                    Clique ou arraste outro arquivo para trocar
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="h-12 w-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      Clique para selecionar ou arraste o arquivo da logomarca
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Suporta PNG (fundo transparente recomendado), JPG, SVG ou WebP (até 5MB)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {uploadError && (
              <p className="text-xs text-rose-600 mt-2 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{uploadError}</span>
              </p>
            )}

            {/* Presets Rápidos */}
            <div className="mt-3">
              <span className="text-[11px] font-medium text-slate-500 block mb-1.5">
                Ou escolha um emblema corporativo instantâneo:
              </span>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_LOGOS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex flex-col items-center gap-1 transition-all text-center cursor-pointer"
                  >
                    <span className="text-xl">{preset.icon}</span>
                    <span className="text-[10px] font-medium text-slate-600 truncate w-full">
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Seção: Segurança e Credenciais (Login e Senha) */}
          <div className="pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowPasswordChange(!showPasswordChange)}
              className="text-xs text-slate-700 hover:text-slate-900 font-semibold flex items-center justify-between w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-slate-500" />
                <span>Segurança: Registrar / Alterar Login e Senha</span>
              </div>
              <span className="text-xs text-sky-600 font-normal">
                {showPasswordChange ? 'Ocultar' : 'Configurar'}
              </span>
            </button>

            {showPasswordChange && (
              <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <p className="text-[11px] text-slate-500">
                  Defina o usuário de login e senha para proteger o Painel de Controle e exportações.
                </p>

                {passwordError && (
                  <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Login / Usuário do Painel
                  </label>
                  <input
                    id="input-company-admin-user"
                    type="text"
                    value={adminUser}
                    onChange={(e) => setAdminUser(e.target.value)}
                    placeholder="Ex: admin"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Nova Senha de Acesso (deixe em branco se não desejar alterar)
                  </label>
                  <div className="relative">
                    <input
                      id="input-new-admin-password"
                      type={showPasswordText ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Digite a nova senha"
                      className="w-full px-3 py-2 pr-9 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordText(!showPasswordText)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPasswordText ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {newPassword.trim().length > 0 && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Confirmar Nova Senha
                    </label>
                    <input
                      id="input-confirm-admin-password"
                      type={showPasswordText ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex items-center justify-end gap-2.5">
          <button
            id="btn-cancel-company-settings"
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            id="btn-save-company-settings"
            type="button"
            onClick={handleSave}
            className="py-2.5 px-5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="h-4 w-4" />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>
    </div>
  );
};

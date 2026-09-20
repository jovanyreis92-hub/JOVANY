import React, { useState, useRef, useEffect } from 'react';
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
  AlertCircle,
  Type,
  Maximize2,
  Globe,
  PenTool,
  Palette,
  RotateCcw
} from 'lucide-react';
import { CompanySettings, LayoutFontFamily, LayoutScaleSize } from '../types';
import { saveCompanySettings } from '../utils/storage';
import { 
  FONT_OPTIONS, 
  SCALE_OPTIONS, 
  COLOR_PRESETS, 
  DEFAULT_PRIMARY_COLOR, 
  applyLayoutPreferences,
  applyPrimaryColor,
  hexToRgb,
  computeThemeColors
} from '../utils/theme';

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
  const [creatorName, setCreatorName] = useState(currentSettings.creatorName || 'Jovany Reis');
  const [creatorSignature, setCreatorSignature] = useState(
    currentSettings.creatorSignature || 'Desenvolvido por Jovany Reis • Sistema de Credenciamento & Inscrições'
  );
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

  // Fonte e Escala do Layout
  const [selectedFont, setSelectedFont] = useState<LayoutFontFamily>(currentSettings.fontFamily || 'inter');
  const [selectedScale, setSelectedScale] = useState<LayoutScaleSize>(currentSettings.layoutScale || 'normal');

  // Cor Primária do Sistema
  const [selectedPrimaryColor, setSelectedPrimaryColor] = useState<string>(
    currentSettings.primaryColor || DEFAULT_PRIMARY_COLOR
  );
  const [customHexInput, setCustomHexInput] = useState<string>(
    currentSettings.primaryColor || DEFAULT_PRIMARY_COLOR
  );

  // URL pública para acesso em outras redes
  const [publicAppUrl, setPublicAppUrl] = useState<string>(currentSettings.publicAppUrl || '');

  useEffect(() => {
    setSelectedFont(currentSettings.fontFamily || 'inter');
    setSelectedScale(currentSettings.layoutScale || 'normal');
    setSelectedPrimaryColor(currentSettings.primaryColor || DEFAULT_PRIMARY_COLOR);
    setCustomHexInput(currentSettings.primaryColor || DEFAULT_PRIMARY_COLOR);
    setPublicAppUrl(currentSettings.publicAppUrl || '');
    setCreatorName(currentSettings.creatorName || 'Jovany Reis');
    setCreatorSignature(
      currentSettings.creatorSignature || 'Desenvolvido por Jovany Reis • Sistema de Credenciamento & Inscrições'
    );
  }, [
    currentSettings.fontFamily, 
    currentSettings.layoutScale, 
    currentSettings.primaryColor,
    currentSettings.publicAppUrl, 
    currentSettings.creatorName, 
    currentSettings.creatorSignature, 
    isOpen
  ]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleColorChange = (newHex: string) => {
    let formatted = newHex.trim();
    if (!formatted.startsWith('#') && /^[0-9A-Fa-f]{3,6}$/.test(formatted)) {
      formatted = '#' + formatted;
    }
    setSelectedPrimaryColor(formatted);
    setCustomHexInput(formatted);
    if (hexToRgb(formatted)) {
      applyLayoutPreferences(selectedFont, selectedScale, formatted);
    }
  };

  const handleCancel = () => {
    applyLayoutPreferences(
      currentSettings.fontFamily, 
      currentSettings.layoutScale, 
      currentSettings.primaryColor
    );
    onClose();
  };

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
      fontFamily: selectedFont,
      layoutScale: selectedScale,
      primaryColor: hexToRgb(selectedPrimaryColor) ? selectedPrimaryColor : DEFAULT_PRIMARY_COLOR,
      publicAppUrl: publicAppUrl.trim() || undefined,
      creatorName: creatorName.trim() || undefined,
      creatorSignature: creatorSignature.trim() || undefined,
    };

    saveCompanySettings(updated);
    applyLayoutPreferences(selectedFont, selectedScale, updated.primaryColor);
    onSaved(updated);
    onClose();
  };

  return (
    <div
      id="company-settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCancel();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8 animate-in fade-in zoom-in duration-150">
        {/* Cabeçalho */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Personalização da Empresa & Layout
              </h2>
              <p className="text-xs text-slate-400">
                Logomarca, fonte, proporção do layout e credenciais
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
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

          {/* Seção: Tipografia & Tamanho do Layout */}
          <div className="pt-3 border-t border-slate-100 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                <Type className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Fonte & Tamanho do Layout
                </h3>
                <p className="text-[11px] text-slate-400">
                  Altere a tipografia de todo o sistema e a escala visual dos elementos
                </p>
              </div>
            </div>

            {/* Seleção de Família de Fonte */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                  Família da Fonte
                </label>
                <span className="text-[11px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                  {FONT_OPTIONS.find((f) => f.id === selectedFont)?.name} ({FONT_OPTIONS.find((f) => f.id === selectedFont)?.category})
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FONT_OPTIONS.map((font) => {
                  const isSelected = selectedFont === font.id;
                  return (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => {
                        setSelectedFont(font.id);
                        applyLayoutPreferences(font.id, selectedScale);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50/70 shadow-xs ring-2 ring-sky-500/20'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {font.name}
                        </span>
                        {isSelected && (
                          <span className="h-4 w-4 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block mb-1.5">
                        {font.category}
                      </span>
                      <div
                        className="text-xs text-slate-800 font-medium py-1 px-1.5 bg-white rounded border border-slate-200/80 truncate"
                        style={{ fontFamily: font.cssFamily }}
                        title={font.preview}
                      >
                        {font.preview}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Seleção de Tamanho / Escala do Layout */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                  Tamanho / Proporção do Layout
                </label>
                <span className="text-[11px] font-bold text-primary-theme-text bg-primary-theme-soft px-2 py-0.5 rounded-full border border-primary-theme-light">
                  {SCALE_OPTIONS.find((s) => s.id === selectedScale)?.percentage} ({SCALE_OPTIONS.find((s) => s.id === selectedScale)?.name})
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SCALE_OPTIONS.map((scale) => {
                  const isSelected = selectedScale === scale.id;
                  return (
                    <button
                      key={scale.id}
                      type="button"
                      onClick={() => {
                        setSelectedScale(scale.id);
                        applyLayoutPreferences(selectedFont, scale.id, selectedPrimaryColor);
                      }}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer relative flex flex-col items-center justify-between gap-1 ${
                        isSelected
                          ? 'border-primary-theme bg-primary-theme-soft shadow-xs ring-2 ring-primary-theme/20'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-900">
                        {scale.name}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-primary-theme-text">
                        {scale.percentage}
                      </span>
                      <span className="text-[9px] text-slate-500 leading-tight">
                        {scale.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nova Seção: Personalização da Cor Primária do Sistema */}
            <div id="company-primary-color-section" className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-primary-theme" />
                  <span>Cor Primária do Sistema & Botões</span>
                </label>
                <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  <span
                    className="h-3 w-3 rounded-full border border-black/10 shadow-xs shrink-0"
                    style={{ backgroundColor: selectedPrimaryColor }}
                  ></span>
                  <span className="text-[11px] font-mono font-bold text-slate-700">
                    {selectedPrimaryColor.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Presets de Cores Corporativas */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {COLOR_PRESETS.map((preset) => {
                  const isSelected = selectedPrimaryColor.toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleColorChange(preset.hex)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer relative flex items-center gap-2.5 ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900/5 ring-2 ring-primary-theme/30 shadow-xs'
                          : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
                      }`}
                      title={`${preset.name} (${preset.hex}) - ${preset.tag}`}
                    >
                      <span
                        className="h-6 w-6 rounded-lg shadow-xs shrink-0 flex items-center justify-center border border-black/10"
                        style={{ backgroundColor: preset.hex }}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5 text-white drop-shadow-xs" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-bold text-slate-900 leading-tight truncate">
                          {preset.name}
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono leading-tight truncate">
                          {preset.tag}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Seletor Livre Personalizado & Botão de Restauração */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="input-custom-color-picker"
                    className="relative cursor-pointer h-7 w-8 rounded-lg overflow-hidden border border-slate-300 shadow-xs shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: selectedPrimaryColor }}
                    title="Clique para abrir a paleta livre de cores"
                  >
                    <input
                      id="input-custom-color-picker"
                      type="color"
                      value={selectedPrimaryColor.startsWith('#') ? selectedPrimaryColor : '#0284c7'}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-slate-600">Código Hex:</span>
                    <input
                      type="text"
                      maxLength={7}
                      value={customHexInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomHexInput(val);
                        if (/^#?[0-9A-Fa-f]{6}$/.test(val)) {
                          handleColorChange(val);
                        }
                      }}
                      onBlur={() => {
                        if (!hexToRgb(customHexInput)) {
                          setCustomHexInput(selectedPrimaryColor);
                        }
                      }}
                      placeholder="#0284C7"
                      className="w-20 px-2 py-1 text-xs font-mono font-bold bg-white border border-slate-300 rounded-md uppercase text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleColorChange(DEFAULT_PRIMARY_COLOR)}
                  className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900 font-medium px-2 py-1 rounded hover:bg-slate-200/70 transition-colors cursor-pointer"
                  title="Restaurar cor padrão original (Azul Céu / Sky-600)"
                >
                  <RotateCcw className="h-3 w-3 text-slate-500" />
                  <span>Padrão Corporativo</span>
                </button>
              </div>
            </div>

            {/* Caixa de Demonstração / Prévia ao Vivo */}
            <div className="p-3.5 bg-slate-900 text-white rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary-theme" />
                  Prévia em Tempo Real (Tipografia, Escala & Cor Primária)
                </span>
                <span className="text-[10px] text-slate-300 font-medium">
                  {FONT_OPTIONS.find((f) => f.id === selectedFont)?.name} • {SCALE_OPTIONS.find((s) => s.id === selectedScale)?.percentage}
                </span>
              </div>
              <div 
                className="p-3 bg-slate-800/90 rounded-lg border border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5"
                style={{
                  fontFamily: FONT_OPTIONS.find((f) => f.id === selectedFont)?.cssFamily,
                }}
              >
                <div>
                  <div className="text-xs font-bold text-white">
                    {companyName || 'Minha Empresa'} — {eventName || 'Evento Corporativo'}
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    Exemplo: Carlos Eduardo Silva (Matrícula: 1001)
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Presente
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-primary-theme text-primary-theme-contrast shadow-xs">
                    Credenciado
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Seção: Conectividade & Acesso em Outras Redes (URL Pública) */}
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-sky-600" />
                <span>URL Pública de Inscrição (Acesso em Outras Redes / 4G / Wi-Fi)</span>
              </label>
              <button
                type="button"
                onClick={() => setPublicAppUrl('https://ais-pre-rihuh2lzyxgzrc2qmh3tyj-161635627789.us-east1.run.app')}
                className="text-[11px] text-sky-600 hover:text-sky-800 font-medium underline cursor-pointer"
              >
                Preencher com URL Pública Oficial
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Para que participantes consigam se cadastrar usando 4G, 5G ou outras redes Wi-Fi sem erro 403 ou bloqueio de login do Google, use a URL pública (ais-pre) ou seu próprio domínio/servidor.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={publicAppUrl}
                onChange={(e) => setPublicAppUrl(e.target.value)}
                placeholder="https://ais-pre-rihuh2lzyxgzrc2qmh3tyj-161635627789.us-east1.run.app"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
              {publicAppUrl && (
                <button
                  type="button"
                  onClick={() => setPublicAppUrl('')}
                  className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium cursor-pointer"
                  title="Limpar para usar detecção automática"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Seção: Assinatura do Criador & Rodapé */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <PenTool className="h-3.5 w-3.5 text-sky-600" />
                <span>Assinatura e Nome do Criador (Rodapé)</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setCreatorName('Jovany Reis');
                  setCreatorSignature('Desenvolvido por Jovany Reis • Sistema de Credenciamento & Inscrições');
                }}
                className="text-[11px] text-sky-600 hover:text-sky-800 font-medium underline cursor-pointer"
              >
                Restaurar Padrão
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Nome do criador e assinatura exibidos no rodapé do sistema e em todas as telas da aplicação.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Nome do Criador
                </label>
                <input
                  type="text"
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  placeholder="Ex: Jovany Reis"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Assinatura do Rodapé
                </label>
                <input
                  type="text"
                  value={creatorSignature}
                  onChange={(e) => setCreatorSignature(e.target.value)}
                  placeholder="Ex: Desenvolvido por Jovany Reis"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
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
            onClick={handleCancel}
            className="py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            id="btn-save-company-settings"
            type="button"
            onClick={handleSave}
            className="py-2.5 px-5 btn-primary-action rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="h-4 w-4" />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>
    </div>
  );
};

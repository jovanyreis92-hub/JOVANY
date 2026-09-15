import React, { useState } from 'react';
import { 
  X, 
  KeyRound, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { CompanySettings } from '../types';
import { registerAdminCredentials } from '../utils/storage';

interface AdminCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: CompanySettings;
  onSuccess: (updatedSettings: CompanySettings) => void;
}

export const AdminCredentialsModal: React.FC<AdminCredentialsModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onSuccess,
}) => {
  const [username, setUsername] = useState(currentSettings.adminUsername || 'admin');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanUser = username.trim();
    const cleanPass = newPassword.trim();

    if (!cleanUser || cleanUser.length < 3) {
      setErrorMessage('O login (nome de usuário) deve conter pelo menos 3 caracteres.');
      return;
    }

    if (!cleanPass || cleanPass.length < 3) {
      setErrorMessage('A senha deve conter pelo menos 3 caracteres.');
      return;
    }

    if (cleanPass !== confirmPassword.trim()) {
      setErrorMessage('A confirmação da senha não coincide com a nova senha digitada.');
      return;
    }

    const result = registerAdminCredentials(cleanUser, cleanPass);
    if (!result.success) {
      setErrorMessage(result.error || 'Erro ao registrar credenciais.');
      return;
    }

    setSuccessMessage('Login e senha registrados com sucesso!');
    const updated: CompanySettings = {
      ...currentSettings,
      adminUsername: cleanUser,
      adminPassword: cleanPass,
    };
    onSuccess(updated);

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div
      id="admin-credentials-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 my-8 animate-in fade-in zoom-in duration-150">
        {/* Cabeçalho */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Registrar Login e Senha
              </h2>
              <p className="text-xs text-slate-400">
                Acesso restrito ao Painel de Controle
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Campo Login / Usuário */}
          <div>
            <label
              htmlFor="input-cred-username"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Login / Nome de Usuário
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="h-4 w-4" />
              </div>
              <input
                id="input-cred-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: admin, gestor, coordenador"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                required
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Usuário que será solicitado no desbloqueio do painel.
            </p>
          </div>

          {/* Campo Nova Senha */}
          <div>
            <label
              htmlFor="input-cred-password"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Nova Senha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="input-cred-password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha de acesso"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirmar Senha */}
          <div>
            <label
              htmlFor="input-cred-confirm-password"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Confirmar Nova Senha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <input
                id="input-cred-confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                required
              />
            </div>
          </div>

          <div className="bg-sky-50/80 p-3 rounded-xl border border-sky-200/80 text-[11px] text-sky-900 leading-relaxed">
            <strong>Dica de Segurança:</strong> As credenciais cadastradas são salvas de forma segura e exclusiva para este aplicativo. Anote seu usuário e senha em local protegido.
          </div>

          {/* Botões */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              id="btn-cancel-admin-credentials"
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              id="btn-save-admin-credentials"
              type="submit"
              className="py-2.5 px-5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>Salvar Login e Senha</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

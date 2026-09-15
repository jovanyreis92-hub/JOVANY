import React from 'react';
import { UserPlus, ShieldCheck, Building2, Share2, LogOut } from 'lucide-react';
import { ActiveTab, Participant, CompanySettings } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  participants: Participant[];
  isAdminAuthenticated: boolean;
  companySettings: CompanySettings;
  onOpenMobileShare: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  participants,
  isAdminAuthenticated,
  companySettings,
  onOpenMobileShare,
  onLogout,
}) => {

  const total = participants.length;
  const attended = participants.filter((p) => p.attended).length;
  const percent = total > 0 ? Math.round((attended / total) * 100) : 0;

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between py-2.5 md:h-16 gap-3">
          {/* Logo & Identidade da Empresa */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-3">
              {/* Exibição da Logomarca Oficial da Empresa */}
              <div
                id="header-company-brand"
                className="flex items-center gap-2.5 p-1 -m-1 text-left select-none"
              >
                {companySettings.logoUrl ? (
                  <div className="h-10 max-w-[130px] bg-white rounded-xl px-2.5 py-1 flex items-center justify-center shadow-xs border border-slate-200/40">
                    <img
                      src={companySettings.logoUrl}
                      alt={companySettings.companyName}
                      className="max-h-8 max-w-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center text-white shadow-sm border border-sky-400/30">
                    <Building2 className="h-5 w-5" />
                  </div>
                )}

                <div>
                  <h1 className="text-sm sm:text-base font-bold tracking-tight text-white truncate max-w-[170px] sm:max-w-[240px]">
                    {companySettings.companyName || 'Minha Empresa'}
                  </h1>
                  <p className="text-[11px] text-slate-400 truncate max-w-[180px] sm:max-w-[260px]">
                    {companySettings.eventName || 'Credenciamento & Presença'}
                  </p>
                </div>
              </div>
            </div>

            {/* Contador Compacto de Presença */}
            <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-full border border-slate-700/80 text-xs shadow-inner">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-200 font-medium font-mono text-[11px]">
                {attended}/{total} <span className="text-slate-400 font-sans">({percent}%)</span>
              </span>
            </div>
          </div>

          {/* Navegação entre Abas e Botão de Compartilhar */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            <nav className="flex items-center gap-1 p-1 bg-slate-800/90 rounded-xl border border-slate-700/80 flex-1 md:flex-none justify-center">
              <button
                id="nav-tab-register"
                type="button"
                onClick={() => setActiveTab('register')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'register'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <UserPlus className="h-4 w-4" />
                <span>Cadastro</span>
              </button>

              <button
                id="nav-tab-admin"
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Painel Admin</span>
                {isAdminAuthenticated && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                )}
              </button>
            </nav>

            {/* Botão de Compartilhar Link de Inscrição */}
            <button
              id="btn-header-mobile-share"
              type="button"
              onClick={onOpenMobileShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700 transition-all shadow-xs shrink-0 cursor-pointer"
              title="Abrir QR Code e link para compartilhar formulário de inscrição"
            >
              <Share2 className="h-4 w-4 text-sky-400" />
              <span className="hidden sm:inline">Compartilhar</span>
            </button>

            {/* Botão Sair no Cabeçalho - Exibido SOMENTE no Painel Admin */}
            {activeTab === 'admin' && (
              <button
                id="btn-header-logout"
                type="button"
                onClick={onLogout}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs border transition-all shadow-xs shrink-0 cursor-pointer ${
                  isAdminAuthenticated
                    ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border-rose-500/40'
                    : 'bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-700'
                }`}
                title={isAdminAuthenticated ? "Encerrar sessão de administrador (Sair)" : "Sair do Painel Admin"}
              >
                <LogOut className="h-4 w-4 text-rose-400" />
                <span>Sair</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

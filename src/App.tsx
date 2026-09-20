/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ActiveTab, Participant, CompanySettings } from './types';
import { 
  getStoredParticipants, 
  getCompanySettings, 
  initMultiDeviceSync, 
  isAdminLoggedIn, 
  setAdminLoggedIn 
} from './utils/storage';
import { applyLayoutPreferences } from './utils/theme';
import { Header } from './components/Header';
import { RegistrationForm } from './components/RegistrationForm';
import { AdminPanel } from './components/AdminPanel';
import { CompanySettingsModal } from './components/CompanySettingsModal';
import { MobileShareModal } from './components/MobileShareModal';
import { UserPlus, ShieldCheck, CheckCircle2, Share2, Sparkles } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('register');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => isAdminLoggedIn());
  const [companySettings, setCompanySettings] = useState<CompanySettings>(getCompanySettings());
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState<boolean>(false);
  const [isMobileShareOpen, setIsMobileShareOpen] = useState<boolean>(false);

  const handleSetAdminAuth = (auth: boolean) => {
    setIsAdminAuthenticated(auth);
    setAdminLoggedIn(auth);
  };

  // Carrega e sincroniza os participantes
  const reloadParticipants = () => {
    setParticipants(getStoredParticipants());
  };

  const reloadCompanySettings = () => {
    setCompanySettings(getCompanySettings());
  };

  // Aplica fonte e escala do layout
  useEffect(() => {
    applyLayoutPreferences(companySettings.fontFamily, companySettings.layoutScale);
  }, [companySettings.fontFamily, companySettings.layoutScale]);

  useEffect(() => {
    // Detecta parâmetro de aba na URL (?tab=register / admin / eventId)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const eventIdParam = params.get('eventId');
      if (tabParam === 'register' || tabParam === 'admin') {
        setActiveTab(tabParam as ActiveTab);
      } else if (tabParam === 'scanner') {
        // Redireciona para o painel admin (onde fica o leitor QR da portaria)
        setActiveTab('admin');
      } else if (eventIdParam) {
        // Link único de inscrição do evento
        setActiveTab('register');
      }
    }

    reloadParticipants();
    reloadCompanySettings();

    // Inicializa a sincronização em tempo real multi-celulares (SSE + Polling de resiliência)
    const stopSync = initMultiDeviceSync();

    const handleUpdate = () => {
      reloadParticipants();
    };

    const handleCompanyUpdate = () => {
      reloadCompanySettings();
    };

    const handleAdminAuthUpdate = (e: Event) => {
      const custom = e as CustomEvent<boolean>;
      if (typeof custom.detail === 'boolean') {
        setIsAdminAuthenticated(custom.detail);
      }
    };

    window.addEventListener('participants-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('company-settings-updated', handleCompanyUpdate);
    window.addEventListener('admin-auth-changed', handleAdminAuthUpdate);

    return () => {
      stopSync();
      window.removeEventListener('participants-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('company-settings-updated', handleCompanyUpdate);
      window.removeEventListener('admin-auth-changed', handleAdminAuthUpdate);
    };
  }, []);

  const total = participants.length;
  const attendedCount = participants.filter((p) => p.attended).length;

  const handleHeaderLogout = () => {
    handleSetAdminAuth(false);
    setActiveTab('register');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans antialiased selection:bg-sky-500 selection:text-white">
      {/* Barra de Navegação Superior com Logomarca da Empresa */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        participants={participants}
        isAdminAuthenticated={isAdminAuthenticated}
        companySettings={companySettings}
        onOpenMobileShare={() => setIsMobileShareOpen(true)}
        onLogout={handleHeaderLogout}
      />

      {/* Conteúdo Principal conforme a aba ativa */}
      <main className="flex-1 pb-16 sm:pb-8">
        <div className={activeTab === 'register' ? 'block' : 'hidden'}>
          <RegistrationForm
            onParticipantAdded={() => {
              reloadParticipants();
            }}
            companySettings={companySettings}
            onOpenMobileShare={() => setIsMobileShareOpen(true)}
            isAdminAuthenticated={isAdminAuthenticated}
            setIsAdminAuthenticated={handleSetAdminAuth}
            onNavigateToAdmin={() => setActiveTab('admin')}
          />
        </div>

        <div className={activeTab === 'admin' ? 'block' : 'hidden'}>
          <AdminPanel
            participants={participants}
            isAuthenticated={isAdminAuthenticated}
            setIsAuthenticated={handleSetAdminAuth}
            onNavigateToRegister={() => setActiveTab('register')}
            onUpdateParticipants={reloadParticipants}
            companySettings={companySettings}
            onOpenCompanySettings={() => setIsCompanyModalOpen(true)}
            onOpenMobileShare={() => setIsMobileShareOpen(true)}
          />
        </div>
      </main>

      {/* Barra de Navegação Inferior Fixa para Dispositivos Móveis */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2 shadow-lg flex items-center justify-around">
        <button
          id="mobile-tab-register"
          type="button"
          onClick={() => setActiveTab('register')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-3 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'register' ? 'text-sky-600 font-bold' : 'text-slate-500'
          }`}
        >
          <UserPlus className="h-5 w-5" />
          <span>Cadastro</span>
        </button>

        <button
          id="mobile-tab-admin"
          type="button"
          onClick={() => setActiveTab('admin')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-3 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'admin' ? 'text-sky-600 font-bold' : 'text-slate-500'
          }`}
        >
          <div className="relative">
            <ShieldCheck className="h-5 w-5" />
            {isAdminAuthenticated && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full"></span>
            )}
          </div>
          <span>Painel Admin</span>
        </button>

        {/* Botão de Compartilhar no mobile */}
        <button
          id="mobile-tab-share"
          type="button"
          onClick={() => setIsMobileShareOpen(true)}
          className="flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-3 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <Share2 className="h-5 w-5 text-slate-600" />
          <span>Compartilhar</span>
        </button>
      </div>

      {/* Rodapé da Aplicação com Assinatura e Nome do Criador */}
      <footer id="app-footer" className="bg-white border-t border-slate-200/90 py-5 px-4 sm:px-6 text-xs text-slate-500 pb-24 sm:pb-5 transition-all">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          {/* Informações da Empresa & Sistema */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-center md:justify-start gap-1.5 font-semibold text-slate-700">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                {companySettings.companyName 
                  ? `${companySettings.companyName} • Sistema de Presença e Credenciamento QR`
                  : 'Sistema Integrado de Presença e Credenciamento por QR Code'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Painel Administrativo Protegido
            </p>
          </div>

          {/* Assinatura e Nome do Criador */}
          <div className="flex flex-col md:items-end items-center justify-center gap-1 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 w-full md:w-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200/90 text-slate-800 shadow-2xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="text-[11px] font-medium text-slate-600">
                Criado por: <strong className="text-slate-900 font-bold">{companySettings.creatorName || 'Jovany Reis'}</strong>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-sans tracking-tight">
              {companySettings.creatorSignature || 'Desenvolvido por Jovany Reis • Sistema de Credenciamento & Inscrições'}
            </p>
          </div>
        </div>
      </footer>

      {/* Modal de Compartilhamento para Múltiplos Celulares e Redes (4G/5G/Wi-Fi) */}
      <MobileShareModal
        isOpen={isMobileShareOpen}
        onClose={() => setIsMobileShareOpen(false)}
        companySettings={companySettings}
      />

      {/* Modal de Personalização da Empresa e Logomarca */}
      <CompanySettingsModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        currentSettings={companySettings}
        onSaved={(newSettings) => setCompanySettings(newSettings)}
      />
    </div>
  );
}

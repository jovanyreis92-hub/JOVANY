/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ActiveTab, Participant, CompanySettings } from './types';
import { getStoredParticipants, getCompanySettings } from './utils/storage';
import { Header } from './components/Header';
import { RegistrationForm } from './components/RegistrationForm';
import { QrScanner } from './components/QrScanner';
import { AdminPanel } from './components/AdminPanel';
import { CompanySettingsModal } from './components/CompanySettingsModal';
import { UserPlus, QrCode, ShieldCheck, CheckCircle2, Building2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('register');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(getCompanySettings());
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState<boolean>(false);

  // Carrega e sincroniza os participantes
  const reloadParticipants = () => {
    setParticipants(getStoredParticipants());
  };

  const reloadCompanySettings = () => {
    setCompanySettings(getCompanySettings());
  };

  useEffect(() => {
    reloadParticipants();
    reloadCompanySettings();

    const handleUpdate = () => {
      reloadParticipants();
    };

    const handleCompanyUpdate = () => {
      reloadCompanySettings();
    };

    window.addEventListener('participants-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('company-settings-updated', handleCompanyUpdate);

    return () => {
      window.removeEventListener('participants-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('company-settings-updated', handleCompanyUpdate);
    };
  }, []);

  const total = participants.length;
  const attendedCount = participants.filter((p) => p.attended).length;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans antialiased selection:bg-sky-500 selection:text-white">
      {/* Barra de Navegação Superior com Logomarca da Empresa */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        participants={participants}
        isAdminAuthenticated={isAdminAuthenticated}
        companySettings={companySettings}
        onOpenCompanySettings={() => setIsCompanyModalOpen(true)}
      />

      {/* Conteúdo Principal conforme a aba ativa */}
      <main className="flex-1 pb-16 sm:pb-8">
        {activeTab === 'register' && (
          <RegistrationForm
            onParticipantAdded={() => {
              reloadParticipants();
            }}
            onNavigateToScanner={() => setActiveTab('scanner')}
            companySettings={companySettings}
            onOpenCompanySettings={() => setIsCompanyModalOpen(true)}
          />
        )}

        {activeTab === 'scanner' && (
          <QrScanner
            onAttendanceMarked={() => {
              reloadParticipants();
            }}
            onNavigateToAdmin={() => setActiveTab('admin')}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanel
            participants={participants}
            isAuthenticated={isAdminAuthenticated}
            setIsAuthenticated={setIsAdminAuthenticated}
            onNavigateToRegister={() => setActiveTab('register')}
            onUpdateParticipants={reloadParticipants}
            companySettings={companySettings}
            onOpenCompanySettings={() => setIsCompanyModalOpen(true)}
          />
        )}
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
          id="mobile-tab-scanner"
          type="button"
          onClick={() => setActiveTab('scanner')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-3 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'scanner' ? 'text-sky-600 font-bold' : 'text-slate-500'
          }`}
        >
          <div className="relative">
            <QrCode className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full"></span>
          </div>
          <span>Leitor QR</span>
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
          <span>Admin</span>
        </button>

        {/* Botão de logo no mobile */}
        <button
          id="mobile-tab-logo"
          type="button"
          onClick={() => setIsCompanyModalOpen(true)}
          className="flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-3 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <Building2 className="h-5 w-5 text-sky-600" />
          <span>Empresa</span>
        </button>
      </div>

      {/* Rodapé Desktop */}
      <footer className="bg-white border-t border-slate-200/80 py-4 px-6 text-center text-xs text-slate-500 hidden sm:block">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>
              {companySettings.companyName 
                ? `${companySettings.companyName} • Sistema de Presença e Credenciamento QR`
                : 'Sistema Integrado de Presença e Credenciamento por QR Code'}
            </span>
          </p>
          <p className="text-slate-400">
            {attendedCount} presentes de {total} cadastrados &bull; Painel Administrativo Protegido
          </p>
        </div>
      </footer>

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

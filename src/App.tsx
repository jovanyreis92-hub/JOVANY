/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
import { QrScanner } from './components/QrScanner';
import { RecentAttendanceLog } from './components/RecentAttendanceLog';
import { CompanySettingsModal } from './components/CompanySettingsModal';
import { MobileShareModal } from './components/MobileShareModal';
import { UserPlus, ShieldCheck, CheckCircle2, Sparkles, CheckCheck, Zap, X, UserX } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('register');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => isAdminLoggedIn());
  const [companySettings, setCompanySettings] = useState<CompanySettings>(getCompanySettings());
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState<boolean>(false);
  const [isMobileShareOpen, setIsMobileShareOpen] = useState<boolean>(false);
  const [liveAttendanceNotification, setLiveAttendanceNotification] = useState<{
    participant: Participant;
    timestamp: string;
    source: string;
    status: 'present' | 'absent';
  } | null>(null);

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

  // Aplica fonte, escala do layout e cor primária dinâmica
  useEffect(() => {
    applyLayoutPreferences(
      companySettings.fontFamily,
      companySettings.layoutScale,
      companySettings.primaryColor
    );
  }, [companySettings.fontFamily, companySettings.layoutScale, companySettings.primaryColor]);

  useEffect(() => {
    // Detecta parâmetro de aba na URL (?tab=register / admin / scanner / eventId)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const eventIdParam = params.get('eventId');
      if (tabParam === 'register' || tabParam === 'admin' || tabParam === 'scanner') {
        setActiveTab(tabParam as ActiveTab);
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

    const handleAttendanceConfirmed = (e: Event) => {
      reloadParticipants();
      const custom = e as CustomEvent<{ participant?: Participant; timestamp?: string; synced?: boolean }>;
      if (custom.detail?.participant) {
        const p = custom.detail.participant;
        const time = custom.detail.timestamp
          ? new Date(custom.detail.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        setLiveAttendanceNotification({
          participant: p,
          timestamp: time,
          source: custom.detail.synced ? 'Sincronizado Multi-Rede' : 'Presença Confirmada',
          status: 'present',
        });

        setTimeout(() => {
          setLiveAttendanceNotification((curr) => (curr?.participant.id === p.id ? null : curr));
        }, 4500);
      }
    };

    const handleAttendanceAbsent = (e: Event) => {
      reloadParticipants();
      const custom = e as CustomEvent<{ participant?: Participant; timestamp?: string; synced?: boolean }>;
      if (custom.detail?.participant) {
        const p = custom.detail.participant;
        const time = custom.detail.timestamp
          ? new Date(custom.detail.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        setLiveAttendanceNotification({
          participant: p,
          timestamp: time,
          source: custom.detail.synced ? 'Sincronizado Multi-Rede' : 'Status Alterado',
          status: 'absent',
        });

        setTimeout(() => {
          setLiveAttendanceNotification((curr) => (curr?.participant.id === p.id ? null : curr));
        }, 4500);
      }
    };

    window.addEventListener('participants-updated', handleUpdate);
    window.addEventListener('participant-received', handleUpdate);
    window.addEventListener('participant-updated', handleUpdate);
    window.addEventListener('attendance-confirmed', handleAttendanceConfirmed);
    window.addEventListener('attendance-absent', handleAttendanceAbsent);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('company-settings-updated', handleCompanyUpdate);
    window.addEventListener('admin-auth-changed', handleAdminAuthUpdate);

    return () => {
      stopSync();
      window.removeEventListener('participants-updated', handleUpdate);
      window.removeEventListener('participant-received', handleUpdate);
      window.removeEventListener('participant-updated', handleUpdate);
      window.removeEventListener('attendance-confirmed', handleAttendanceConfirmed);
      window.removeEventListener('attendance-absent', handleAttendanceAbsent);
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
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans antialiased selection:bg-primary-theme selection:text-white">
      {/* Notificação Flutuante de Leitura QR Sincronizada em Tempo Real */}
      <AnimatePresence>
        {liveAttendanceNotification && (
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.95 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={`fixed top-18 right-4 left-4 sm:left-auto sm:max-w-md z-50 bg-slate-900/95 text-white border-2 rounded-2xl shadow-2xl p-3.5 backdrop-blur-md flex items-center justify-between gap-3 pointer-events-auto ${
              liveAttendanceNotification.status === 'present'
                ? 'border-emerald-400'
                : 'border-amber-400'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm animate-pulse ${
                  liveAttendanceNotification.status === 'present'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-amber-500 text-white'
                }`}
              >
                {liveAttendanceNotification.status === 'present' ? (
                  <CheckCheck className="h-5 w-5" />
                ) : (
                  <UserX className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <div
                  className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
                    liveAttendanceNotification.status === 'present'
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}
                >
                  <Zap
                    className={`h-3 w-3 ${
                      liveAttendanceNotification.status === 'present'
                        ? 'fill-emerald-400'
                        : 'fill-amber-400'
                    }`}
                  />
                  <span>
                    {liveAttendanceNotification.status === 'present'
                      ? 'Presença Sincronizada: PRESENTE'
                      : 'Status Sincronizado: AUSENTE'}
                  </span>
                </div>
                <p className="text-xs font-bold text-white truncate mt-0.5">
                  {liveAttendanceNotification.participant.fullName}
                </p>
                <p className="text-[11px] text-slate-300 font-mono truncate">
                  Matrícula: {liveAttendanceNotification.participant.registrationNumber} • {liveAttendanceNotification.timestamp}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLiveAttendanceNotification(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg text-xs cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barra de Navegação Superior com Logomarca da Empresa */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        participants={participants}
        isAdminAuthenticated={isAdminAuthenticated}
        companySettings={companySettings}
        onLogout={handleHeaderLogout}
      />

      {/* Conteúdo Principal com Animação de Transição Fluida */}
      <main className="flex-1 pb-16 sm:pb-8 overflow-x-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'register' ? (
            <motion.div
              key="route-tab-register"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <RegistrationForm
                onParticipantAdded={() => {
                  reloadParticipants();
                }}
                companySettings={companySettings}
                isAdminAuthenticated={isAdminAuthenticated}
                setIsAdminAuthenticated={handleSetAdminAuth}
                onNavigateToAdmin={() => setActiveTab('admin')}
              />
            </motion.div>
          ) : activeTab === 'scanner' ? (
            <motion.div
              key="route-tab-scanner"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="pt-1"
            >
              <QrScanner
                isActive={activeTab === 'scanner'}
                onAttendanceMarked={(p) => {
                  reloadParticipants();
                }}
                onNavigateToAdmin={() => setActiveTab('admin')}
              />
              <div className="max-w-3xl mx-auto px-4 pb-12">
                <RecentAttendanceLog
                  participants={participants}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="route-tab-admin"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
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
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Barra de Navegação Inferior Fixa para Dispositivos Móveis */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-2 shadow-lg flex items-center justify-around">
        <button
          id="mobile-tab-register"
          type="button"
          onClick={() => setActiveTab('register')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-4 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'register' ? 'text-primary-theme font-bold' : 'text-slate-500'
          }`}
        >
          <UserPlus className="h-5 w-5" />
          <span>Cadastro</span>
        </button>

        <button
          id="mobile-tab-admin"
          type="button"
          onClick={() => setActiveTab('admin')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-4 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'admin' ? 'text-primary-theme font-bold' : 'text-slate-500'
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

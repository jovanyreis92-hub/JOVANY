import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Search, 
  FileSpreadsheet, 
  FileText, 
  Trash2, 
  QrCode, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Users, 
  Building2, 
  Hash, 
  AlertTriangle,
  UserPlus,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
  ImageIcon,
  User,
  Share2,
  Camera,
  Palette,
  Calendar,
  Filter,
  Pencil,
  LogOut,
  Sparkles
} from 'lucide-react';
import { Participant, CompanySettings, EventItem, UserAccount } from '../types';
import { 
  deleteParticipant, 
  deleteMultipleParticipants, 
  toggleAttendance, 
  resetToDemoData,
  verifyAdminCredentials,
  registerAdminCredentials,
  verifyAdminPassword,
  getStoredEvents,
  syncWithServer,
  getStoredUsers,
  registerNewUser,
  getCurrentUser
} from '../utils/storage';
import { exportToExcel, exportToPDF } from '../utils/export';
import { QrBadgeModal } from './QrBadgeModal';
import { AdminCredentialsModal } from './AdminCredentialsModal';
import { UsersManagementModal } from './UsersManagementModal';
import { QrScanner } from './QrScanner';
import { EventManager } from './EventManager';
import { EditParticipantModal } from './EditParticipantModal';

interface AdminPanelProps {
  participants: Participant[];
  isAuthenticated: boolean;
  setIsAuthenticated: (auth: boolean) => void;
  onNavigateToRegister: () => void;
  onUpdateParticipants: () => void;
  companySettings?: CompanySettings;
  onOpenCompanySettings?: () => void;
  onOpenMobileShare?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  participants,
  isAuthenticated,
  setIsAuthenticated,
  onNavigateToRegister,
  onUpdateParticipants,
  companySettings,
  onOpenCompanySettings,
  onOpenMobileShare,
}) => {
  // Estado de autenticação do painel (Login vs Registro)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [usernameInput, setUsernameInput] = useState(companySettings?.adminUsername || 'admin');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Usuário atualmente autenticado e contagem de usuários
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => getCurrentUser());
  const [usersCount, setUsersCount] = useState<number>(() => getStoredUsers().length);

  // Campos para Registro Direto de Login e Senha
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Modal para registrar/alterar credenciais quando logado
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);

  // Sincroniza usuário e contagem quando eventos de usuários disparam
  useEffect(() => {
    const handleUsersChange = () => {
      setCurrentUser(getCurrentUser());
      setUsersCount(getStoredUsers().length);
    };
    window.addEventListener('users-updated', handleUsersChange);
    window.addEventListener('current-user-changed', handleUsersChange);
    return () => {
      window.removeEventListener('users-updated', handleUsersChange);
      window.removeEventListener('current-user-changed', handleUsersChange);
    };
  }, []);

  // Filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent'>('all');

  // Modal de visualização / download de QR
  const [selectedParticipantForQr, setSelectedParticipantForQr] = useState<Participant | null>(null);

  // Modal de alteração / edição de participante individual
  const [participantToEdit, setParticipantToEdit] = useState<Participant | null>(null);

  // Confirmação de exclusão individual
  const [participantToDelete, setParticipantToDelete] = useState<Participant | null>(null);

  // Seleção múltipla para exclusão em lote
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Notificação temporária de ação
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // Sub-Aba do Painel Admin (Participantes vs Leitor QR vs Gestão de Eventos)
  const [adminSubTab, setAdminSubTab] = useState<'participants' | 'scanner' | 'events'>('participants');

  // Lista de eventos e filtro de evento
  const [eventsList, setEventsList] = useState<EventItem[]>(() => getStoredEvents());
  const [eventFilter, setEventFilter] = useState<string>('all');

  useEffect(() => {
    const handleEventsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<EventItem[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setEventsList(customEvent.detail);
      } else {
        setEventsList(getStoredEvents());
      }
    };

    window.addEventListener('events-updated', handleEventsUpdated);
    return () => window.removeEventListener('events-updated', handleEventsUpdated);
  }, []);

  // Escuta novos cadastros recebidos em tempo real de celulares em outras redes (4G/5G/Wi-Fi)
  useEffect(() => {
    const handleParticipantReceived = (e: Event) => {
      const customEvent = e as CustomEvent<Participant>;
      if (customEvent.detail) {
        const p = customEvent.detail;
        showToast(`Novo participante recebido: ${p.fullName} (${p.company})`, 'success');
        onUpdateParticipants();
      }
    };

    window.addEventListener('participant-received', handleParticipantReceived);
    return () => window.removeEventListener('participant-received', handleParticipantReceived);
  }, [onUpdateParticipants]);

  // Escuta alterações de participantes sincronizadas pelo servidor ou outros dispositivos
  useEffect(() => {
    const handleParticipantUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<Participant>;
      if (customEvent.detail) {
        onUpdateParticipants();
      }
    };

    window.addEventListener('participant-updated', handleParticipantUpdated);
    return () => window.removeEventListener('participant-updated', handleParticipantUpdated);
  }, [onUpdateParticipants]);

  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncWithServer();
      onUpdateParticipants();
      showToast('Sincronização com o servidor central concluída com sucesso.', 'success');
    } catch {
      showToast('Falha na sincronização com o servidor.', 'info');
    } finally {
      setIsSyncing(false);
    }
  };

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const isValid = verifyAdminCredentials(usernameInput, passwordInput);
    if (isValid) {
      setIsAuthenticated(true);
      setAuthError(null);
      setPasswordInput('');
      const loggedUser = getCurrentUser();
      setCurrentUser(loggedUser);
      showToast(
        `Bem-vindo(a), ${loggedUser?.displayName || loggedUser?.username || 'Administrador'}!`,
        'success'
      );
    } else {
      setAuthError('Login ou senha incorretos. Por favor, verifique suas credenciais de acesso.');
    }
  };

  const handleRegisterFromLockScreen = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    const cleanUser = regUsername.trim().toLowerCase();
    const cleanPass = regPassword.trim();

    if (!cleanUser || cleanUser.length < 3) {
      setRegError('O login (nome de usuário) deve conter pelo menos 3 caracteres.');
      return;
    }

    if (!/^[a-z0-9_.-]+$/.test(cleanUser)) {
      setRegError('O login deve conter apenas letras minúsculas, números, ponto, hífen ou underline (sem espaços ou acentos).');
      return;
    }

    if (!cleanPass || cleanPass.length < 3) {
      setRegError('A senha deve conter pelo menos 3 caracteres.');
      return;
    }

    if (cleanPass !== regConfirmPassword.trim()) {
      setRegError('A confirmação da senha não coincide com a senha digitada.');
      return;
    }

    const result = registerNewUser({
      username: cleanUser,
      password: cleanPass,
      displayName: cleanUser,
      role: 'admin',
    });

    if (!result.success) {
      setRegError(result.error || 'Erro ao registrar credenciais.');
      return;
    }

    // Autentica com o novo login recém-criado
    verifyAdminCredentials(cleanUser, cleanPass);
    setIsAuthenticated(true);
    setUsernameInput(cleanUser);
    setPasswordInput('');
    setRegUsername('');
    setRegPassword('');
    setRegConfirmPassword('');
    setAuthMode('login');
    showToast(`Novo login "@${cleanUser}" registrado com sucesso! Acesso liberado.`, 'success');
    onUpdateParticipants();
  };

  // Exclusão de participante individual
  const handleConfirmDelete = () => {
    if (!participantToDelete) return;
    const deletedName = participantToDelete.fullName;
    deleteParticipant(participantToDelete.id);
    setSelectedIds(prev => prev.filter(id => id !== participantToDelete.id));
    onUpdateParticipants();
    setParticipantToDelete(null);
    showToast(`Participante "${deletedName}" excluído com sucesso.`, 'info');
  };

  // Exclusão em lote (múltiplos participantes)
  const handleConfirmBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    deleteMultipleParticipants(selectedIds);
    setSelectedIds([]);
    setShowBulkDeleteModal(false);
    onUpdateParticipants();
    showToast(`${count} ${count === 1 ? 'participante excluído' : 'participantes excluídos'} com sucesso.`, 'info');
  };

  // Alternar presença manual
  const handleToggleAttendance = (participant: Participant) => {
    const result = toggleAttendance(participant.id);
    onUpdateParticipants();
    showToast(
      result.attended
        ? `Presença de "${participant.fullName}" marcada como PRESENTE.`
        : `Presença de "${participant.fullName}" revertida para AUSENTE.`
    );
  };

  // Filtragem dos participantes
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      // Filtro de busca
      const matchesSearch =
        p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.eventName && p.eventName.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtro de status
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'present'
          ? p.attended
          : !p.attended;

      // Filtro de evento
      const matchesEvent =
        eventFilter === 'all'
          ? true
          : p.eventId === eventFilter ||
            (!p.eventId && eventsList.find((e) => e.id === eventFilter)?.active);

      return matchesSearch && matchesStatus && matchesEvent;
    });
  }, [participants, searchTerm, statusFilter, eventFilter, eventsList]);

  // Manipulação da seleção múltipla
  const isAllFilteredSelected =
    filteredParticipants.length > 0 &&
    filteredParticipants.every((p) => selectedIds.includes(p.id));
  const isSomeFilteredSelected =
    filteredParticipants.some((p) => selectedIds.includes(p.id)) && !isAllFilteredSelected;

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      const filteredIdSet = new Set(filteredParticipants.map((p) => p.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    } else {
      const newSelected = new Set([...selectedIds, ...filteredParticipants.map((p) => p.id)]);
      setSelectedIds(Array.from(newSelected));
    }
  };

  const toggleSelectParticipant = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const selectAllFiltered = () => {
    const newSelected = new Set([...selectedIds, ...filteredParticipants.map((p) => p.id)]);
    setSelectedIds(Array.from(newSelected));
  };

  const selectedParticipantsList = useMemo(() => {
    const set = new Set(selectedIds);
    return participants.filter((p) => set.has(p.id));
  }, [participants, selectedIds]);

  // Estatísticas baseadas no filtro atual
  const total = filteredParticipants.length;
  const presentCount = filteredParticipants.filter((p) => p.attended).length;
  const absentCount = total - presentCount;
  const attendanceRate = total > 0 ? ((presentCount / total) * 100).toFixed(1) : '0';

  // Determina nome de arquivo para exportação
  const getExportBaseName = () => {
    if (eventFilter !== 'all') {
      const targetEvent = eventsList.find((e) => e.id === eventFilter);
      if (targetEvent) {
        return `lista-presenca-${targetEvent.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      }
    }
    return 'lista-presenca-geral';
  };

  // Exportações
  const handleExportExcel = () => {
    const targetList = eventFilter === 'all' ? participants : filteredParticipants;
    exportToExcel(targetList, getExportBaseName());
    showToast('Planilha Excel (.xlsx) gerada e baixada com sucesso!', 'success');
  };

  const handleExportPDF = () => {
    const targetList = eventFilter === 'all' ? participants : filteredParticipants;
    exportToPDF(targetList, getExportBaseName());
    showToast('Relatório em PDF (.pdf) gerado e baixado com sucesso!', 'success');
  };

  const handleResetDemo = () => {
    if (window.confirm('Deseja recarregar a lista de demonstração inicial?')) {
      resetToDemoData();
      onUpdateParticipants();
      showToast('Dados de demonstração restaurados.', 'info');
    }
  };

  // Se não estiver autenticado, exibe a tela de login / registro do painel administrativo
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Cabeçalho do Card */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 text-center">
            <div className="h-12 w-12 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 mx-auto mb-3 shadow-inner">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Painel de Controle</h2>
            <p className="text-xs text-slate-300 mt-1">
              Acesso administrativo protegido por credenciais
            </p>

            {/* Alternador: Entrar vs Registrar */}
            <div className="mt-4 p-1 bg-slate-950/60 rounded-xl flex items-center gap-1 border border-slate-700/60">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAuthError(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Acessar Painel
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setRegError(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  authMode === 'register'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Novo Login</span>
              </button>
            </div>
          </div>

          {/* Modo 1: Acessar com Login e Senha */}
          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="p-6 space-y-4">
              <div className="text-xs text-slate-500 pb-1 border-b border-slate-100">
                <span>Insira suas credenciais cadastradas</span>
              </div>

              {authError && (
                <div
                  id="admin-auth-error"
                  className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Login / Usuário */}
              <div className="space-y-1.5">
                <label
                  htmlFor="input-admin-username"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Login / Usuário
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="input-admin-username"
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Digite seu login (ex: admin, operador, recepcao)"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {/* Senha */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="input-admin-password"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                  >
                    Senha de Acesso
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    id="input-admin-password"
                    type={showPasswordText ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-mono tracking-wider"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPasswordText ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPasswordText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                id="btn-admin-login-submit"
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm cursor-pointer mt-2"
              >
                <Lock className="h-4 w-4" />
                <span>Desbloquear Painel</span>
              </button>

              <div className="pt-2 text-center border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setRegError(null);
                  }}
                  className="text-xs text-sky-600 hover:text-sky-800 font-medium transition-colors cursor-pointer"
                >
                  Deseja cadastrar novo login com outro usuário e senha? <strong>Clique aqui</strong>
                </button>
              </div>
            </form>
          ) : (
            /* Modo 2: Registrar Novo Login e Senha */
            <form onSubmit={handleRegisterFromLockScreen} className="p-6 space-y-3.5">
              <div className="bg-sky-50/80 border border-sky-200/80 rounded-xl p-3 text-xs text-sky-950 flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Cadastre novos usuários com nomes e senhas diferentes. Todos os logins cadastrados terão acesso garantido ao sistema.
                </p>
              </div>

              {regError && (
                <div
                  id="admin-reg-error"
                  className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{regError}</span>
                </div>
              )}

              {/* Login / Usuário */}
              <div className="space-y-1">
                <label
                  htmlFor="input-reg-username"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Novo Login / Usuário <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="input-reg-username"
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="Ex: recepcao, gestor, juliana"
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-xs"
                    autoFocus
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400">Min. 3 letras/números (sem espaços ou acentos)</p>
              </div>

              {/* Senhas */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label
                    htmlFor="input-reg-password"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                  >
                    Senha <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="input-reg-password"
                      type={regShowPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Mínimo 3 dígitos"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-xs font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="input-reg-confirm-password"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                  >
                    Confirmar <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="input-reg-confirm-password"
                      type={regShowPassword ? 'text' : 'password'}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Repita a senha"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-xs font-mono"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <button
                  type="button"
                  onClick={() => setRegShowPassword(!regShowPassword)}
                  className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  {regShowPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  <span>{regShowPassword ? 'Ocultar' : 'Ver senha'}</span>
                </button>
              </div>

              <button
                id="btn-admin-register-submit"
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-xl font-semibold text-xs transition-colors shadow-sm cursor-pointer mt-1"
              >
                <UserPlus className="h-4 w-4" />
                <span>Cadastrar Novo Login e Acessar</span>
              </button>

              <div className="pt-2 text-center border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer"
                >
                  Já possui credenciais? <strong>Voltar ao login</strong>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Painel Administrativo Autenticado
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce">
          <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium border border-slate-700 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Barra de Topo do Admin */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Acesso Liberado</span>
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">
            Painel de Controle de Participantes
          </h2>
          <p className="text-xs text-slate-500">
            Gerencie inscrições, presenças em tempo real e exporte relatórios oficiais.
          </p>
        </div>

        {/* Botões de Ação Global (Sincronizar, Usuários/Logins, Compartilhar, Logomarca, Excel, PDF, Sair) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-admin-sync-now"
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 py-2 px-3 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Atualizar lista com o servidor central imediatamente para buscar novos cadastros de outras redes"
          >
            <RefreshCw className={`h-4 w-4 text-sky-600 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>

          <button
            id="btn-admin-manage-credentials"
            type="button"
            onClick={() => setIsCredentialsModalOpen(true)}
            className="flex items-center gap-1.5 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Cadastrar e gerenciar múltiplos logins com diferentes usuários e senhas"
          >
            <Users className="h-4 w-4 text-indigo-600" />
            <span>Usuários & Logins ({usersCount})</span>
          </button>

          {onOpenMobileShare && (
            <button
              id="btn-admin-mobile-share"
              type="button"
              onClick={onOpenMobileShare}
              className="flex items-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Exibir QR Code e link para compartilhamento da página de inscrição"
            >
              <Share2 className="h-4 w-4 text-slate-600" />
              <span>Compartilhar Link</span>
            </button>
          )}

          {onOpenCompanySettings && (
            <button
              id="btn-admin-customize-company"
              type="button"
              onClick={onOpenCompanySettings}
              className="flex items-center gap-1.5 py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Personalizar layout, nome do evento e logomarca da empresa"
            >
              <Palette className="h-4 w-4 text-amber-600" />
              <span>Layout & Logomarca</span>
            </button>
          )}

          <button
            id="btn-admin-logout"
            type="button"
            onClick={() => {
              setIsAuthenticated(false);
              showToast('Sessão encerrada com sucesso.', 'info');
            }}
            className="flex items-center gap-1.5 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Sair do painel para alternar de usuário ou bloquear a tela"
          >
            <LogOut className="h-4 w-4 text-rose-600" />
            <span>Sair</span>
          </button>

          <button
            id="btn-export-excel"
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Exportar lista de presença para Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Exportar Excel</span>
          </button>

          <button
            id="btn-export-pdf"
            type="button"
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 py-2 px-3 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            title="Exportar lista oficial de presença em formato PDF (.pdf)"
          >
            <FileText className="h-4 w-4" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* Seletor de Sub-Abas do Painel Administrativo: Participantes vs Leitor QR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            id="btn-admin-subtab-participants"
            type="button"
            onClick={() => setAdminSubTab('participants')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              adminSubTab === 'participants'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Lista de Participantes</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                adminSubTab === 'participants' ? 'bg-sky-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {total}
            </span>
          </button>

          <button
            id="btn-admin-subtab-scanner"
            type="button"
            onClick={() => setAdminSubTab('scanner')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              adminSubTab === 'scanner'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Camera className="h-4 w-4" />
            <span>Leitor de Presença QR</span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </button>

          <button
            id="btn-admin-subtab-events"
            type="button"
            onClick={() => setAdminSubTab('events')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              adminSubTab === 'events'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Gestão de Eventos</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                adminSubTab === 'events' ? 'bg-sky-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {eventsList.length}
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-500 hidden md:block">
          {adminSubTab === 'scanner'
            ? 'Câmera e validação ativa de credenciais'
            : adminSubTab === 'events'
            ? 'Criação, ativação e relatórios por evento'
            : 'Filtros, busca e relatórios de presença'}
        </div>
      </div>

      {/* Sub-Aba: Leitor de Presença QR (Exclusivo Admin) */}
      {adminSubTab === 'scanner' && (
        <div className="pt-1">
          <QrScanner
            isActive={adminSubTab === 'scanner'}
            onAttendanceMarked={(p) => {
              onUpdateParticipants();
              showToast(`Presença confirmada: ${p.fullName} (${p.registrationNumber})`, 'success');
            }}
            onNavigateToAdmin={() => setAdminSubTab('participants')}
          />
        </div>
      )}

      {/* Sub-Aba: Lista de Participantes e Relatórios */}
      {adminSubTab === 'participants' && (
        <>
      {/* Cards de Métricas / KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Inscritos</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{total}</span>
            <span className="text-xs text-slate-500">participantes</span>
          </div>
        </div>

        {/* Presentes */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold uppercase tracking-wider">
            <span>Presentes</span>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">{presentCount}</span>
            <span className="text-xs text-emerald-700 font-medium">confirmados</span>
          </div>
        </div>

        {/* Ausentes */}
        <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-xs">
          <div className="flex items-center justify-between text-amber-800 text-xs font-semibold uppercase tracking-wider">
            <span>Ausentes</span>
            <XCircle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700">{absentCount}</span>
            <span className="text-xs text-amber-700 font-medium">pendentes</span>
          </div>
        </div>

        {/* Taxa de Presença */}
        <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-xs">
          <div className="flex items-center justify-between text-sky-800 text-xs font-semibold uppercase tracking-wider">
            <span>Taxa de Presença</span>
            <span className="h-2 w-2 rounded-full bg-sky-500"></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-sky-700">{attendanceRate}%</span>
            <span className="text-xs text-sky-600">adesão</span>
          </div>
        </div>
      </div>

      {/* Filtros e Barra de Pesquisa */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Campo de Pesquisa */}
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="input-search-participants"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, matrícula ou empresa..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          />
        </div>

        {/* Abas de Filtro de Status */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-stretch sm:self-auto justify-center">
          <button
            id="filter-all"
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({total})
          </button>
          <button
            id="filter-present"
            type="button"
            onClick={() => setStatusFilter('present')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === 'present'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Presentes ({presentCount})
          </button>
          <button
            id="filter-absent"
            type="button"
            onClick={() => setStatusFilter('absent')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === 'absent'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ausentes ({absentCount})
          </button>
        </div>

        {/* Filtro por Evento */}
        <div className="flex items-center gap-1.5 bg-slate-100 py-1.5 px-3 rounded-xl self-stretch sm:self-auto border border-slate-200">
          <Calendar className="h-3.5 w-3.5 text-sky-600 shrink-0" />
          <label htmlFor="select-admin-event-filter" className="sr-only">Filtrar por evento</label>
          <select
            id="select-admin-event-filter"
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer max-w-[160px] truncate"
            title="Filtrar lista de participantes por evento"
          >
            <option value="all">Todos os Eventos</option>
            {eventsList.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.name} {evt.active ? '(Ativo)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Botão para Novo Cadastro Rápido e Tecla de Seleção Múltipla */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
          <button
            id="btn-admin-select-multiple"
            type="button"
            onClick={toggleSelectAllFiltered}
            className={`w-full sm:w-auto flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-colors border ${
              selectedIds.length > 0
                ? 'bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="Selecionar vários participantes para excluir"
          >
            <CheckSquare className="h-3.5 w-3.5 text-sky-600" />
            <span>
              {selectedIds.length > 0
                ? `${selectedIds.length} Selecionados`
                : 'Selecionar Vários'}
            </span>
          </button>

          <button
            id="btn-admin-add-participant"
            type="button"
            onClick={onNavigateToRegister}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Novo Cadastro</span>
          </button>

          <button
            id="btn-admin-reset-demo"
            type="button"
            onClick={handleResetDemo}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            title="Restaurar dados de exemplo"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Barra de Ação para Excluir Vários Selecionados */}
      {selectedIds.length > 0 && (
        <div
          id="bulk-selection-bar"
          className="bg-sky-50 border border-sky-200 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center h-7 w-7 rounded-full bg-sky-600 text-white font-bold text-xs shadow-xs">
              {selectedIds.length}
            </span>
            <div>
              <p className="text-xs text-sky-950 font-semibold">
                {selectedIds.length === 1
                  ? '1 participante selecionado'
                  : `${selectedIds.length} participantes selecionados`}
              </p>
              <p className="text-[11px] text-sky-700">
                Pronto para exclusão em massa no painel de controle
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              id="btn-deselect-all-items"
              type="button"
              onClick={clearSelection}
              className="py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-medium transition-colors"
            >
              Desmarcar todos
            </button>

            <button
              id="btn-delete-selected-participants"
              type="button"
              onClick={() => setShowBulkDeleteModal(true)}
              className="flex items-center gap-1.5 py-1.5 px-3.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Excluir Selecionados ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Tabela de Participantes */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white border-b border-slate-800 uppercase tracking-wider font-semibold text-[11px]">
                {/* Coluna Checkbox Seleção Múltipla */}
                <th className="py-3 px-3 w-12 text-center">
                  <label className="inline-flex items-center justify-center cursor-pointer" title="Selecionar ou desmarcar todos os participantes visíveis">
                    <input
                      id="checkbox-select-all-header"
                      type="checkbox"
                      checked={isAllFilteredSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeFilteredSelected;
                      }}
                      onChange={toggleSelectAllFiltered}
                      className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-sky-500 focus:ring-sky-400 focus:ring-offset-slate-900 cursor-pointer"
                      aria-label="Selecionar todos os participantes filtrados"
                    />
                  </label>
                </th>
                <th className="py-3 px-4">Participante</th>
                <th className="py-3 px-4">Matrícula</th>
                <th className="py-3 px-4">Empresa</th>
                <th className="py-3 px-4">Evento</th>
                <th className="py-3 px-4 text-center">Presença</th>
                <th className="py-3 px-4">Horário de Presença</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Nenhum participante encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((p) => {
                  const isSelected = selectedIds.includes(p.id);
                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-sky-50/80 hover:bg-sky-100/70 border-l-4 border-l-sky-500'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Checkbox de Seleção Individual */}
                      <td className="py-3 px-3 text-center">
                        <label className="inline-flex items-center justify-center cursor-pointer">
                          <input
                            id={`checkbox-select-${p.id}`}
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectParticipant(p.id)}
                            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                            aria-label={`Selecionar participante ${p.fullName}`}
                          />
                        </label>
                      </td>

                      {/* Nome Completo */}
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div>{p.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          Cadastrado em {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </td>

                      {/* Matrícula */}
                      <td className="py-3 px-4 font-mono font-medium text-sky-800">
                        <span className="bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/60">
                          {p.registrationNumber}
                        </span>
                      </td>

                      {/* Empresa */}
                      <td className="py-3 px-4 text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[180px]">{p.company}</span>
                        </div>
                      </td>

                      {/* Evento */}
                      <td className="py-3 px-4 text-slate-700">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                          <Calendar className="h-3 w-3 text-sky-600 shrink-0" />
                          <span className="truncate max-w-[140px]" title={p.eventName || 'Evento Geral'}>
                            {p.eventName || 'Evento Geral'}
                          </span>
                        </span>
                      </td>

                      {/* Status de Presença */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleAttendance(p)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                            p.attended
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          }`}
                          title="Clique para alternar status de presença"
                        >
                          {p.attended ? (
                            <>
                              <CheckCircle className="h-3 w-3" />
                              <span>Presente</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" />
                              <span>Ausente</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Horário de Confirmação */}
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        {p.attendedAt ? (
                          <span className="text-emerald-700 font-medium">
                            {new Date(p.attendedAt).toLocaleString('pt-BR')}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Não confirmado</span>
                        )}
                      </td>

                      {/* Botões de Ação */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Tecla de Edição Individual do Participante */}
                          <button
                            id={`btn-edit-${p.id}`}
                            type="button"
                            onClick={() => setParticipantToEdit(p)}
                            className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-900 border border-amber-200/70 transition-colors cursor-pointer"
                            title={`Editar dados de ${p.fullName} (Nome, Matrícula, Empresa, Evento)`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          {/* Botão Ver / Baixar QR Code */}
                          <button
                            id={`btn-view-qr-${p.id}`}
                            type="button"
                            onClick={() => setSelectedParticipantForQr(p)}
                            className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-900 border border-sky-200/60 transition-colors cursor-pointer"
                            title="Ver e Baixar Código QR / Crachá"
                          >
                            <QrCode className="h-4 w-4" />
                          </button>

                          {/* Tecla para excluir participante cadastrado */}
                          <button
                            id={`btn-delete-${p.id}`}
                            type="button"
                            onClick={() => setParticipantToDelete(p)}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-800 border border-rose-200/60 transition-colors cursor-pointer"
                            title="Excluir participante cadastrado"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé da tabela */}
        {selectedIds.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-center justify-between text-xs text-slate-500 gap-2">
            <div className="flex items-center gap-2">
              <span className="bg-sky-100 text-sky-800 px-2.5 py-1 rounded-full font-medium">
                {selectedIds.length} selecionado(s) para exclusão
              </span>
            </div>
          </div>
        )}
      </div>
        </>
      )}

      {/* Sub-Aba: Gestão de Eventos */}
      {adminSubTab === 'events' && (
        <EventManager
          participants={participants}
          onUpdateParticipants={onUpdateParticipants}
          onShowToast={showToast}
          companySettings={companySettings}
        />
      )}

      {/* Modal de Exibição / Download do QR Code Individual */}
      {selectedParticipantForQr && (
        <QrBadgeModal
          participant={selectedParticipantForQr}
          onClose={() => setSelectedParticipantForQr(null)}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      {participantToDelete && (
        <div
          id="delete-confirm-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 text-center animate-in fade-in zoom-in duration-150">
            <div className="h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-6 w-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              Excluir Participante?
            </h3>
            <p className="text-xs text-slate-600 mt-2">
              Deseja realmente remover{' '}
              <strong className="text-slate-900">
                {participantToDelete.fullName}
              </strong>{' '}
              (Matrícula: {participantToDelete.registrationNumber}) da lista de participantes?
            </p>
            <p className="text-[11px] text-rose-600 mt-1 font-medium">
              Esta ação não pode ser desfeita.
            </p>

            <div className="mt-6 flex items-center gap-2">
              <button
                id="btn-cancel-delete"
                type="button"
                onClick={() => setParticipantToDelete(null)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-delete"
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão Múltipla */}
      {showBulkDeleteModal && (
        <div
          id="bulk-delete-confirm-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 text-left animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Excluir {selectedIds.length} {selectedIds.length === 1 ? 'Participante' : 'Participantes'}?
                </h3>
                <p className="text-xs text-slate-500">
                  Você está prestes a excluir os participantes selecionados permanentemente.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto mb-3 divide-y divide-slate-100">
              {selectedParticipantsList.map((p) => (
                <div key={p.id} className="py-2 flex items-center justify-between text-xs gap-2">
                  <div className="truncate">
                    <p className="font-semibold text-slate-900 truncate">{p.fullName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{p.company}</p>
                  </div>
                  <span className="font-mono text-sky-800 text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                    {p.registrationNumber}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs text-rose-600 font-medium mb-5 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Esta ação removerá todos os {selectedIds.length} registros e não pode ser desfeita.</span>
            </p>

            <div className="flex items-center gap-2">
              <button
                id="btn-cancel-bulk-delete"
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-bulk-delete"
                type="button"
                onClick={handleConfirmBulkDelete}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm cursor-pointer"
              >
                Sim, Excluir ({selectedIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dedicado para Registrar / Alterar Login e Senha */}
      <AdminCredentialsModal
        isOpen={isCredentialsModalOpen}
        onClose={() => setIsCredentialsModalOpen(false)}
        currentSettings={companySettings || {
          companyName: '',
          eventName: '',
          logoUrl: null,
          adminUsername: 'admin',
          adminPassword: '1234'
        }}
        onSuccess={() => {
          onUpdateParticipants();
          showToast('Credenciais de administrador salvas com sucesso!', 'success');
        }}
      />

      {/* Modal Dedicado para Edição e Alteração Individual do Participante */}
      <EditParticipantModal
        isOpen={Boolean(participantToEdit)}
        participant={participantToEdit}
        events={eventsList}
        onClose={() => setParticipantToEdit(null)}
        onSuccess={(updated) => {
          onUpdateParticipants();
          showToast(`Participante "${updated.fullName}" alterado e sincronizado com sucesso!`, 'success');
        }}
      />
    </div>
  );
};

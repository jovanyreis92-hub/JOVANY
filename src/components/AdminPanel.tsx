import React, { useState, useMemo } from 'react';
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
  LogOut, 
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
  UserCheck
} from 'lucide-react';
import { Participant, CompanySettings } from '../types';
import { 
  deleteParticipant, 
  deleteMultipleParticipants, 
  toggleAttendance, 
  resetToDemoData,
  verifyAdminCredentials,
  registerAdminCredentials,
  verifyAdminPassword 
} from '../utils/storage';
import { exportToExcel, exportToPDF } from '../utils/export';
import { QrBadgeModal } from './QrBadgeModal';
import { AdminCredentialsModal } from './AdminCredentialsModal';

interface AdminPanelProps {
  participants: Participant[];
  isAuthenticated: boolean;
  setIsAuthenticated: (auth: boolean) => void;
  onNavigateToRegister: () => void;
  onUpdateParticipants: () => void;
  companySettings?: CompanySettings;
  onOpenCompanySettings?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  participants,
  isAuthenticated,
  setIsAuthenticated,
  onNavigateToRegister,
  onUpdateParticipants,
  companySettings,
  onOpenCompanySettings,
}) => {
  // Estado de autenticação do painel (Login vs Registro)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [usernameInput, setUsernameInput] = useState(companySettings?.adminUsername || 'admin');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Campos para Registro Direto de Login e Senha
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Modal para registrar/alterar credenciais quando logado
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);

  // Filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent'>('all');

  // Modal de visualização / download de QR
  const [selectedParticipantForQr, setSelectedParticipantForQr] = useState<Participant | null>(null);

  // Confirmação de exclusão individual
  const [participantToDelete, setParticipantToDelete] = useState<Participant | null>(null);

  // Seleção múltipla para exclusão em lote
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Notificação temporária de ação
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

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
    } else {
      setAuthError('Login ou senha incorretos. Por favor, verifique suas credenciais de administrador.');
    }
  };

  const handleRegisterFromLockScreen = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    const cleanUser = regUsername.trim();
    const cleanPass = regPassword.trim();

    if (!cleanUser || cleanUser.length < 3) {
      setRegError('O login (nome de usuário) deve conter pelo menos 3 caracteres.');
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

    const result = registerAdminCredentials(cleanUser, cleanPass);
    if (!result.success) {
      setRegError(result.error || 'Erro ao registrar credenciais.');
      return;
    }

    setIsAuthenticated(true);
    setUsernameInput(cleanUser);
    setPasswordInput('');
    setRegUsername('');
    setRegPassword('');
    setRegConfirmPassword('');
    setAuthMode('login');
    showToast(`Login "${cleanUser}" e senha registrados com sucesso!`, 'success');
    onUpdateParticipants();
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPasswordInput('');
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
        p.company.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro de status
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'present'
          ? p.attended
          : !p.attended;

      return matchesSearch && matchesStatus;
    });
  }, [participants, searchTerm, statusFilter]);

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

  // Estatísticas
  const total = participants.length;
  const presentCount = participants.filter((p) => p.attended).length;
  const absentCount = total - presentCount;
  const attendanceRate = total > 0 ? ((presentCount / total) * 100).toFixed(1) : '0';

  // Exportações
  const handleExportExcel = () => {
    exportToExcel(participants, 'lista-presenca-evento');
    showToast('Planilha Excel (.xlsx) gerada e baixada!', 'success');
  };

  const handleExportPDF = () => {
    exportToPDF(participants, 'lista-presenca-evento');
    showToast('Relatório em PDF (.pdf) gerado e baixado!', 'success');
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
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  authMode === 'register'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Registrar Acesso
              </button>
            </div>
          </div>

          {/* Modo 1: Acessar com Login e Senha */}
          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="p-6 space-y-4">
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
                    placeholder="Digite seu login"
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
                  Deseja registrar novo login e senha? <strong>Clique aqui</strong>
                </button>
              </div>
            </form>
          ) : (
            /* Modo 2: Registrar Novo Login e Senha */
            <form onSubmit={handleRegisterFromLockScreen} className="p-6 space-y-4">
              {regError && (
                <div
                  id="admin-reg-error"
                  className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{regError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="input-reg-username"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Novo Login / Usuário
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="input-reg-username"
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="Ex: admin, gestor, coordenador"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm"
                    autoFocus
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400">Mínimo de 3 caracteres.</p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="input-reg-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Nova Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="input-reg-password"
                    type={regShowPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mínimo 3 caracteres"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-mono tracking-wider"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setRegShowPassword(!regShowPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {regShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="input-reg-confirm-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Confirmar Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <input
                    id="input-reg-confirm-password"
                    type={regShowPassword ? 'text' : 'password'}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Repita a senha para confirmar"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-mono tracking-wider"
                    required
                  />
                </div>
              </div>

              <button
                id="btn-admin-register-submit"
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm cursor-pointer mt-2"
              >
                <UserCheck className="h-4 w-4" />
                <span>Salvar e Acessar Painel</span>
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
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
              <UserCheck className="h-3.5 w-3.5 text-sky-600" />
              <span>Login: <strong>{companySettings?.adminUsername || 'admin'}</strong></span>
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">
            Painel de Controle de Participantes
          </h2>
          <p className="text-xs text-slate-500">
            Gerencie inscrições, presenças em tempo real e exporte relatórios oficiais.
          </p>
        </div>

        {/* Botões de Ação Global (Exportar PDF, Excel, Credenciais, Desconectar, Logomarca) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-admin-manage-credentials"
            type="button"
            onClick={() => setIsCredentialsModalOpen(true)}
            className="flex items-center gap-1.5 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Registrar ou alterar login e senha do painel de controle"
          >
            <KeyRound className="h-4 w-4 text-indigo-600" />
            <span>Login e Senha</span>
          </button>

          {onOpenCompanySettings && (
            <button
              id="btn-admin-customize-company"
              type="button"
              onClick={onOpenCompanySettings}
              className="flex items-center gap-1.5 py-2 px-3 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Personalizar logomarca e dados da empresa"
            >
              <ImageIcon className="h-4 w-4 text-sky-600" />
              <span>Logomarca da Empresa</span>
            </button>
          )}

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

          <button
            id="btn-admin-logout"
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="Bloquear painel"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </button>
        </div>
      </div>

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
                <th className="py-3 px-4 text-center">Presença</th>
                <th className="py-3 px-4">Horário de Presença</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
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
                          {/* Botão Ver / Baixar QR Code */}
                          <button
                            id={`btn-view-qr-${p.id}`}
                            type="button"
                            onClick={() => setSelectedParticipantForQr(p)}
                            className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-900 border border-sky-200/60 transition-colors"
                            title="Ver e Baixar Código QR / Crachá"
                          >
                            <QrCode className="h-4 w-4" />
                          </button>

                          {/* Tecla para excluir participante cadastrado */}
                          <button
                            id={`btn-delete-${p.id}`}
                            type="button"
                            onClick={() => setParticipantToDelete(p)}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-800 border border-rose-200/60 transition-colors"
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

        {/* Rodapé da tabela com totais visíveis */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span>
              Exibindo {filteredParticipants.length} de {total} participantes cadastrados
            </span>
            {selectedIds.length > 0 && (
              <span className="bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-medium">
                {selectedIds.length} selecionado(s) para exclusão
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> {presentCount} presentes
            </span>
            <span className="flex items-center gap-1 text-amber-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> {absentCount} ausentes
            </span>
          </div>
        </div>
      </div>

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
    </div>
  );
};

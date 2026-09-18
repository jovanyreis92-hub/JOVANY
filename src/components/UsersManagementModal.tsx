import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  UserPlus,
  KeyRound,
  ShieldAlert,
  Trash2,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  User,
  Search,
  Lock,
  Clock,
  Sparkles
} from 'lucide-react';
import { UserAccount, CompanySettings } from '../types';
import {
  getStoredUsers,
  registerNewUser,
  updateUserPassword,
  deleteUserAccount,
  getCurrentUser
} from '../utils/storage';

interface UsersManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  companySettings: CompanySettings;
  onSuccess?: () => void;
}

export const UsersManagementModal: React.FC<UsersManagementModalProps> = ({
  isOpen,
  onClose,
  companySettings,
  onSuccess,
}) => {
  const [users, setUsers] = useState<UserAccount[]>(() => getStoredUsers());
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => getCurrentUser());
  const [searchTerm, setSearchTerm] = useState('');

  // Formulário de Cadastro de Novo Usuário
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newConfirmPassword, setNewConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Alteração de Senha de Usuário Existente
  const [editingPasswordUserId, setEditingPasswordUserId] = useState<string | null>(null);
  const [editPasswordValue, setEditPasswordValue] = useState('');
  const [editPasswordConfirm, setEditPasswordConfirm] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editPasswordError, setEditPasswordError] = useState<string | null>(null);
  const [editPasswordSuccess, setEditPasswordSuccess] = useState<string | null>(null);

  // Confirmação de exclusão
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadUsers = () => {
    setUsers(getStoredUsers());
    setCurrentUser(getCurrentUser());
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setCreateError(null);
      setCreateSuccess(null);
      setEditingPasswordUserId(null);
      setUserToDelete(null);
      setDeleteError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleUsersUpdated = () => {
      loadUsers();
    };
    window.addEventListener('users-updated', handleUsersUpdated);
    window.addEventListener('current-user-changed', handleUsersUpdated);
    return () => {
      window.removeEventListener('users-updated', handleUsersUpdated);
      window.removeEventListener('current-user-changed', handleUsersUpdated);
    };
  }, []);

  if (!isOpen) return null;

  // Filtragem de usuários
  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return u.username.toLowerCase().includes(term);
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    const cleanUser = newUsername.trim().toLowerCase();
    const cleanPass = newPassword.trim();

    if (!cleanUser || cleanUser.length < 3) {
      setCreateError('O login (nome de usuário) deve conter pelo menos 3 caracteres.');
      return;
    }

    if (!/^[a-z0-9_.-]+$/.test(cleanUser)) {
      setCreateError('O login deve conter apenas letras minúsculas, números, ponto, hífen ou underline (sem espaços ou acentos).');
      return;
    }

    if (!cleanPass || cleanPass.length < 3) {
      setCreateError('A senha deve conter pelo menos 3 caracteres.');
      return;
    }

    if (cleanPass !== newConfirmPassword.trim()) {
      setCreateError('A confirmação da senha não coincide com a senha digitada.');
      return;
    }

    const result = registerNewUser({
      username: cleanUser,
      password: cleanPass,
      displayName: cleanUser,
      role: 'admin',
    });

    if (!result.success) {
      setCreateError(result.error || 'Erro ao cadastrar novo usuário.');
      return;
    }

    setCreateSuccess(`Usuário "${cleanUser}" cadastrado com sucesso com acesso ao sistema!`);
    setNewUsername('');
    setNewPassword('');
    setNewConfirmPassword('');
    loadUsers();

    if (onSuccess) onSuccess();

    setTimeout(() => {
      setActiveTab('list');
      setCreateSuccess(null);
    }, 1500);
  };

  const handleSaveEditedPassword = (userId: string) => {
    setEditPasswordError(null);
    setEditPasswordSuccess(null);

    const cleanPass = editPasswordValue.trim();
    if (!cleanPass || cleanPass.length < 3) {
      setEditPasswordError('A nova senha deve conter pelo menos 3 caracteres.');
      return;
    }

    if (cleanPass !== editPasswordConfirm.trim()) {
      setEditPasswordError('A confirmação de senha não coincide.');
      return;
    }

    const res = updateUserPassword(userId, cleanPass);
    if (!res.success) {
      setEditPasswordError(res.error || 'Erro ao alterar senha.');
      return;
    }

    setEditPasswordSuccess('Senha alterada com sucesso!');
    loadUsers();

    if (onSuccess) onSuccess();

    setTimeout(() => {
      setEditingPasswordUserId(null);
      setEditPasswordValue('');
      setEditPasswordConfirm('');
      setEditPasswordSuccess(null);
    }, 1200);
  };

  const handleConfirmDelete = () => {
    if (!userToDelete) return;
    setDeleteError(null);

    const res = deleteUserAccount(userToDelete.id, currentUser?.id);
    if (!res.success) {
      setDeleteError(res.error || 'Erro ao excluir usuário.');
      return;
    }

    loadUsers();
    setUserToDelete(null);
    if (onSuccess) onSuccess();
  };

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return 'Nunca';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div
      id="users-management-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-6 animate-in fade-in zoom-in duration-150 flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Gestão de Usuários & Logins
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {users.length} {users.length === 1 ? 'login' : 'logins'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Cadastre logins com usuários e senhas diferentes para acesso ao sistema
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar janela"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Abas Superiores */}
        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('list');
              setCreateError(null);
              setCreateSuccess(null);
            }}
            className={`flex-1 py-3 px-4 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'list'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Logins Cadastrados ({users.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('create');
              setEditingPasswordUserId(null);
            }}
            className={`flex-1 py-3 px-4 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'create'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            <span>Cadastrar Novo Login</span>
          </button>
        </div>

        {/* Conteúdo Principal com Scroll */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: LISTA DE USUÁRIOS */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              {/* Barra de Busca e Ação Rápida */}
              <div className="flex flex-col sm:flex-row gap-2 justify-between sm:items-center">
                <div className="relative flex-1">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por login ou nome..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Novo Login</span>
                </button>
              </div>

              {/* Lista de Usuários em Cards */}
              <div className="space-y-2.5">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                    <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-600 font-medium">
                      Nenhum login encontrado com o termo informado.
                    </p>
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isCurrentSessionUser =
                      currentUser &&
                      (currentUser.id === u.id || currentUser.username.toLowerCase() === u.username.toLowerCase());
                    const isEditingThisPassword = editingPasswordUserId === u.id;

                    return (
                      <div
                        key={u.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isCurrentSessionUser
                            ? 'bg-indigo-50/40 border-indigo-200 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Dados do Usuário */}
                          <div className="flex items-start gap-3">
                            <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {u.username.substring(0, 2)}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-slate-900">
                                  @{u.username}
                                </span>
                                {isCurrentSessionUser && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                                    <UserCheck className="h-2.5 w-2.5" />
                                    <span>Conectado agora</span>
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 mt-1">
                                <span>Cadastrado em: {formatDate(u.createdAt)}</span>
                                {u.lastLoginAt && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>Último acesso: {formatDate(u.lastLoginAt)}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Ações */}
                          <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (isEditingThisPassword) {
                                  setEditingPasswordUserId(null);
                                } else {
                                  setEditingPasswordUserId(u.id);
                                  setEditPasswordValue('');
                                  setEditPasswordConfirm('');
                                  setEditPasswordError(null);
                                  setEditPasswordSuccess(null);
                                }
                              }}
                              className="flex items-center gap-1 py-1 px-2.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                              title="Alterar a senha deste login"
                            >
                              <KeyRound className="h-3.5 w-3.5 text-slate-500" />
                              <span>{isEditingThisPassword ? 'Cancelar' : 'Alterar Senha'}</span>
                            </button>

                            {/* Botão de Excluir */}
                            <button
                              type="button"
                              onClick={() => {
                                setUserToDelete(u);
                                setDeleteError(null);
                              }}
                              disabled={Boolean(isCurrentSessionUser || users.length <= 1)}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                isCurrentSessionUser || users.length <= 1
                                  ? 'opacity-30 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                                  : 'text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 border-rose-200'
                              }`}
                              title={
                                isCurrentSessionUser
                                  ? 'Você não pode excluir o usuário que está conectado no momento.'
                                  : users.length <= 1
                                  ? 'Não é permitido excluir o único login do sistema.'
                                  : 'Excluir login deste usuário'
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Formulário Inline de Alteração de Senha */}
                        {isEditingThisPassword && (
                          <div className="mt-3 pt-3 border-t border-slate-200/80 bg-slate-50/80 -mx-3.5 -mb-3.5 p-3.5 rounded-b-xl space-y-3 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                                <Lock className="h-3.5 w-3.5 text-indigo-600" />
                                <span>Nova senha para <strong>@{u.username}</strong>:</span>
                              </span>
                            </div>

                            {editPasswordError && (
                              <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-1.5">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                <span>{editPasswordError}</span>
                              </div>
                            )}

                            {editPasswordSuccess && (
                              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-1.5">
                                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                <span>{editPasswordSuccess}</span>
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="relative">
                                <input
                                  type={showEditPassword ? 'text' : 'password'}
                                  value={editPasswordValue}
                                  onChange={(e) => setEditPasswordValue(e.target.value)}
                                  placeholder="Nova senha (min. 3 dígitos)"
                                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                              </div>
                              <div className="relative">
                                <input
                                  type={showEditPassword ? 'text' : 'password'}
                                  value={editPasswordConfirm}
                                  onChange={(e) => setEditPasswordConfirm(e.target.value)}
                                  placeholder="Confirmar nova senha"
                                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <button
                                type="button"
                                onClick={() => setShowEditPassword(!showEditPassword)}
                                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                              >
                                {showEditPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                <span>{showEditPassword ? 'Ocultar' : 'Visualizar senha'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSaveEditedPassword(u.id)}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Check className="h-3 w-3" />
                                <span>Salvar Senha</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CADASTRAR NOVO LOGIN */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-xl p-3 text-xs text-indigo-900 flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Múltiplos Logins com Acesso Completo</p>
                  <p className="text-indigo-800/80 text-[11px]">
                    Cadastre novos usuários com nomes e senhas distintas. Todos os logins cadastrados aqui poderão entrar na tela de acesso e operar o sistema de credenciamento.
                  </p>
                </div>
              </div>

              {createError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{createError}</span>
                </div>
              )}

              {createSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{createSuccess}</span>
                </div>
              )}

              {/* Nome de Usuário / Login */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Login / Usuário <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Ex: recepcao, gestor, juliana"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                    autoFocus
                  />
                </div>
                <p className="text-[10px] text-slate-400">Min. 3 letras/números (sem espaços ou acentos)</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Nova Senha */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Senha <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 3 dígitos"
                      className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Confirmar Senha */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Confirmar Senha <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newConfirmPassword}
                      onChange={(e) => setNewConfirmPassword(e.target.value)}
                      placeholder="Repita a mesma senha"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Cadastrar Novo Login</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal de Confirmação de Exclusão de Usuário */}
        {userToDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Excluir Login</h3>
                  <p className="text-xs text-slate-500">Revogar acesso do usuário ao sistema</p>
                </div>
              </div>

              {deleteError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{deleteError}</span>
                </div>
              )}

              <p className="text-xs text-slate-700">
                Tem certeza de que deseja remover o login <strong>@{userToDelete.username}</strong>? Este usuário perderá o acesso imediato ao painel.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Confirmar Exclusão</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rodapé Informativo */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 shrink-0">
          <span>
            Todos os logins registrados com usuário e senha possuem acesso garantido ao sistema.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer self-end sm:self-auto"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};

import { Participant, CompanySettings, EventItem, UserAccount, UserRole } from '../types';
import { getEventRegistrationStatus } from './eventHelper';
import { autoCorrectAndAccent, isValidFullName, normalizeNameForComparison } from './textCorrector';

const STORAGE_KEY = 'qr_event_participants_v1';
const COMPANY_KEY = 'qr_event_company_settings_v1';
const EVENTS_KEY = 'qr_events_list_v1';
const USERS_KEY = 'qr_event_users_v2';
const CURRENT_USER_KEY = 'qr_current_user_v2';

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: 'Minha Empresa',
  eventName: 'COZINHA SHOW',
  logoUrl: null,
  adminUsername: 'admin',
  adminPassword: '1234',
  fontFamily: 'inter',
  layoutScale: 'normal',
  primaryColor: '#0284c7',
  publicAppUrl: '',
  creatorName: 'Jovany Reis',
  creatorSignature: 'Desenvolvido por Jovany Reis • Sistema de Credenciamento & Inscrições',
};

export const INITIAL_EVENTS: EventItem[] = [
  {
    id: 'event_1',
    name: 'COZINHA SHOW',
    date: '2026-10-15',
    location: 'Espaço Cozinha Show',
    description: 'Evento Cozinha Show - Credenciamento e Presença de Participantes',
    registrationStartDate: '2026-09-01T08:00',
    registrationEndDate: '2026-12-31T23:59',
    active: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
  },
];

export const INITIAL_PARTICIPANTS: Participant[] = [
  {
    id: 'part_1',
    fullName: 'Carlos Eduardo Silva',
    registrationNumber: '1001',
    company: 'Tech Solutions Brasil',
    eventId: 'event_1',
    eventName: 'COZINHA SHOW',
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    attended: true,
    attendedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'part_2',
    fullName: 'Mariana Albuquerque Costa',
    registrationNumber: '1002',
    company: 'Inovação Digital Ltda',
    eventId: 'event_1',
    eventName: 'COZINHA SHOW',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    attended: false,
    attendedAt: null,
  },
  {
    id: 'part_3',
    fullName: 'Roberto Fernando Mendes',
    registrationNumber: '1003',
    company: 'PetroSoft Engenharia',
    eventId: 'event_1',
    eventName: 'COZINHA SHOW',
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    attended: true,
    attendedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: 'part_4',
    fullName: 'Juliana Beatriz Santos',
    registrationNumber: '1004',
    company: 'Global Logística',
    eventId: 'event_1',
    eventName: 'COZINHA SHOW',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    attended: false,
    attendedAt: null,
  },
  {
    id: 'part_5',
    fullName: 'Lucas Gabriel Oliveira',
    registrationNumber: '1005',
    company: 'Nexus Consultoria',
    eventId: 'event_1',
    eventName: 'COZINHA SHOW',
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    attended: false,
    attendedAt: null,
  },
];

// Estado de sincronização com o servidor central
export type SyncStatus = 'connected' | 'connecting' | 'offline';
let currentSyncStatus: SyncStatus = 'connecting';

function setSyncStatus(status: SyncStatus) {
  if (currentSyncStatus !== status) {
    currentSyncStatus = status;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sync-status-changed', { detail: { status } }));
    }
  }
}

export function getSyncStatus(): SyncStatus {
  return currentSyncStatus;
}

// Leitura síncrona do cache local
export function getCompanySettings(): CompanySettings {
  try {
    const raw = localStorage.getItem(COMPANY_KEY);
    if (!raw) {
      localStorage.setItem(COMPANY_KEY, JSON.stringify(DEFAULT_COMPANY_SETTINGS));
      return DEFAULT_COMPANY_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    const eventName =
      parsed.eventName === 'Evento Corporativo & Treinamento 2026' || !parsed.eventName
        ? 'COZINHA SHOW'
        : parsed.eventName;

    // Remove URL obsoleta de servidor legado
    if (parsed.publicAppUrl && parsed.publicAppUrl.includes('rihuh2lzyxgzrc2qmh3tyj')) {
      parsed.publicAppUrl = '';
    }

    return {
      ...DEFAULT_COMPANY_SETTINGS,
      adminUsername: parsed.adminUsername || 'admin',
      ...parsed,
      eventName,
    };
  } catch (e) {
    console.error('Erro ao obter configurações da empresa:', e);
    return DEFAULT_COMPANY_SETTINGS;
  }
}

/**
 * Retorna destinos pares de nuvem válidos para replicação cruzada se configurados pelo usuário
 */
export function getPeerCloudDestinations(): string[] {
  const settings = getCompanySettings();
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : '';
  if (
    settings.publicAppUrl &&
    settings.publicAppUrl.trim() &&
    !settings.publicAppUrl.includes('rihuh2lzyxgzrc2qmh3tyj')
  ) {
    const custom = settings.publicAppUrl.replace(/\/$/, '');
    if (custom && custom !== currentOrigin) {
      return [custom];
    }
  }
  return [];
}

export function saveCompanySettings(settings: CompanySettings): void {
  try {
    localStorage.setItem(COMPANY_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('company-settings-updated', { detail: settings }));

    // Sincroniza com o servidor central para atualizar todos os celulares
    fetch('/api/company-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    }).catch((err) => {
      console.warn('Falha temporária ao sincronizar configurações com o servidor:', err);
    });
  } catch (e) {
    console.error('Erro ao salvar configurações da empresa:', e);
  }
}

export function getStoredUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    const settings = getCompanySettings();
    const primaryUser = (settings?.adminUsername || 'admin').trim().toLowerCase();
    const primaryPass = (settings?.adminPassword || '1234').trim();

    if (!raw) {
      const initialUsers: UserAccount[] = [
        {
          id: 'user_admin_primary',
          username: primaryUser,
          displayName: 'Administrador Principal',
          password: primaryPass,
          role: 'admin',
          createdAt: new Date().toISOString(),
          lastLoginAt: null,
          active: true,
        },
      ];
      localStorage.setItem(USERS_KEY, JSON.stringify(initialUsers));
      return initialUsers;
    }

    const parsed: UserAccount[] = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Garante que o usuário admin primário exista na lista para não perder acesso legado
      const hasPrimary = parsed.some(
        (u) => (u?.username || '').toLowerCase() === primaryUser
      );
      if (!hasPrimary) {
        parsed.unshift({
          id: 'user_admin_primary',
          username: primaryUser,
          displayName: 'Administrador Principal',
          password: primaryPass,
          role: 'admin',
          createdAt: new Date().toISOString(),
          lastLoginAt: null,
          active: true,
        });
        localStorage.setItem(USERS_KEY, JSON.stringify(parsed));
      }
      return parsed;
    }

    const fallbackUsers: UserAccount[] = [
      {
        id: 'user_admin_primary',
        username: primaryUser,
        displayName: 'Administrador Principal',
        password: primaryPass,
        role: 'admin',
        createdAt: new Date().toISOString(),
        lastLoginAt: null,
        active: true,
      },
    ];
    localStorage.setItem(USERS_KEY, JSON.stringify(fallbackUsers));
    return fallbackUsers;
  } catch (e) {
    console.error('Erro ao ler usuários do localStorage:', e);
    return [
      {
        id: 'user_admin_primary',
        username: 'admin',
        displayName: 'Administrador Principal',
        password: '1234',
        role: 'admin',
        createdAt: new Date().toISOString(),
        lastLoginAt: null,
        active: true,
      },
    ];
  }
}

export function saveStoredUsers(users: UserAccount[]): void {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    window.dispatchEvent(new CustomEvent('users-updated', { detail: users }));
  } catch (e) {
    console.error('Erro ao salvar usuários no localStorage:', e);
  }
}

export function getCurrentUser(): UserAccount | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCurrentUser(user: UserAccount | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(CURRENT_USER_KEY);
    }
    window.dispatchEvent(new CustomEvent('current-user-changed', { detail: user }));
  } catch (e) {
    console.error('Erro ao salvar usuário atual na sessão:', e);
  }
}

export function registerNewUser(data: {
  username: string;
  password: string;
  displayName?: string;
  role?: UserRole;
}): { success: boolean; error?: string; user?: UserAccount } {
  const cleanUsername = (data.username || '').trim().toLowerCase();
  const cleanPass = (data.password || '').trim();
  const cleanName = data.displayName?.trim() || '';

  if (!cleanUsername || cleanUsername.length < 3) {
    return {
      success: false,
      error: 'O login (nome de usuário) deve conter pelo menos 3 caracteres.',
    };
  }

  // Verifica caracteres permitidos: letras, números, hífen, underline ou ponto
  if (!/^[a-z0-9_.-]+$/.test(cleanUsername)) {
    return {
      success: false,
      error: 'O login deve conter apenas letras minúsculas, números, ponto, hífen ou underline (sem espaços ou acentos).',
    };
  }

  if (!cleanPass || cleanPass.length < 3) {
    return {
      success: false,
      error: 'A senha deve conter pelo menos 3 caracteres.',
    };
  }

  const users = getStoredUsers();
  const alreadyExists = users.some(
    (u) => (u?.username || '').toLowerCase() === cleanUsername
  );

  if (alreadyExists) {
    return {
      success: false,
      error: `O login "${cleanUsername}" já está em uso por outro usuário. Escolha outro nome ou acesse com sua senha.`,
    };
  }

  const newUser: UserAccount = {
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    username: cleanUsername,
    displayName: cleanName || cleanUsername,
    password: cleanPass,
    role: data.role || 'admin',
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
    active: true,
  };

  const updatedUsers = [...users, newUser];
  saveStoredUsers(updatedUsers);

  return { success: true, user: newUser };
}

export function updateUserPassword(
  userIdOrUsername: string,
  newPassword: string
): { success: boolean; error?: string } {
  const cleanPass = newPassword.trim();
  if (!cleanPass || cleanPass.length < 3) {
    return { success: false, error: 'A nova senha deve ter pelo menos 3 caracteres.' };
  }

  const users = getStoredUsers();
  const targetIndex = users.findIndex(
    (u) =>
      u.id === userIdOrUsername ||
      (u?.username || '').toLowerCase() === (userIdOrUsername || '').toLowerCase()
  );

  if (targetIndex === -1) {
    return { success: false, error: 'Usuário não encontrado para atualizar senha.' };
  }

  users[targetIndex].password = cleanPass;
  saveStoredUsers(users);

  // Se for o admin das configurações da empresa, sincroniza
  const settings = getCompanySettings();
  if (
    (settings?.adminUsername || 'admin').trim().toLowerCase() ===
    (users[targetIndex]?.username || '').toLowerCase()
  ) {
    saveCompanySettings({
      ...settings,
      adminPassword: cleanPass,
    });
  }

  // Se for o usuário conectado na sessão atual, atualiza
  const current = getCurrentUser();
  if (current && current.id === users[targetIndex].id) {
    setCurrentUser({ ...current, password: cleanPass });
  }

  return { success: true };
}

export function updateUserAccount(
  userId: string,
  updates: Partial<Omit<UserAccount, 'id' | 'createdAt'>>
): { success: boolean; error?: string } {
  const users = getStoredUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) {
    return { success: false, error: 'Usuário não encontrado.' };
  }

  if (updates.username) {
    const cleanUser = updates.username.trim().toLowerCase();
    if (cleanUser.length < 3) {
      return { success: false, error: 'O login deve ter pelo menos 3 caracteres.' };
    }
    const duplicate = users.some(
      (u) => u.id !== userId && (u?.username || '').toLowerCase() === cleanUser
    );
    if (duplicate) {
      return { success: false, error: `O login "${cleanUser}" já está em uso.` };
    }
    users[index].username = cleanUser;
  }

  if (updates.displayName !== undefined) {
    users[index].displayName = updates.displayName.trim() || users[index].username;
  }

  if (updates.role) {
    users[index].role = updates.role;
  }

  if (updates.active !== undefined) {
    users[index].active = updates.active;
  }

  if (updates.password && updates.password.trim().length >= 3) {
    users[index].password = updates.password.trim();
  }

  saveStoredUsers(users);

  const current = getCurrentUser();
  if (current && current.id === userId) {
    setCurrentUser({ ...current, ...users[index] });
  }

  return { success: true };
}

export function deleteUserAccount(
  userId: string,
  currentSessionUserIdOrUsername?: string
): { success: boolean; error?: string } {
  const users = getStoredUsers();
  if (users.length <= 1) {
    return {
      success: false,
      error: 'Não é possível excluir o único login do sistema. Deve haver ao menos uma conta cadastrada.',
    };
  }

  const target = users.find(
    (u) =>
      u.id === userId ||
      (u?.username || '').toLowerCase() === (userId || '').toLowerCase()
  );

  if (!target) {
    return { success: false, error: 'Usuário não encontrado para exclusão.' };
  }

  const currentUser = getCurrentUser();
  const isCurrentSession =
    (currentUser && (currentUser.id === target.id || (currentUser.username || '').toLowerCase() === (target.username || '').toLowerCase())) ||
    (currentSessionUserIdOrUsername &&
      (currentSessionUserIdOrUsername === target.id ||
        (currentSessionUserIdOrUsername || '').toLowerCase() === (target.username || '').toLowerCase()));

  if (isCurrentSession) {
    return {
      success: false,
      error: 'Não é possível excluir a conta que está conectada nesta sessão. Alterne para outro login antes de excluí-la.',
    };
  }

  const updated = users.filter((u) => u.id !== target.id);
  saveStoredUsers(updated);
  return { success: true };
}

export function verifyAdminPassword(password: string): boolean {
  const cleanPass = password.trim();
  const users = getStoredUsers();
  // Verifica se a senha confere com qualquer usuário ativo
  const matched = users.some((u) => u.active && u.password.trim() === cleanPass);
  if (matched) return true;

  // Fallback para configurações
  const settings = getCompanySettings();
  const validPassword = (settings.adminPassword || '1234').trim();
  return cleanPass === validPassword;
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();
  const users = getStoredUsers();

  // 1. Busca usuário na lista de usuários cadastrados
  let matchedUser: UserAccount | undefined;

  if (!cleanUser) {
    // Se o campo de usuário foi deixado vazio, tenta autenticar o admin principal se a senha coincidir
    matchedUser = users.find(
      (u) => u.active && (u.username === 'admin' || u.role === 'admin') && u.password.trim() === cleanPass
    );
    if (!matchedUser) {
      // Se não encontrou admin, tenta qualquer usuário cuja senha seja idêntica se houver apenas um
      matchedUser = users.find((u) => u.active && u.password.trim() === cleanPass);
    }
  } else {
    matchedUser = users.find(
      (u) => u.active && (u?.username || '').toLowerCase() === cleanUser && (u?.password || '').trim() === cleanPass
    );
  }

  // 2. Fallback para as credenciais da empresa (caso o localStorage de usuários não tenha sido atualizado)
  if (!matchedUser) {
    const settings = getCompanySettings();
    const fallbackUser = (settings.adminUsername || 'admin').trim().toLowerCase();
    const fallbackPass = (settings.adminPassword || '1234').trim();

    if ((!cleanUser || cleanUser === fallbackUser || cleanUser === 'admin') && cleanPass === fallbackPass) {
      matchedUser = {
        id: 'user_admin_primary',
        username: fallbackUser,
        displayName: 'Administrador Principal',
        password: fallbackPass,
        role: 'admin',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        active: true,
      };
      // Registra ou atualiza esse usuário no storage para persistência futura
      const exists = users.some((u) => (u?.username || '').toLowerCase() === fallbackUser);
      if (!exists) {
        saveStoredUsers([...users, matchedUser]);
      }
    }
  }

  if (matchedUser) {
    // Atualiza data do último login
    const updatedUsers = users.map((u) => {
      if (u.id === matchedUser!.id || (u?.username || '').toLowerCase() === (matchedUser!.username || '').toLowerCase()) {
        return { ...u, lastLoginAt: new Date().toISOString() };
      }
      return u;
    });
    saveStoredUsers(updatedUsers);

    // Registra sessão e usuário autenticado
    setCurrentUser(matchedUser);
    setAdminLoggedIn(true);
    return true;
  }

  return false;
}

export function isAdminLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('qr_admin_authenticated') === 'true';
}

export function setAdminLoggedIn(loggedIn: boolean): void {
  if (typeof window === 'undefined') return;
  if (loggedIn) {
    sessionStorage.setItem('qr_admin_authenticated', 'true');
  } else {
    sessionStorage.removeItem('qr_admin_authenticated');
    setCurrentUser(null);
  }
  window.dispatchEvent(new CustomEvent('admin-auth-changed', { detail: loggedIn }));
}

export function registerAdminCredentials(username: string, password: string): { success: boolean; error?: string } {
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  if (!cleanUser || cleanUser.length < 3) {
    return { success: false, error: 'O login (usuário) deve conter pelo menos 3 caracteres.' };
  }

  if (!cleanPass || cleanPass.length < 3) {
    return { success: false, error: 'A senha deve conter pelo menos 3 caracteres.' };
  }

  const users = getStoredUsers();
  const existingIndex = users.findIndex((u) => (u?.username || '').toLowerCase() === cleanUser);

  if (existingIndex !== -1) {
    // Se o usuário já existe, atualiza a senha dele
    users[existingIndex].password = cleanPass;
    saveStoredUsers(users);
    const updatedUser = users[existingIndex];
    setCurrentUser(updatedUser);
  } else {
    // Cadastra como novo usuário com acesso
    const regResult = registerNewUser({
      username: cleanUser,
      password: cleanPass,
      displayName: cleanUser,
      role: 'admin',
    });
    if (!regResult.success) {
      return regResult;
    }
    if (regResult.user) {
      setCurrentUser(regResult.user);
    }
  }

  // Sincroniza com as configurações da empresa para compatibilidade
  const current = getCompanySettings();
  saveCompanySettings({
    ...current,
    adminUsername: cleanUser,
    adminPassword: cleanPass,
  });

  return { success: true };
}

export function updateAdminPassword(newPassword: string): boolean {
  if (!newPassword || newPassword.trim().length === 0) return false;
  const current = getCompanySettings();
  const adminUser = (current.adminUsername || 'admin').trim().toLowerCase();

  const updateResult = updateUserPassword(adminUser, newPassword.trim());
  if (!updateResult.success) {
    return false;
  }

  saveCompanySettings({
    ...current,
    adminPassword: newPassword.trim(),
  });
  return true;
}

export function getStoredEvents(): EventItem[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    if (!raw) {
      localStorage.setItem(EVENTS_KEY, JSON.stringify(INITIAL_EVENTS));
      return INITIAL_EVENTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const filtered = parsed.filter(
        (evt) =>
          evt.id !== 'event_2' &&
          evt.name !== 'Workshop de Tecnologia & Inovação' &&
          !evt.name?.toLowerCase().includes('workshop de tecnologia')
      );
      const migrated = filtered.map((evt) => {
        if (evt.id === 'event_1' && (evt.name === 'Evento Corporativo & Treinamento 2026' || evt.name === 'Evento Corporativo')) {
          return {
            ...evt,
            name: 'COZINHA SHOW',
            location: 'Espaço Cozinha Show',
            description: 'Evento Cozinha Show - Credenciamento e Presença de Participantes',
            registrationEndDate: '2026-12-31T23:59',
          };
        }
        return evt;
      });
      return migrated.length > 0 ? migrated : INITIAL_EVENTS;
    }
    return INITIAL_EVENTS;
  } catch (err) {
    console.error('Erro ao ler eventos do localStorage:', err);
    return INITIAL_EVENTS;
  }
}

export function saveEvents(events: EventItem[], broadcastLocal = true): void {
  try {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    if (broadcastLocal) {
      window.dispatchEvent(new CustomEvent('events-updated', { detail: events }));
    }

    // Sincroniza com o servidor central
    fetch('/api/events-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(events),
    }).catch((err) => {
      console.warn('Falha temporária ao sincronizar eventos com o servidor:', err);
    });
  } catch (err) {
    console.error('Erro ao salvar eventos no cache:', err);
  }
}

export function getActiveEvent(): EventItem {
  const events = getStoredEvents();
  const active = events.find((e) => e.active);
  if (active) return active;
  if (events.length > 0) return events[0];
  return INITIAL_EVENTS[0];
}

export function setActiveEvent(id: string): boolean {
  const events = getStoredEvents();
  const exists = events.some((e) => e.id === id);
  if (!exists) return false;

  const updated = events.map((e) => ({
    ...e,
    active: e.id === id,
  }));

  saveEvents(updated);

  // Também atualiza o nome do evento no companySettings para manter coerência visual global
  const activeEvt = updated.find((e) => e.active);
  if (activeEvt) {
    const company = getCompanySettings();
    saveCompanySettings({
      ...company,
      eventName: activeEvt.name,
    });
  }

  return true;
}

export function addEvent(data: {
  name: string;
  date: string;
  location?: string;
  description?: string;
  registrationStartDate?: string;
  registrationEndDate?: string;
  active?: boolean;
}): { success: boolean; event?: EventItem; error?: string } {
  const trimmedName = data.name.trim();
  if (!trimmedName || trimmedName.length < 3) {
    return { success: false, error: 'O nome do evento deve conter no mínimo 3 caracteres.' };
  }

  const events = getStoredEvents();
  const exists = events.some((e) => (e?.name || '').toLowerCase() === (trimmedName || '').toLowerCase());
  if (exists) {
    return { success: false, error: `Já existe um evento cadastrado com o nome "${trimmedName}".` };
  }

  const newEvent: EventItem = {
    id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: trimmedName,
    date: data.date || new Date().toISOString().slice(0, 10),
    location: data.location?.trim() || 'A definir',
    description: data.description?.trim() || '',
    registrationStartDate: data.registrationStartDate?.trim() || undefined,
    registrationEndDate: data.registrationEndDate?.trim() || undefined,
    active: !!data.active,
    createdAt: new Date().toISOString(),
  };

  let updatedList: EventItem[];
  if (newEvent.active) {
    // Desativa os outros para manter apenas 1 ativo
    updatedList = [newEvent, ...events.map((e) => ({ ...e, active: false }))];
  } else {
    // Se não há nenhum ativo, torna este ativo
    const hasActive = events.some((e) => e.active);
    if (!hasActive) {
      newEvent.active = true;
    }
    updatedList = [newEvent, ...events];
  }

  saveEvents(updatedList);

  if (newEvent.active) {
    const company = getCompanySettings();
    saveCompanySettings({
      ...company,
      eventName: newEvent.name,
    });
  }

  return { success: true, event: newEvent };
}

export function updateEvent(updated: EventItem): boolean {
  const events = getStoredEvents();
  const idx = events.findIndex((e) => e.id === updated.id);
  if (idx === -1) return false;

  let newList: EventItem[];
  if (updated.active) {
    newList = events.map((e) => (e.id === updated.id ? updated : { ...e, active: false }));
    const company = getCompanySettings();
    saveCompanySettings({
      ...company,
      eventName: updated.name,
    });
  } else {
    newList = events.map((e) => (e.id === updated.id ? updated : e));
    // Garante ao menos 1 evento ativo
    if (!newList.some((e) => e.active) && newList.length > 0) {
      newList[0].active = true;
    }
  }

  saveEvents(newList);
  return true;
}

export function deleteEvent(id: string): { success: boolean; error?: string } {
  const events = getStoredEvents();
  if (events.length <= 1) {
    return { success: false, error: 'O sistema deve manter pelo menos um evento cadastrado.' };
  }

  const target = events.find((e) => e.id === id);
  if (!target) {
    return { success: false, error: 'Evento não encontrado.' };
  }

  const remaining = events.filter((e) => e.id !== id);
  // Se o excluído era o ativo, ativa o primeiro remanescente
  if (target.active && remaining.length > 0) {
    remaining[0].active = true;
    const company = getCompanySettings();
    saveCompanySettings({
      ...company,
      eventName: remaining[0].name,
    });
  }

  saveEvents(remaining);
  return { success: true };
}

export const MASTER_BACKUP_STORAGE_KEY = 'qr_event_participants_master_backup_v2';
export const DELETED_IDS_STORAGE_KEY = 'qr_event_deleted_participant_ids_v2';

/**
 * Gerenciamento seguro de IDs de participantes excluídos (tombstones).
 * Garante que qualquer participante excluído pelo administrador nunca ressurja,
 * mesmo após sincronização em segundo plano, reconciliação entre celulares ou recarregamento.
 */
export function getDeletedParticipantIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELETED_IDS_STORAGE_KEY);
    if (!raw) return new Set();
    const list = JSON.parse(raw);
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

export function recordDeletedParticipantIds(ids: string[]): void {
  if (typeof window === 'undefined' || !ids || ids.length === 0) return;
  try {
    const current = getDeletedParticipantIds();
    let changed = false;
    ids.forEach((id) => {
      if (id && !current.has(id)) {
        current.add(String(id));
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify(Array.from(current)));
    }
  } catch (err) {
    console.warn('Erro ao salvar IDs de participantes excluídos:', err);
  }
}

export function clearDeletedParticipantIds(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DELETED_IDS_STORAGE_KEY);
  } catch {}
}

/**
 * Função de União e Fusão Inteligente de Participantes (Anti-perda de dados)
 * Garante que cadastros feitos em qualquer celular ou computador sejam mantidos,
 * presenças confirmadas nunca sejam revertidas E que participantes excluídos
 * NUNCA sejam re-adicionados pelo merge.
 */
export function mergeParticipantLists(
  baseList: Participant[],
  incomingList: Participant[]
): {
  merged: Participant[];
  addedCount: number;
  newForServer: Participant[];
  hasAttendanceChanges: boolean;
} {
  const deletedIds = getDeletedParticipantIds();
  const normDigits = (s?: string) => (s || '').replace(/\D/g, '');

  const map = new Map<string, Participant>();
  const idToKey = new Map<string, string>();

  // 1. Carrega os itens da baseList, expurgando previamente qualquer item excluído
  baseList.forEach((item) => {
    if (!item || !item.id || deletedIds.has(item.id)) return;
    const digits = normDigits(item.registrationNumber);
    const event = item.eventId || 'event_1';
    const key = digits ? `reg_${digits}_${event}` : `id_${item.id}`;
    map.set(key, { ...item });
    if (item.id) {
      idToKey.set(item.id, key);
    }
  });

  let addedCount = 0;
  let hasAttendanceChanges = false;

  // 2. Itera sobre a lista de entrada e funde inteligentemente (bloqueando excluídos)
  incomingList.forEach((incoming) => {
    if (!incoming || !incoming.id || deletedIds.has(incoming.id)) return;
    const digits = normDigits(incoming.registrationNumber);
    const event = incoming.eventId || 'event_1';
    let key = digits ? `reg_${digits}_${event}` : '';
    if (!key && incoming.id && idToKey.has(incoming.id)) {
      key = idToKey.get(incoming.id)!;
    }
    if (!key && incoming.id) {
      key = `id_${incoming.id}`;
    }

    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...incoming });
      if (incoming.id) idToKey.set(incoming.id, key);
      addedCount++;
    } else {
      let attended = existing.attended;
      let attendedAt = existing.attendedAt;
      let attendanceUpdatedAt = existing.attendanceUpdatedAt;

      // Resolução inteligente por timestamp para sincronizar PRESENTE e AUSENTE entre celulares e computadores
      if (typeof incoming.attended === 'boolean') {
        const incomingTime = incoming.attendanceUpdatedAt
          ? new Date(incoming.attendanceUpdatedAt).getTime()
          : incoming.attendedAt
          ? new Date(incoming.attendedAt).getTime()
          : 0;
        const existingTime = existing.attendanceUpdatedAt
          ? new Date(existing.attendanceUpdatedAt).getTime()
          : existing.attendedAt
          ? new Date(existing.attendedAt).getTime()
          : 0;

        if (incomingTime > existingTime || (incomingTime === existingTime && incoming.attendanceUpdatedAt && incoming.attended !== existing.attended)) {
          if (attended !== incoming.attended) {
            hasAttendanceChanges = true;
          }
          attended = incoming.attended;
          attendedAt = incoming.attended ? (incoming.attendedAt || new Date().toISOString()) : null;
          attendanceUpdatedAt = incoming.attendanceUpdatedAt || new Date().toISOString();
        } else if (!existing.attendanceUpdatedAt && incoming.attendanceUpdatedAt) {
          if (attended !== incoming.attended) {
            hasAttendanceChanges = true;
          }
          attended = incoming.attended;
          attendedAt = incoming.attended ? (incoming.attendedAt || new Date().toISOString()) : null;
          attendanceUpdatedAt = incoming.attendanceUpdatedAt;
        } else if (incoming.attended && !existing.attended && !existing.attendanceUpdatedAt) {
          attended = true;
          attendedAt = incoming.attendedAt || new Date().toISOString();
          attendanceUpdatedAt = attendedAt;
          hasAttendanceChanges = true;
        }
      }

      const company = incoming.company || existing.company;
      const eventName = incoming.eventName || existing.eventName;
      const fullName = incoming.fullName || existing.fullName;
      const registrationNumber = incoming.registrationNumber || existing.registrationNumber;

      map.set(key, {
        ...existing,
        ...incoming,
        id: existing.id || incoming.id,
        fullName,
        registrationNumber,
        company,
        eventName,
        attended,
        attendedAt,
        attendanceUpdatedAt,
      });
    }
  });

  const merged = Array.from(map.values())
    .filter((p) => p && p.id && !deletedIds.has(p.id))
    .sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

  // 3. Detecta participantes que estão na base local mas faltam na lista recebida (NUNCA envia deletados)
  const incomingSet = new Set<string>();
  incomingList.forEach((inc) => {
    if (inc && inc.id && !deletedIds.has(inc.id)) {
      incomingSet.add(inc.id);
      const digits = normDigits(inc.registrationNumber);
      if (digits) incomingSet.add(`reg_${digits}_${inc.eventId || 'event_1'}`);
    }
  });

  const newForServer = baseList.filter((base) => {
    if (!base || !base.id || deletedIds.has(base.id)) return false;
    if (incomingSet.has(base.id)) return false;
    const digits = normDigits(base.registrationNumber);
    if (digits && incomingSet.has(`reg_${digits}_${base.eventId || 'event_1'}`)) return false;
    return true;
  });

  return {
    merged,
    addedCount,
    newForServer,
    hasAttendanceChanges,
  };
}

export function getStoredParticipants(): Participant[] {
  try {
    const deletedIds = getDeletedParticipantIds();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Tenta recuperar do backup seguro caso o cache principal tenha sido temporariamente limpo
      const backupRaw = localStorage.getItem(MASTER_BACKUP_STORAGE_KEY);
      if (backupRaw) {
        try {
          const backupList = JSON.parse(backupRaw);
          if (Array.isArray(backupList) && backupList.length > 0) {
            const filteredBackup = backupList.filter((p) => p && p.id && !deletedIds.has(p.id));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredBackup));
            return filteredBackup;
          }
        } catch {}
      }
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    
    // Filtra estritamente participantes excluídos
    const filtered = parsed.filter((p) => p && p.id && !deletedIds.has(p.id));
    if (filtered.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      localStorage.setItem(MASTER_BACKUP_STORAGE_KEY, JSON.stringify(filtered));
    }
    return filtered;
  } catch (err) {
    console.error('Erro ao ler participantes do localStorage:', err);
    return [];
  }
}

export function saveParticipants(participants: Participant[], broadcastLocal = true): void {
  try {
    const deletedIds = getDeletedParticipantIds();
    const sanitized = participants.filter((p) => p && p.id && !deletedIds.has(p.id));
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    // Salva cópia imediata no backup persistente sincronizada (sem dados excluídos)
    localStorage.setItem(MASTER_BACKUP_STORAGE_KEY, JSON.stringify(sanitized));

    if (broadcastLocal) {
      window.dispatchEvent(new Event('participants-updated'));
    }
  } catch (err) {
    console.error('Erro ao salvar participantes no cache:', err);
  }
}

// Chave para fila de participantes salvos durante oscilações de rede móvel
const OFFLINE_QUEUE_KEY = 'qr_offline_participants_queue_v1';
const OFFLINE_ATTENDANCE_QUEUE_KEY = 'qr_offline_attendance_queue_v1';

export interface OfflineAttendanceItem {
  id: string;
  codeOrMatricula: string;
  attended: boolean;
  attendedAt: string | null;
  attendanceUpdatedAt: string;
}

export function getOfflineQueue(): Participant[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getOfflineAttendanceQueue(): OfflineAttendanceItem[] {
  try {
    const raw = localStorage.getItem(OFFLINE_ATTENDANCE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getPendingOfflineCount(): number {
  return getOfflineQueue().length + getOfflineAttendanceQueue().length;
}

function queueOfflineParticipant(participant: Participant): void {
  try {
    const q = getOfflineQueue();
    if (!q.some((p) => p.id === participant.id)) {
      q.push(participant);
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q));
      window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: { count: getPendingOfflineCount() } }));
    }
  } catch (err) {
    console.warn('Erro ao enfileirar participante offline:', err);
  }
}

export function queueOfflineAttendance(item: OfflineAttendanceItem): void {
  try {
    const q = getOfflineAttendanceQueue();
    const existingIdx = q.findIndex(i => i.id === item.id);
    if (existingIdx >= 0) {
      q[existingIdx] = item;
    } else {
      q.push(item);
    }
    localStorage.setItem(OFFLINE_ATTENDANCE_QUEUE_KEY, JSON.stringify(q));
    window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: { count: getPendingOfflineCount() } }));
  } catch (err) {
    console.warn('Erro ao enfileirar presença offline:', err);
  }
}

export function removeOfflineAttendanceFromQueue(id: string): void {
  try {
    const q = getOfflineAttendanceQueue().filter(i => i.id !== id);
    localStorage.setItem(OFFLINE_ATTENDANCE_QUEUE_KEY, JSON.stringify(q));
    window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: { count: getPendingOfflineCount() } }));
  } catch {}
}

export async function flushOfflineQueue(): Promise<void> {
  const partsQueue = getOfflineQueue();
  if (partsQueue && partsQueue.length > 0) {
    try {
      const res = await fetch('/api/participants/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ participants: partsQueue }),
      });

      if (res.ok) {
        localStorage.removeItem(OFFLINE_QUEUE_KEY);
        console.log('[SYNC] Fila offline de participantes sincronizada com sucesso.');
      }
    } catch (err) {
      console.warn('Fila de participantes aguardando rede:', err);
    }
  }

  const attQueue = getOfflineAttendanceQueue();
  if (attQueue && attQueue.length > 0) {
    try {
      const res = await fetch('/api/participants/attendance-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ items: attQueue }),
      });

      if (res.ok) {
        localStorage.removeItem(OFFLINE_ATTENDANCE_QUEUE_KEY);
        console.log('[SYNC] Fila offline de presenças sincronizada com sucesso.');
      }
    } catch (err) {
      console.warn('Fila de presenças aguardando rede:', err);
    }
  }

  window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: { count: getPendingOfflineCount() } }));
}

// Cadastrar novo participante (suporta envio síncrono e assíncrono de qualquer celular em qualquer rede 4G/5G/Wi-Fi)
export async function addParticipant(
  data: {
    fullName: string;
    registrationNumber: string;
    company: string;
    eventId?: string;
    eventName?: string;
  },
  isAdmin?: boolean
): Promise<{ success: boolean; participant?: Participant; error?: string }> {
  const current = getStoredParticipants();

  const trimmedMatricula = data.registrationNumber.replace(/\D/g, '').trim();
  const trimmedName = autoCorrectAndAccent(data.fullName.trim());
  const trimmedCompany = autoCorrectAndAccent(data.company.trim());

  // Validação estrita de Nome Completo (exige nome e sobrenome)
  const nameValidation = isValidFullName(trimmedName);
  if (!nameValidation.valid) {
    return {
      success: false,
      error: nameValidation.error,
    };
  }

  if (!trimmedMatricula) {
    return {
      success: false,
      error: 'O número de matrícula deve conter somente números.',
    };
  }

  // Se não foi especificado evento, vincula ao evento ativo atual
  const allEvents = getStoredEvents();
  const activeEvt = getActiveEvent();
  const targetEventId = data.eventId || activeEvt?.id || 'event_1';
  const matchedEvent = allEvents.find((e) => e.id === targetEventId) || activeEvt;
  const targetEventName = data.eventName || matchedEvent?.name || 'COZINHA SHOW';

  // Validação estrita do prazo de validade para cadastro do evento
  if (matchedEvent) {
    const validity = getEventRegistrationStatus(matchedEvent);
    if (!validity.canRegister) {
      return {
        success: false,
        error: validity.detail,
      };
    }
  }

  // Validação prévia de duplicação local (no mesmo evento): proibir matrícula duplicada ou nome duplicado
  const normalizedName = normalizeNameForComparison(trimmedName);
  const existingSameMatricula = current.find(
    (p) => 
      (p?.registrationNumber || '').toLowerCase() === trimmedMatricula.toLowerCase() &&
      (!p?.eventId || p.eventId === targetEventId)
  );

  const existingSameName = current.find(
    (p) =>
      normalizeNameForComparison(p?.fullName) === normalizedName &&
      (!p?.eventId || p.eventId === targetEventId)
  );

  if (existingSameMatricula && existingSameName) {
    return {
      success: false,
      error: `Já existe um participante cadastrado com este nome ("${trimmedName}") e esta matrícula ("${trimmedMatricula}") neste evento.`,
    };
  }

  if (existingSameMatricula) {
    return {
      success: false,
      error: `Já existe um participante cadastrado com o número de matrícula "${trimmedMatricula}" neste evento (${existingSameMatricula.fullName}).`,
    };
  }

  if (existingSameName) {
    return {
      success: false,
      error: `Já existe um participante cadastrado com o nome "${trimmedName}" neste evento (Matrícula: ${existingSameName.registrationNumber}). Não são permitidos nomes duplicados.`,
    };
  }

  const newParticipant: Participant = {
    id: `part_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    fullName: trimmedName,
    registrationNumber: trimmedMatricula,
    company: trimmedCompany || 'Não informada',
    eventId: targetEventId,
    eventName: targetEventName,
    createdAt: new Date().toISOString(),
    attended: false,
    attendedAt: null,
  };

  try {
    // Envia ao servidor central para registrar e alertar outros celulares em tempo real
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Admin-Auth': 'true',
      },
      credentials: 'include',
      body: JSON.stringify({
        id: newParticipant.id,
        fullName: trimmedName,
        registrationNumber: trimmedMatricula,
        company: trimmedCompany,
        eventId: targetEventId,
        eventName: targetEventName,
        createdAt: newParticipant.createdAt,
        adminAuth: true,
      }),
    });

    if (res.ok) {
      const serverPayload = await res.json();
      const serverParticipant: Participant = serverPayload.participant || newParticipant;

      // Salva no cache local confirmado
      const latest = getStoredParticipants();
      const updated = [serverParticipant, ...latest.filter((p) => p.id !== serverParticipant.id)];
      saveParticipants(updated);
      setSyncStatus('connected');

      // Replicar imediatamente para destinos de nuvem configurados se houver
      const peerDestinations = getPeerCloudDestinations();
      peerDestinations.forEach((destUrl) => {
        fetch(`${destUrl}/api/participants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: serverParticipant.id,
            fullName: trimmedName,
            registrationNumber: trimmedMatricula,
            company: trimmedCompany,
            eventId: targetEventId,
            eventName: targetEventName,
            createdAt: serverParticipant.createdAt,
            adminAuth: true,
          }),
        }).catch(() => {});
      });

      return { success: true, participant: serverParticipant };
    } else {
      const errorData = await res.json().catch(() => ({}));
      const errorMsg = errorData.error || `Erro do servidor (${res.status}). Não foi possível cadastrar.`;
      return { success: false, error: errorMsg };
    }
  } catch (err) {
    console.warn('Rede externa temporariamente indisponível, salvando em cache e fila de sincronização:', err);
    // Modo offline resiliente: salva no cache local para não perder os dados do participante
    const latest = getStoredParticipants();
    const updated = [newParticipant, ...latest.filter((p) => p.id !== newParticipant.id)];
    saveParticipants(updated);
    queueOfflineParticipant(newParticipant);
    setSyncStatus('offline');

    return { success: true, participant: newParticipant };
  }
}

export async function updateParticipant(
  id: string,
  data: {
    fullName: string;
    registrationNumber: string;
    company: string;
    eventId?: string;
    eventName?: string;
    attended?: boolean;
  }
): Promise<{ success: boolean; participant?: Participant; error?: string }> {
  const current = getStoredParticipants();
  const index = current.findIndex((p) => p.id === id);

  if (index === -1) {
    return { success: false, error: 'Participante não encontrado no sistema.' };
  }

  const existing = current[index];
  const trimmedName = autoCorrectAndAccent(data.fullName.trim());
  const trimmedMatricula = data.registrationNumber.replace(/\D/g, '').trim();
  const trimmedCompany = autoCorrectAndAccent(data.company.trim());

  // Validação estrita de Nome Completo (exige nome e sobrenome)
  const nameValidation = isValidFullName(trimmedName);
  if (!nameValidation.valid) {
    return { success: false, error: nameValidation.error };
  }

  if (!trimmedMatricula) {
    return { success: false, error: 'A matrícula deve conter números válidos.' };
  }

  const targetEventId = data.eventId || existing.eventId || 'event_1';
  let targetEventName = data.eventName;
  if (!targetEventName) {
    const allEvents = getStoredEvents();
    const foundEvt = allEvents.find((e) => e.id === targetEventId);
    targetEventName = foundEvt?.name || existing.eventName || 'Evento Geral';
  }

  // Verifica duplicação de matrícula ou nome em outro participante no mesmo evento
  const normalizedName = normalizeNameForComparison(trimmedName);
  const duplicateMatricula = current.find(
    (p) =>
      p.id !== id &&
      (p?.registrationNumber || '').toLowerCase() === trimmedMatricula.toLowerCase() &&
      (!p?.eventId || p.eventId === targetEventId)
  );

  const duplicateName = current.find(
    (p) =>
      p.id !== id &&
      normalizeNameForComparison(p?.fullName) === normalizedName &&
      (!p?.eventId || p.eventId === targetEventId)
  );

  if (duplicateMatricula) {
    return {
      success: false,
      error: `A matrícula "${trimmedMatricula}" já pertence a outro participante cadastrado neste evento (${duplicateMatricula.fullName}).`,
    };
  }

  if (duplicateName) {
    return {
      success: false,
      error: `Já existe outro participante cadastrado com o nome "${trimmedName}" neste evento (Matrícula: ${duplicateName.registrationNumber}). Não são permitidos nomes duplicados.`,
    };
  }

  const now = new Date().toISOString();
  const newAttended = data.attended !== undefined ? data.attended : existing.attended;
  const attendedChanged = newAttended !== existing.attended;
  const newAttendedAt =
    newAttended && !existing.attended
      ? now
      : !newAttended
      ? null
      : existing.attendedAt;

  const updatedParticipant: Participant = {
    ...existing,
    fullName: trimmedName,
    registrationNumber: trimmedMatricula,
    company: trimmedCompany || 'Não informada',
    eventId: targetEventId,
    eventName: targetEventName,
    attended: newAttended,
    attendedAt: newAttendedAt,
    attendanceUpdatedAt: now,
  };

  // Salva no armazenamento local imediatamente (< 1ms)
  const updatedList = current.map((p) => (p.id === id ? updatedParticipant : p));
  saveParticipants(updatedList);

  // Dispara eventos locais para atualizar todas as abas e componentes imediatamente
  window.dispatchEvent(new CustomEvent('participant-updated', { detail: updatedParticipant }));
  window.dispatchEvent(new Event('participants-updated'));

  if (attendedChanged) {
    if (newAttended) {
      window.dispatchEvent(
        new CustomEvent('attendance-confirmed', {
          detail: { participant: updatedParticipant, timestamp: now, synced: true },
        })
      );
    } else {
      window.dispatchEvent(
        new CustomEvent('attendance-absent', {
          detail: { participant: updatedParticipant, timestamp: now, synced: true },
        })
      );
    }
  }

  const updatePayload = {
    id,
    fullName: trimmedName,
    registrationNumber: trimmedMatricula,
    company: trimmedCompany,
    eventId: targetEventId,
    eventName: targetEventName,
    attended: newAttended,
    attendedAt: newAttendedAt,
    attendanceUpdatedAt: now,
  };

  // Envia atualização para o servidor central
  try {
    fetch(`/api/participants/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      credentials: 'include',
      body: JSON.stringify(updatePayload),
    }).catch(() => {});

    // Propaga imediatamente para todas as instâncias peer na nuvem configuradas
    const peerDestinations = getPeerCloudDestinations();
    peerDestinations.forEach((destUrl) => {
      fetch(`${destUrl}/api/participants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      }).catch(() => {});
    });

    setSyncStatus('connected');
    return { success: true, participant: updatedParticipant };
  } catch (err) {
    console.warn('Servidor indisponível para atualização imediata, salvo localmente:', err);
    setSyncStatus('offline');
    return { success: true, participant: updatedParticipant };
  }
}

export function deleteParticipant(id: string): boolean {
  if (!id) return false;

  // 1. Registra o ID nos tombstones locais imediatamente para impedir qualquer ressuscitação
  recordDeletedParticipantIds([id]);

  // 2. Limpa da lista de participantes ativos e do backup principal
  const current = getStoredParticipants();
  const updated = current.filter((p) => p.id !== id);
  saveParticipants(updated);

  // 3. Remove de qualquer fila offline pendente
  try {
    const rawQueue = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (rawQueue) {
      const q: Participant[] = JSON.parse(rawQueue);
      const filteredQ = q.filter((p) => p.id !== id);
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filteredQ));
    }
  } catch {}

  // 4. Notifica o servidor local para exclusão definitiva
  fetch(`/api/participants/${id}`, { 
    method: 'DELETE',
    headers: { 'Cache-Control': 'no-cache' },
    keepalive: true,
  })
    .then(() => setSyncStatus('connected'))
    .catch(() => setSyncStatus('offline'));

  // 5. Propaga exclusão para nuvem cruzada se configurada
  const peerDestinations = getPeerCloudDestinations();
  peerDestinations.forEach((destUrl) => {
    fetch(`${destUrl}/api/participants/${id}`, { 
      method: 'DELETE',
      headers: { 'Cache-Control': 'no-cache' },
      keepalive: true,
    }).catch(() => {});
  });

  // 6. Alerta imediatamente a interface e componentes
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('participants-updated'));
  }

  return true;
}

export function deleteMultipleParticipants(ids: string[]): number {
  if (!ids || ids.length === 0) return 0;

  // 1. Registra todos os IDs nos tombstones locais imediatamente
  recordDeletedParticipantIds(ids);

  const current = getStoredParticipants();
  const idSet = new Set(ids);
  const updated = current.filter((p) => !idSet.has(p.id));
  const removedCount = current.length - updated.length;
  saveParticipants(updated);

  // 2. Remove de qualquer fila offline
  try {
    const rawQueue = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (rawQueue) {
      const q: Participant[] = JSON.parse(rawQueue);
      const filteredQ = q.filter((p) => !idSet.has(p.id));
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filteredQ));
    }
  } catch {}

  // 3. Notifica o servidor local
  fetch('/api/participants/delete-multiple', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    body: JSON.stringify({ ids }),
    keepalive: true,
  })
    .then(() => setSyncStatus('connected'))
    .catch(() => setSyncStatus('offline'));

  // 4. Propaga para nuvem cruzada se configurada
  const peerDestinations = getPeerCloudDestinations();
  peerDestinations.forEach((destUrl) => {
    fetch(`${destUrl}/api/participants/delete-multiple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      body: JSON.stringify({ ids }),
      keepalive: true,
    }).catch(() => {});
  });

  // 5. Alerta interface
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('participants-updated'));
  }

  return removedCount;
}

/**
 * Importa um lote de participantes diretamente com suporte a mesclagem ou substituição,
 * sincronizando com todos os servidores, SSE e nuvens conectadas.
 */
export async function importBatchParticipants(
  incomingParticipants: Participant[],
  mode: 'merge' | 'replace' = 'merge'
): Promise<{ success: boolean; added: number; updated: number; total: number; error?: string }> {
  try {
    if (!Array.isArray(incomingParticipants) || incomingParticipants.length === 0) {
      return { success: false, added: 0, updated: 0, total: 0, error: 'Nenhum participante fornecido para importação.' };
    }

    let finalList: Participant[] = [];
    let addedCount = 0;
    let updatedCount = 0;

    if (mode === 'replace') {
      finalList = incomingParticipants;
      addedCount = incomingParticipants.length;
    } else {
      const local = getStoredParticipants();
      const mergeResult = mergeParticipantLists(local, incomingParticipants);
      finalList = mergeResult.merged;
      addedCount = mergeResult.addedCount;
      updatedCount = mergeResult.hasAttendanceChanges ? 1 : 0;
    }

    saveParticipants(finalList);
    window.dispatchEvent(new Event('participants-updated'));

    // Envia lote para o servidor central
    const endpoint = mode === 'replace' ? '/api/participants/reset' : '/api/participants/batch';
    const payload = mode === 'replace' ? { participants: finalList } : { participants: incomingParticipants };

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});

    // Replicar para nuvem cruzada se configurada
    const peerDestinations = getPeerCloudDestinations();
    peerDestinations.forEach((destUrl) => {
      fetch(`${destUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    });

    return {
      success: true,
      added: addedCount,
      updated: updatedCount,
      total: finalList.length,
    };
  } catch (err: any) {
    return {
      success: false,
      added: 0,
      updated: 0,
      total: 0,
      error: err?.message || 'Falha ao importar lote de participantes.',
    };
  }
}

export function toggleAttendance(id: string): { participant: Participant | null; attended: boolean } {
  const current = getStoredParticipants();
  let updatedParticipant: Participant | null = null;
  let newAttended = false;
  const now = new Date().toISOString();

  const updated = current.map((p) => {
    if (p.id === id) {
      newAttended = !p.attended;
      updatedParticipant = {
        ...p,
        attended: newAttended,
        attendedAt: newAttended ? now : null,
        attendanceUpdatedAt: now,
      };
      return updatedParticipant;
    }
    return p;
  });

  saveParticipants(updated);

  if (updatedParticipant) {
    window.dispatchEvent(new CustomEvent('participant-updated', { detail: updatedParticipant }));
    window.dispatchEvent(new CustomEvent('attendance-updated', { detail: updatedParticipant }));
    if (newAttended) {
      window.dispatchEvent(
        new CustomEvent('attendance-confirmed', {
          detail: { participant: updatedParticipant, timestamp: now, synced: true },
        })
      );
    } else {
      window.dispatchEvent(
        new CustomEvent('attendance-absent', {
          detail: { participant: updatedParticipant, timestamp: now, synced: true },
        })
      );
    }
  }

  const payload = {
    attended: newAttended,
    attendedAt: newAttended ? now : null,
    attendanceUpdatedAt: now,
  };

  // Sincroniza com o servidor central local com payload atômico
  fetch(`/api/participants/${id}/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then(() => setSyncStatus('connected'))
    .catch(() => setSyncStatus('offline'));

  // Propaga para instâncias de nuvem configuradas com o payload exato
  const peerDestinations = getPeerCloudDestinations();
  peerDestinations.forEach((destUrl) => {
    fetch(`${destUrl}/api/participants/${id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  });

  return { participant: updatedParticipant, attended: newAttended };
}

/**
 * Atualiza o status de presença de múltiplos participantes em lote (Presente ou Ausente)
 * Propaga a mudança em tempo real para todas as redes e instâncias de nuvem.
 */
export function batchSetAttendance(
  ids: string[],
  attended: boolean
): { success: boolean; count: number; updated: Participant[] } {
  const current = getStoredParticipants();
  const idSet = new Set(ids);
  const now = new Date().toISOString();
  const updatedList: Participant[] = [];

  const updated = current.map((p) => {
    if (idSet.has(p.id)) {
      const updatedP: Participant = {
        ...p,
        attended,
        attendedAt: attended ? (p.attendedAt || now) : null,
        attendanceUpdatedAt: now,
      };
      updatedList.push(updatedP);
      return updatedP;
    }
    return p;
  });

  saveParticipants(updated);

  updatedList.forEach((p) => {
    window.dispatchEvent(new CustomEvent('participant-updated', { detail: p }));
    if (attended) {
      window.dispatchEvent(
        new CustomEvent('attendance-confirmed', {
          detail: { participant: p, timestamp: now, synced: true },
        })
      );
    } else {
      window.dispatchEvent(
        new CustomEvent('attendance-absent', {
          detail: { participant: p, timestamp: now, synced: true },
        })
      );
    }
  });

  const payload = {
    ids,
    attended,
    timestamp: now,
  };

  fetch('/api/participants/attendance-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then(() => setSyncStatus('connected'))
    .catch(() => setSyncStatus('offline'));

  const peerDestinations = getPeerCloudDestinations();
  peerDestinations.forEach((destUrl) => {
    fetch(`${destUrl}/api/participants/attendance-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  });

  return { success: true, count: updatedList.length, updated: updatedList };
}

export async function markAttendanceByCode(codeOrMatricula: string): Promise<{
  status: 'success' | 'already_checked' | 'not_found' | 'error';
  participant?: Participant;
  message: string;
}> {
  const current = getStoredParticipants();
  const cleanInput = (codeOrMatricula || '').trim();

  if (!cleanInput) {
    return {
      status: 'not_found',
      message: 'Nenhum código fornecido para leitura.',
    };
  }

  let targetId: string | null = null;
  let targetMatricula: string | null = null;
  let targetName: string | null = null;
  let targetEmpresa: string | null = null;
  let targetEvent: string | null = null;

  // 0. Tenta decodificar formato ultra-compacto oficial (CP:id:mat:nome:emp ou CP:id:mat:nome:emp:evento)
  if (cleanInput.startsWith('CP:') || cleanInput.startsWith('CHK:') || cleanInput.startsWith('CP|') || cleanInput.startsWith('CHK|')) {
    const separator = cleanInput.includes('|') ? '|' : ':';
    const parts = cleanInput.split(separator);
    if (parts[1]) targetId = parts[1].trim();
    if (parts[2]) targetMatricula = parts[2].trim();
    if (parts[3]) {
      try {
        targetName = decodeURIComponent(parts[3]).trim();
      } catch {
        targetName = parts[3].trim();
      }
    }
    if (parts[4]) {
      try {
        targetEmpresa = decodeURIComponent(parts[4]).trim();
      } catch {
        targetEmpresa = parts[4].trim();
      }
    }
    if (parts[5]) {
      try {
        targetEvent = decodeURIComponent(parts[5]).trim();
      } catch {
        targetEvent = parts[5].trim();
      }
    }
  }

  // 1. Tenta decodificar JSON do crachá do participante
  const jsonMatch = cleanInput.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.id) targetId = String(parsed.id).trim();
      if (parsed.matricula) targetMatricula = String(parsed.matricula).trim();
      if (parsed.registrationNumber) targetMatricula = String(parsed.registrationNumber).trim();
      if (parsed.code) targetMatricula = String(parsed.code).trim();
      if (parsed.nome) targetName = String(parsed.nome).trim();
      if (parsed.name) targetName = String(parsed.name).trim();
      if (parsed.empresa || parsed.company) targetEmpresa = String(parsed.empresa || parsed.company).trim();
      if (parsed.evento || parsed.event || parsed.eventName) targetEvent = String(parsed.evento || parsed.event || parsed.eventName).trim();
    } catch {
      // ignora se não for JSON válido
    }
  }

  // 2. Se for uma URL (ex: lido por aplicativo de câmera nativa do celular iOS/Android, ou leitor externo)
  try {
    if (cleanInput.startsWith('http://') || cleanInput.startsWith('https://') || cleanInput.includes('?checkin=') || cleanInput.includes('&checkin=')) {
      const fullUrl = cleanInput.startsWith('http')
        ? cleanInput
        : `https://dummy.com/${cleanInput.startsWith('/') ? cleanInput.substring(1) : cleanInput}`;
      const parsedUrl = new URL(fullUrl);
      const urlId = parsedUrl.searchParams.get('checkin') || parsedUrl.searchParams.get('id');
      const urlCode = parsedUrl.searchParams.get('mat') || parsedUrl.searchParams.get('matricula') || parsedUrl.searchParams.get('code') || parsedUrl.searchParams.get('registrationNumber');
      const urlNom = parsedUrl.searchParams.get('nom') || parsedUrl.searchParams.get('nome') || parsedUrl.searchParams.get('name');
      const urlEmp = parsedUrl.searchParams.get('emp') || parsedUrl.searchParams.get('empresa') || parsedUrl.searchParams.get('company');
      const urlEvt = parsedUrl.searchParams.get('evt') || parsedUrl.searchParams.get('evento') || parsedUrl.searchParams.get('event');
      if (urlId && !targetId) targetId = urlId;
      if (urlCode && !targetMatricula) targetMatricula = urlCode;
      if (urlNom && !targetName) targetName = urlNom;
      if (urlEmp && !targetEmpresa) targetEmpresa = urlEmp;
      if (urlEvt && !targetEvent) targetEvent = urlEvt;
    }
  } catch {}

  const normalize = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const normInput = normalize(cleanInput);

  function normMatricula(val: string) {
    return (val || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  const peerDestinations = getPeerCloudDestinations();

  let participant = current.find((p) => {
    if (!p) return false;
    if (targetId && p.id === targetId) return true;
    if (p.id === cleanInput) return true;

    if (targetMatricula) {
      if ((p.registrationNumber || '').toLowerCase() === (targetMatricula || '').toLowerCase()) return true;
      if (normMatricula(p.registrationNumber) === normMatricula(targetMatricula)) return true;
    }

    if (targetName && (p.fullName || '').toLowerCase() === (targetName || '').toLowerCase()) return true;

    if ((p.registrationNumber || '').toLowerCase() === (cleanInput || '').toLowerCase()) return true;
    if (normMatricula(p.registrationNumber) === normInput) return true;

    const digitsOnly = cleanInput.replace(/\D/g, '');
    const matriculaDigits = (p.registrationNumber || '').replace(/\D/g, '');
    if (digitsOnly && matriculaDigits && digitsOnly === matriculaDigits) {
      return true;
    }

    return false;
  });

  // Se o participante foi encontrado no cache local
  if (participant) {
    if (participant.attended) {
      const formattedDate = participant.attendedAt
        ? new Date(participant.attendedAt).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        : '';
      
      // Garante sincronia mesmo se já marcado
      fetch('/api/participants/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: participant.id,
          codeOrMatricula: cleanInput,
          attended: true,
          attendedAt: participant.attendedAt,
          attendanceUpdatedAt: participant.attendanceUpdatedAt || participant.attendedAt,
        }),
      }).catch(() => {});

      peerDestinations.forEach((destUrl) => {
        fetch(`${destUrl}/api/participants/attendance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: participant!.id,
            codeOrMatricula: cleanInput,
            attended: true,
            attendedAt: participant!.attendedAt,
            attendanceUpdatedAt: participant!.attendanceUpdatedAt || participant!.attendedAt,
          }),
        }).catch(() => {});
      });

      return {
        status: 'already_checked',
        participant,
        message: `Presença já confirmada anteriormente às ${formattedDate}!`,
      };
    }

    // Marca presença localmente imediatamente (Atualização Otimista < 1ms)
    const now = new Date().toISOString();
    let confirmedParticipant: Participant = {
      ...participant,
      attended: true,
      attendedAt: now,
      attendanceUpdatedAt: now,
    };

    const updated = current.map((p) => (p.id === participant!.id ? confirmedParticipant : p));
    saveParticipants(updated);

    // Dispara eventos locais imediatos para atualizar todas as telas locais
    window.dispatchEvent(new CustomEvent('participant-updated', { detail: confirmedParticipant }));
    window.dispatchEvent(
      new CustomEvent('attendance-confirmed', {
        detail: { participant: confirmedParticipant, timestamp: now, synced: true },
      })
    );

    // Enfileira para garantia offline de envio a todos os computadores e celulares
    queueOfflineAttendance({
      id: confirmedParticipant.id,
      codeOrMatricula: cleanInput,
      attended: true,
      attendedAt: now,
      attendanceUpdatedAt: now,
    });

    // Notifica o servidor central local com o objeto completo para garantir persistência e broadcast imediato
    fetch('/api/participants/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: confirmedParticipant.id,
        codeOrMatricula: cleanInput,
        attended: true,
        attendedAt: now,
        attendanceUpdatedAt: now,
        participant: confirmedParticipant,
      }),
    })
      .then((res) => {
        if (res.ok) {
          removeOfflineAttendanceFromQueue(confirmedParticipant.id);
          setSyncStatus('connected');
        } else {
          setSyncStatus('offline');
        }
      })
      .catch(() => setSyncStatus('offline'));

    // Propaga imediatamente para todas as outras instâncias na nuvem (computadores e celulares 4G/5G)
    peerDestinations.forEach((destUrl) => {
      fetch(`${destUrl}/api/participants/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: confirmedParticipant.id,
          codeOrMatricula: cleanInput,
          attended: true,
          attendedAt: now,
          attendanceUpdatedAt: now,
          participant: confirmedParticipant,
        }),
      }).catch(() => {});
    });

    const isNetOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    return {
      status: 'success',
      participant: confirmedParticipant,
      message: isNetOnline
        ? 'Presença confirmada com sucesso! Sincronizado em rede com todos os computadores e celulares.'
        : 'Presença confirmada no aparelho (Modo Offline)! Fila salva localmente para sincronização automática ao reconectar.',
    };
  }

  // Se NÃO foi encontrado localmente no cache:
  // 1. Tenta recuperar e registrar participante diretamente dos dados embutidos no QR Code (CP:, URL, JSON ou código offline)
  const isNetOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (targetName || targetMatricula || targetId || (!isNetOnline && cleanInput)) {
    const now = new Date().toISOString();
    const settings = getCompanySettings();
    const cleanDigits = cleanInput.replace(/\D/g, '');
    const fallbackMatricula = targetMatricula || (targetId ? targetId.replace(/\D/g, '') : cleanDigits) || 'S/N';
    const fallbackName = targetName || (targetMatricula ? `Participante (Matrícula ${targetMatricula})` : `Participante (${(targetId || cleanInput).slice(0, 16)})`);
    const fallbackCompany = targetEmpresa || 'Empresa Identificada por QR';
    const fallbackEvent = targetEvent || settings.eventName || 'COZINHA SHOW';

    const recoveredParticipant: Participant = {
      id: targetId || `part_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fullName: fallbackName,
      registrationNumber: fallbackMatricula,
      company: fallbackCompany,
      eventId: 'event_1',
      eventName: fallbackEvent,
      createdAt: now,
      attended: true,
      attendedAt: now,
      attendanceUpdatedAt: now,
    };

    const fresh = getStoredParticipants();
    saveParticipants([recoveredParticipant, ...fresh.filter(p => p.id !== recoveredParticipant.id)]);

    // Enfileira participante e presença offline para garantia de sincronização com o servidor
    queueOfflineParticipant(recoveredParticipant);
    queueOfflineAttendance({
      id: recoveredParticipant.id,
      codeOrMatricula: cleanInput,
      attended: true,
      attendedAt: now,
      attendanceUpdatedAt: now,
    });

    window.dispatchEvent(new CustomEvent('participant-updated', { detail: recoveredParticipant }));
    window.dispatchEvent(
      new CustomEvent('attendance-confirmed', {
        detail: { participant: recoveredParticipant, timestamp: now, synced: true },
      })
    );

    // Envia ao servidor para persistência e broadcast se houver conexão
    fetch('/api/participants/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: recoveredParticipant.id,
        codeOrMatricula: cleanInput,
        attended: true,
        attendedAt: now,
        attendanceUpdatedAt: now,
        participant: recoveredParticipant,
      }),
    })
      .then((res) => {
        if (res.ok) {
          removeOfflineAttendanceFromQueue(recoveredParticipant.id);
          setSyncStatus('connected');
        } else {
          setSyncStatus('offline');
        }
      })
      .catch(() => setSyncStatus('offline'));

    peerDestinations.forEach((destUrl) => {
      fetch(`${destUrl}/api/participants/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: recoveredParticipant.id,
          codeOrMatricula: cleanInput,
          attended: true,
          attendedAt: now,
          attendanceUpdatedAt: now,
          participant: recoveredParticipant,
        }),
      }).catch(() => {});
    });

    return {
      status: 'success',
      participant: recoveredParticipant,
      message: isNetOnline
        ? 'Presença confirmada com sucesso via dados oficiais do QR Code!'
        : 'Presença confirmada no aparelho via dados do QR Code (Modo Offline)! Sincronização pendente ao reconectar.',
    };
  }

  // 2. Consulta o servidor central diretamente via API de presença
  try {
    const res = await fetch('/api/participants/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codeOrMatricula: cleanInput }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.participant) {
        const fresh = getStoredParticipants();
        const exists = fresh.some((p) => p.id === data.participant.id);
        const merged = exists
          ? fresh.map((p) => (p.id === data.participant.id ? data.participant : p))
          : [data.participant, ...fresh];
        saveParticipants(merged);

        window.dispatchEvent(new CustomEvent('participant-updated', { detail: data.participant }));
        if (data.participant.attended) {
          window.dispatchEvent(
            new CustomEvent('attendance-confirmed', {
              detail: { participant: data.participant, timestamp: data.participant.attendedAt, synced: true },
            })
          );
        }

        // Replicar para as demais nuvens
        peerDestinations.forEach((destUrl) => {
          fetch(`${destUrl}/api/participants/attendance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: data.participant.id,
              codeOrMatricula: cleanInput,
              attended: true,
              attendedAt: data.participant.attendedAt,
            }),
          }).catch(() => {});
        });

        return {
          status: data.status === 'already_checked' ? 'already_checked' : 'success',
          participant: data.participant,
          message: data.message || 'Presença confirmada e sincronizada com sucesso!',
        };
      }
    }
  } catch (err) {
    console.warn('Erro ao consultar presença no servidor local:', err);
  }

  // Se ainda não encontrou, tenta consultar diretamente as outras instâncias na nuvem
  if (peerDestinations.length > 0) {
    for (const destUrl of peerDestinations) {
      try {
        const cloudRes = await fetch(`${destUrl}/api/participants/attendance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codeOrMatricula: cleanInput }),
        });

        if (cloudRes.ok) {
          const cloudData = await cloudRes.json();
          if (cloudData.participant) {
            const fresh = getStoredParticipants();
            const exists = fresh.some((p) => p.id === cloudData.participant.id);
            const merged = exists
              ? fresh.map((p) => (p.id === cloudData.participant.id ? cloudData.participant : p))
              : [cloudData.participant, ...fresh];
            saveParticipants(merged);

            // Sincroniza também no servidor local
            fetch('/api/participants/batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ participants: [cloudData.participant] }),
            }).catch(() => {});

            window.dispatchEvent(new CustomEvent('participant-updated', { detail: cloudData.participant }));
            if (cloudData.participant.attended) {
              window.dispatchEvent(
                new CustomEvent('attendance-confirmed', {
                  detail: { participant: cloudData.participant, timestamp: cloudData.participant.attendedAt, synced: true },
                })
              );
            }

            return {
              status: cloudData.status === 'already_checked' ? 'already_checked' : 'success',
              participant: cloudData.participant,
              message: cloudData.message || 'Presença confirmada e sincronizada via nuvem!',
            };
          }
        }
      } catch (err) {
        console.warn(`Erro ao consultar presença em ${destUrl}:`, err);
      }
    }
  }

  const displayCode = cleanInput.length > 50 ? `${cleanInput.substring(0, 47)}...` : cleanInput;
  return {
    status: 'not_found',
    message: `Participante não encontrado com o código: "${displayCode}". Verifique se o participante está cadastrado.`,
  };
}

export function resetToDemoData(): void {
  clearDeletedParticipantIds();
  saveParticipants(INITIAL_PARTICIPANTS);
  fetch('/api/participants/reset', { 
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participants: INITIAL_PARTICIPANTS, clearTombstones: true })
  })
    .then(() => setSyncStatus('connected'))
    .catch(() => setSyncStatus('offline'));
}

export function clearAllParticipants(): void {
  const current = getStoredParticipants();
  const allIds = current.map((p) => p.id);
  recordDeletedParticipantIds(allIds);
  saveParticipants([]);
  fetch('/api/participants/delete-multiple', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: allIds }),
  }).catch(() => {});
}

// --- MOTOR DE SINCRONIZAÇÃO EM TEMPO REAL MULTI-DISPOSITIVO ---

export async function syncWithServer(): Promise<void> {
  try {
    // Sincroniza qualquer participante salvo em modo offline previamente
    await flushOfflineQueue();

    const timestamp = Date.now();
    const [partRes, setRes, evtRes, delRes] = await Promise.all([
      fetch(`/api/participants?_t=${timestamp}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
        credentials: 'include',
      }),
      fetch(`/api/company-settings?_t=${timestamp}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
        credentials: 'include',
      }),
      fetch(`/api/events-list?_t=${timestamp}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
        credentials: 'include',
      }),
      fetch(`/api/deleted-participants?_t=${timestamp}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
        credentials: 'include',
      }).catch(() => null),
    ]);

    // Atualiza tombstones com dados do servidor central
    if (delRes && delRes.ok) {
      const serverDeletedIds: string[] = await delRes.json().catch(() => []);
      if (Array.isArray(serverDeletedIds) && serverDeletedIds.length > 0) {
        recordDeletedParticipantIds(serverDeletedIds);
      }
    }

    if (partRes.ok) {
      const serverParts: Participant[] = await partRes.json();
      if (Array.isArray(serverParts)) {
        const localParts = getStoredParticipants();
        const { merged, newForServer, addedCount, hasAttendanceChanges } = mergeParticipantLists(localParts, serverParts);

        saveParticipants(merged, false);

        // Se tínhamos participantes cadastrados localmente que faltam no servidor (e NÃO foram excluídos), envia
        if (newForServer.length > 0) {
          fetch('/api/participants/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ participants: newForServer }),
          }).catch((err) => console.warn('Erro ao sincronizar participantes locais para o servidor:', err));
        }

        if (addedCount > 0 || hasAttendanceChanges || merged.length !== localParts.length) {
          window.dispatchEvent(new Event('participants-updated'));
        }
      }
    }

    if (setRes.ok) {
      const serverSettings = await setRes.json();
      if (serverSettings && typeof serverSettings === 'object') {
        localStorage.setItem(COMPANY_KEY, JSON.stringify(serverSettings));
        window.dispatchEvent(new CustomEvent('company-settings-updated', { detail: serverSettings }));
      }
    }

    if (evtRes.ok) {
      const serverEvents = await evtRes.json();
      if (Array.isArray(serverEvents) && serverEvents.length > 0) {
        localStorage.setItem(EVENTS_KEY, JSON.stringify(serverEvents));
        window.dispatchEvent(new CustomEvent('events-updated', { detail: serverEvents }));
      }
    }

    // Sincronização em nuvem cruzada se configurada nas preferências
    const destinations = getPeerCloudDestinations();
    if (destinations.length > 0) {

      const localDeletedIds = Array.from(getDeletedParticipantIds());

      for (const destUrl of destinations) {
        try {
          // 1. Propaga IDs excluídos para a outra nuvem para garantir paridade de exclusão
          if (localDeletedIds.length > 0) {
            fetch(`${destUrl}/api/participants/delete-multiple`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids: localDeletedIds }),
            }).catch(() => {});
          }

          // 2. Consulta IDs excluídos na outra nuvem
          const cloudDelRes = await fetch(`${destUrl}/api/deleted-participants?_t=${timestamp}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
          }).catch(() => null);

          if (cloudDelRes && cloudDelRes.ok) {
            const destDeleted: string[] = await cloudDelRes.json().catch(() => []);
            if (Array.isArray(destDeleted) && destDeleted.length > 0) {
              recordDeletedParticipantIds(destDeleted);
            }
          }

          // 3. Consulta participantes na outra nuvem
          const cloudRes = await fetch(`${destUrl}/api/participants?_t=${timestamp}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
          });
          if (cloudRes.ok) {
            const cloudParts: Participant[] = await cloudRes.json();
            if (Array.isArray(cloudParts)) {
              const currentLocal = getStoredParticipants();
              const { merged, newForServer, addedCount, hasAttendanceChanges } = mergeParticipantLists(currentLocal, cloudParts);

              if (addedCount > 0 || hasAttendanceChanges || merged.length !== currentLocal.length) {
                saveParticipants(merged);
              }

              // Participantes locais que faltam na nuvem de destino (sem incluir excluídos)
              const missingInCloud = merged.filter(
                (lp) => !cloudParts.some((cp) => cp.id === lp.id || (cp.registrationNumber === lp.registrationNumber && (cp.eventId || 'event_1') === (lp.eventId || 'event_1')))
              );
              if (missingInCloud.length > 0) {
                fetch(`${destUrl}/api/participants/batch`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ participants: missingInCloud }),
                }).catch(() => {});
              }

              // Participantes da nuvem que faltam no servidor local
              if (newForServer.length > 0) {
                fetch('/api/participants/batch', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ participants: newForServer }),
                }).catch(() => {});

                newForServer.forEach((p) => {
                  window.dispatchEvent(new CustomEvent('participant-received', { detail: p }));
                });
              }

              // Sincronização bidirecional de dados do participante e status de presença (Presente e Ausente)
              let hasChangesInSync = false;
              cloudParts.forEach((cp) => {
                const target = merged.find((p) => p.id === cp.id || (p.registrationNumber === cp.registrationNumber && (p.eventId || 'event_1') === (cp.eventId || 'event_1')));
                if (target) {
                  // Sincroniza atualizações de cadastro (nome, empresa, matrícula)
                  if (cp.fullName && cp.fullName !== target.fullName) {
                    target.fullName = cp.fullName;
                    hasChangesInSync = true;
                  }
                  if (cp.company && cp.company !== target.company) {
                    target.company = cp.company;
                    hasChangesInSync = true;
                  }
                  if (cp.registrationNumber && cp.registrationNumber !== target.registrationNumber) {
                    target.registrationNumber = cp.registrationNumber;
                    hasChangesInSync = true;
                  }

                  // Sincroniza status de presença (Presente e Ausente)
                  if (typeof cp.attended === 'boolean' && target.attended !== cp.attended) {
                    const cpTime = cp.attendanceUpdatedAt ? new Date(cp.attendanceUpdatedAt).getTime() : 0;
                    const targetTime = target.attendanceUpdatedAt ? new Date(target.attendanceUpdatedAt).getTime() : 0;
                    if (cpTime > targetTime || (!target.attendanceUpdatedAt && cp.attendanceUpdatedAt)) {
                      target.attended = cp.attended;
                      target.attendedAt = cp.attended ? (cp.attendedAt || new Date().toISOString()) : null;
                      target.attendanceUpdatedAt = cp.attendanceUpdatedAt || new Date().toISOString();
                      hasChangesInSync = true;

                      fetch('/api/participants/attendance', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          id: target.id,
                          attended: target.attended,
                          attendedAt: target.attendedAt,
                          attendanceUpdatedAt: target.attendanceUpdatedAt,
                        }),
                      }).catch(() => {});
                    }
                  }
                }
              });

              if (hasChangesInSync) {
                saveParticipants(merged);
                window.dispatchEvent(new Event('participants-updated'));
              }
            }
          }
        } catch {
          // Ponte com nuvem externa silenciosa
        }
      }
    }

    setSyncStatus('connected');
  } catch (err) {
    console.warn('Não foi possível sincronizar com o servidor central:', err);
    setSyncStatus('offline');
  }
}

// Inicializa a conexão SSE e o polling de redundância
let isInitialized = false;

export function initMultiDeviceSync(): () => void {
  if (typeof window === 'undefined' || isInitialized) {
    return () => {};
  }
  isInitialized = true;

  // 1. Sincroniza imediatamente ao abrir a página
  syncWithServer();

  // 2. Conecta ao SSE (/api/events) para receber cadastros, presenças e exclusões em tempo real (< 100ms)
  let eventSource: EventSource | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  function connectSSE() {
    try {
      eventSource = new EventSource('/api/events');

      eventSource.onopen = () => {
        setSyncStatus('connected');
      };

      eventSource.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          const { type, data } = payload;

          if (type === 'init' && data) {
            // Registra IDs excluídos conhecidos pelo servidor
            if (Array.isArray(data.deletedIds) && data.deletedIds.length > 0) {
              recordDeletedParticipantIds(data.deletedIds);
            }

            if (Array.isArray(data.participants)) {
              const local = getStoredParticipants();
              const { merged, newForServer, addedCount, hasAttendanceChanges } = mergeParticipantLists(local, data.participants);
              saveParticipants(merged, false);
              if (newForServer.length > 0) {
                fetch('/api/participants/batch', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ participants: newForServer }),
                }).catch(() => {});
              }
              if (addedCount > 0 || hasAttendanceChanges || merged.length !== local.length) {
                window.dispatchEvent(new Event('participants-updated'));
              }
            }
            if (data.settings) {
              localStorage.setItem(COMPANY_KEY, JSON.stringify(data.settings));
              window.dispatchEvent(
                new CustomEvent('company-settings-updated', { detail: data.settings })
              );
            }
            if (Array.isArray(data.events)) {
              localStorage.setItem(EVENTS_KEY, JSON.stringify(data.events));
              window.dispatchEvent(new CustomEvent('events-updated', { detail: data.events }));
            }
          } else if (type === 'participant_added' && data) {
            const deleted = getDeletedParticipantIds();
            if (deleted.has(data.id)) return; // Ignora se o ID já foi excluído neste cliente

            const current = getStoredParticipants();
            if (!current.some((p) => p.id === data.id)) {
              saveParticipants([data, ...current]);
              window.dispatchEvent(new CustomEvent('participant-received', { detail: data }));
              window.dispatchEvent(new Event('participants-updated'));
            }
          } else if (type === 'attendance_updated' && data) {
            const deleted = getDeletedParticipantIds();
            if (deleted.has(data.id)) return;

            const current = getStoredParticipants();
            const exists = current.some((p) => p.id === data.id);
            const updated = exists ? current.map((p) => (p.id === data.id ? data : p)) : [data, ...current];
            saveParticipants(updated);
            window.dispatchEvent(new CustomEvent('participant-updated', { detail: data }));
            window.dispatchEvent(new Event('participants-updated'));
            if (data.attended) {
              window.dispatchEvent(
                new CustomEvent('attendance-confirmed', {
                  detail: { participant: data, timestamp: data.attendedAt, synced: true },
                })
              );
            } else {
              window.dispatchEvent(
                new CustomEvent('attendance-absent', {
                  detail: { participant: data, timestamp: data.attendanceUpdatedAt || new Date().toISOString(), synced: true },
                })
              );
            }
          } else if (type === 'attendance_confirmed' && data) {
            if (data.participant) {
              const deleted = getDeletedParticipantIds();
              if (deleted.has(data.participant.id)) return;

              const current = getStoredParticipants();
              const pData = data.participant;
              const exists = current.some((p) => p.id === pData.id);
              const updated = exists ? current.map((p) => (p.id === pData.id ? pData : p)) : [pData, ...current];
              saveParticipants(updated);
              window.dispatchEvent(new CustomEvent('attendance-confirmed', { detail: data }));
              window.dispatchEvent(new Event('participants-updated'));
            }
          } else if (type === 'attendance_absent' && data) {
            if (data.participant) {
              const deleted = getDeletedParticipantIds();
              if (deleted.has(data.participant.id)) return;

              const current = getStoredParticipants();
              const pData = data.participant;
              const exists = current.some((p) => p.id === pData.id);
              const updated = exists ? current.map((p) => (p.id === pData.id ? pData : p)) : [pData, ...current];
              saveParticipants(updated);
              window.dispatchEvent(new CustomEvent('attendance-absent', { detail: data }));
              window.dispatchEvent(new Event('participants-updated'));
            }
          } else if (type === 'attendance_batch_updated' && data) {
            if (Array.isArray(data.participants)) {
              const deleted = getDeletedParticipantIds();
              const current = getStoredParticipants();
              const partMap = new Map<string, Participant>(data.participants.map((p: any) => [p.id, p]));
              const updated = current.map((p) => {
                if (partMap.has(p.id) && !deleted.has(p.id)) {
                  return partMap.get(p.id)!;
                }
                return p;
              });
              // Adiciona participantes do lote que ainda não estavam no cache local
              data.participants.forEach((p: any) => {
                if (!deleted.has(p.id) && !updated.some((u) => u.id === p.id)) {
                  updated.unshift(p);
                }
              });
              saveParticipants(updated);
              window.dispatchEvent(new Event('participants-updated'));
            }
          } else if (type === 'participant_updated' && data) {
            const deleted = getDeletedParticipantIds();
            if (deleted.has(data.id)) return;

            const current = getStoredParticipants();
            const exists = current.some((p) => p.id === data.id);
            const updated = exists ? current.map((p) => (p.id === data.id ? data : p)) : [data, ...current];
            saveParticipants(updated);
            window.dispatchEvent(new CustomEvent('participant-updated', { detail: data }));
            window.dispatchEvent(new Event('participants-updated'));

            if (typeof data.attended === 'boolean') {
              if (data.attended) {
                window.dispatchEvent(
                  new CustomEvent('attendance-confirmed', {
                    detail: { participant: data, timestamp: data.attendedAt || new Date().toISOString(), synced: true },
                  })
                );
              } else {
                window.dispatchEvent(
                  new CustomEvent('attendance-absent', {
                    detail: { participant: data, timestamp: data.attendanceUpdatedAt || new Date().toISOString(), synced: true },
                  })
                );
              }
            }
          } else if (type === 'participant_deleted' && data) {
            // Registra nos tombstones e remove da lista local
            recordDeletedParticipantIds([data]);
            const current = getStoredParticipants();
            const filtered = current.filter((p) => p.id !== data);
            saveParticipants(filtered);
            window.dispatchEvent(new Event('participants-updated'));
          } else if (type === 'multiple_deleted' && Array.isArray(data)) {
            // Registra múltiplos nos tombstones e remove da lista local
            recordDeletedParticipantIds(data);
            const current = getStoredParticipants();
            const set = new Set(data);
            const filtered = current.filter((p) => !set.has(p.id));
            saveParticipants(filtered);
            window.dispatchEvent(new Event('participants-updated'));
          } else if (type === 'settings_updated' && data) {
            localStorage.setItem(COMPANY_KEY, JSON.stringify(data));
            window.dispatchEvent(
              new CustomEvent('company-settings-updated', { detail: data })
            );
          } else if (type === 'events_updated' && Array.isArray(data)) {
            localStorage.setItem(EVENTS_KEY, JSON.stringify(data));
            window.dispatchEvent(new CustomEvent('events-updated', { detail: data }));
          } else if (type === 'reset' && Array.isArray(data)) {
            saveParticipants(data);
            window.dispatchEvent(new Event('participants-updated'));
          }
        } catch (err) {
          console.error('Erro ao processar evento SSE:', err);
        }
      };

      eventSource.onerror = () => {
        setSyncStatus('connecting');
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        // Reconexão automática em 4 segundos
        if (!reconnectTimeout) {
          reconnectTimeout = setTimeout(() => {
            reconnectTimeout = null;
            connectSSE();
          }, 4000);
        }
      };
    } catch {
      setSyncStatus('offline');
    }
  }

  connectSSE();

  // 3. Heartbeat Polling a cada 3 segundos com anti-cache para celulares 4G/5G
  let pollCycleCount = 0;
  const pollInterval = setInterval(() => {
    pollCycleCount++;
    fetch(`/api/participants?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((serverList) => {
        if (Array.isArray(serverList)) {
          const local = getStoredParticipants();
          const { merged, newForServer, addedCount, hasAttendanceChanges } = mergeParticipantLists(local, serverList);
          
          if (addedCount > 0 || hasAttendanceChanges || merged.length !== local.length) {
            saveParticipants(merged);
          }

          if (newForServer.length > 0) {
            fetch('/api/participants/batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ participants: newForServer }),
            }).catch(() => {});
          }

          // Detecta se existem novos participantes válidos recebidos no servidor
          const newItems = serverList.filter((sp) => !local.some((lp) => lp.id === sp.id));
          if (newItems.length > 0) {
            newItems.forEach((p) => {
              window.dispatchEvent(new CustomEvent('participant-received', { detail: p }));
            });
          }
          setSyncStatus('connected');
        }

        // Se houver dados acumulados offline, descarrega a fila com o servidor
        if (getPendingOfflineCount() > 0) {
          flushOfflineQueue();
        }

        // A cada 3 ciclos (~9 segundos), roda syncWithServer completo para reconciliação multi-origem
        if (pollCycleCount % 3 === 0 && typeof window !== 'undefined') {
          syncWithServer();
        }
      })
      .catch(() => {
        // não bloqueia
      });
  }, 3000);

  // Sincroniza ao voltar a ter internet ou focar na janela (inclusive tela do celular desbloqueada)
  const handleResume = () => {
    setSyncStatus('connecting');
    flushOfflineQueue();
    syncWithServer();
    if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
      connectSSE();
    }
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      handleResume();
    }
  };

  window.addEventListener('online', handleResume);
  window.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pageshow', handleResume);
  window.addEventListener('focus', handleResume);

  return () => {
    if (eventSource) eventSource.close();
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    clearInterval(pollInterval);
    window.removeEventListener('online', handleResume);
    window.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pageshow', handleResume);
    window.removeEventListener('focus', handleResume);
    isInitialized = false;
  };
}

/**
 * Ordena participantes com precisão alfabética brasileira (A-Z ou Z-A) por Nome ou por Empresa.
 */
export function sortParticipantsAlphabetically(
  participants: Participant[],
  by: 'name' | 'company' | 'registration' | 'recent' = 'name',
  direction: 'asc' | 'desc' = 'asc'
): Participant[] {
  return [...participants].sort((a, b) => {
    if (by === 'name') {
      const cmp = (a?.fullName || '').localeCompare(b?.fullName || '', 'pt-BR', { sensitivity: 'base' });
      return direction === 'asc' ? cmp : -cmp;
    }
    if (by === 'company') {
      const cmpCompany = (a?.company || '').localeCompare(b?.company || '', 'pt-BR', { sensitivity: 'base' });
      if (cmpCompany !== 0) {
        return direction === 'asc' ? cmpCompany : -cmpCompany;
      }
      // Se da mesma empresa, desempata em ordem alfabética de Nome
      return (a?.fullName || '').localeCompare(b?.fullName || '', 'pt-BR', { sensitivity: 'base' });
    }
    if (by === 'registration') {
      const numA = parseInt(String(a?.registrationNumber || '0').replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(String(b?.registrationNumber || '0').replace(/\D/g, ''), 10) || 0;
      return direction === 'asc' ? numA - numB : numB - numA;
    }
    // recent
    const timeA = new Date(a?.createdAt || 0).getTime();
    const timeB = new Date(b?.createdAt || 0).getTime();
    return direction === 'asc' ? timeA - timeB : timeB - timeA;
  });
}

/**
 * Retorna todas as empresas cadastradas sem duplicidade, rigorosamente em ordem alfabética A-Z.
 */
export function getRegisteredCompaniesAlphabetical(): string[] {
  const participants = getStoredParticipants();
  const set = new Set<string>();
  participants.forEach((p) => {
    const c = (p?.company || '').trim();
    if (c && c.toLowerCase() !== 'não informada' && c.toLowerCase() !== 'nao informada') {
      set.add(c);
    }
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
}

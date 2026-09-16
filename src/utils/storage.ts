import { Participant, CompanySettings, EventItem } from '../types';
import { getEventRegistrationStatus } from './eventHelper';

const STORAGE_KEY = 'qr_event_participants_v1';
const COMPANY_KEY = 'qr_event_company_settings_v1';
const EVENTS_KEY = 'qr_events_list_v1';

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: 'Minha Empresa',
  eventName: 'Evento Corporativo & Treinamento 2026',
  logoUrl: null,
  adminUsername: 'admin',
  adminPassword: '1234',
  fontFamily: 'inter',
  layoutScale: 'normal',
  publicAppUrl: 'https://ais-pre-rihuh2lzyxgzrc2qmh3tyj-161635627789.us-east1.run.app',
  creatorName: 'Jovany Reis',
  creatorSignature: 'Desenvolvido por Jovany Reis • Sistema de Credenciamento & Inscrições',
};

export const INITIAL_EVENTS: EventItem[] = [
  {
    id: 'event_1',
    name: 'Evento Corporativo & Treinamento 2026',
    date: '2026-09-20',
    location: 'Auditório Principal - Sede',
    description: 'Treinamento de integração corporativa e apresentação de metas estratégicas.',
    registrationStartDate: '2026-09-01T08:00',
    registrationEndDate: '2026-09-20T18:00',
    active: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
  },
  {
    id: 'event_2',
    name: 'Workshop de Tecnologia & Inovação',
    date: '2026-10-05',
    location: 'Sala de Conferências A',
    description: 'Capacitação prática em ferramentas digitais e inteligência artificial aplicada.',
    registrationStartDate: '2026-09-10T09:00',
    registrationEndDate: '2026-10-04T23:59',
    active: false,
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
  },
];

export const INITIAL_PARTICIPANTS: Participant[] = [
  {
    id: 'part_1',
    fullName: 'Carlos Eduardo Silva',
    registrationNumber: '1001',
    company: 'Tech Solutions Brasil',
    eventId: 'event_1',
    eventName: 'Evento Corporativo & Treinamento 2026',
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
    eventName: 'Evento Corporativo & Treinamento 2026',
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
    eventName: 'Evento Corporativo & Treinamento 2026',
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    attended: true,
    attendedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: 'part_4',
    fullName: 'Juliana Beatriz Santos',
    registrationNumber: '1004',
    company: 'Global Logística',
    eventId: 'event_2',
    eventName: 'Workshop de Tecnologia & Inovação',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    attended: false,
    attendedAt: null,
  },
  {
    id: 'part_5',
    fullName: 'Lucas Gabriel Oliveira',
    registrationNumber: '1005',
    company: 'Nexus Consultoria',
    eventId: 'event_2',
    eventName: 'Workshop de Tecnologia & Inovação',
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
    return {
      ...DEFAULT_COMPANY_SETTINGS,
      adminUsername: parsed.adminUsername || 'admin',
      ...parsed,
    };
  } catch (e) {
    console.error('Erro ao obter configurações da empresa:', e);
    return DEFAULT_COMPANY_SETTINGS;
  }
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

export function verifyAdminPassword(password: string): boolean {
  const settings = getCompanySettings();
  const validPassword = settings.adminPassword || '1234';
  return password.trim() === validPassword.trim();
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  const settings = getCompanySettings();
  const validUser = (settings.adminUsername || 'admin').trim().toLowerCase();
  const validPassword = (settings.adminPassword || '1234').trim();

  const inputUser = username.trim().toLowerCase();
  const inputPass = password.trim();

  const userMatches = !inputUser || inputUser === validUser || inputUser === 'admin';
  return userMatches && inputPass === validPassword;
}

export function registerAdminCredentials(username: string, password: string): { success: boolean; error?: string } {
  const cleanUser = username.trim();
  const cleanPass = password.trim();

  if (!cleanUser || cleanUser.length < 3) {
    return { success: false, error: 'O login (usuário) deve conter pelo menos 3 caracteres.' };
  }

  if (!cleanPass || cleanPass.length < 3) {
    return { success: false, error: 'A senha deve conter pelo menos 3 caracteres.' };
  }

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
      return parsed;
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
  const exists = events.some((e) => e.name.toLowerCase() === trimmedName.toLowerCase());
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

export function getStoredParticipants(): Participant[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PARTICIPANTS));
      return INITIAL_PARTICIPANTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_PARTICIPANTS;
  } catch (err) {
    console.error('Erro ao ler participantes do localStorage:', err);
    return INITIAL_PARTICIPANTS;
  }
}

export function saveParticipants(participants: Participant[], broadcastLocal = true): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(participants));
    if (broadcastLocal) {
      window.dispatchEvent(new Event('participants-updated'));
    }
  } catch (err) {
    console.error('Erro ao salvar participantes no cache:', err);
  }
}

// Chave para fila de participantes salvos durante oscilações de rede móvel
const OFFLINE_QUEUE_KEY = 'qr_offline_participants_queue_v1';

function getOfflineQueue(): Participant[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function queueOfflineParticipant(participant: Participant): void {
  try {
    const q = getOfflineQueue();
    if (!q.some((p) => p.id === participant.id)) {
      q.push(participant);
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q));
    }
  } catch (err) {
    console.warn('Erro ao enfileirar participante offline:', err);
  }
}

export async function flushOfflineQueue(): Promise<void> {
  const q = getOfflineQueue();
  if (!q || q.length === 0) return;

  try {
    const res = await fetch('/api/participants/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ participants: q }),
    });

    if (res.ok) {
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
      console.log('[SYNC] Fila offline sincronizada com sucesso com o servidor central.');
    }
  } catch (err) {
    console.warn('Fila offline aguardando conexão estável:', err);
  }
}

// Cadastrar novo participante (suporta envio síncrono e assíncrono de qualquer celular em qualquer rede 4G/5G/Wi-Fi)
export async function addParticipant(data: {
  fullName: string;
  registrationNumber: string;
  company: string;
  eventId?: string;
  eventName?: string;
}): Promise<{ success: boolean; participant?: Participant; error?: string }> {
  const current = getStoredParticipants();

  const trimmedMatricula = data.registrationNumber.replace(/\D/g, '').trim();
  const trimmedName = data.fullName.trim();
  const trimmedCompany = data.company.trim();

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
  const targetEventName = data.eventName || matchedEvent?.name || 'Evento Corporativo';

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

  // Validação prévia de duplicação local (no mesmo evento)
  const exists = current.some(
    (p) => 
      p.registrationNumber.toLowerCase() === trimmedMatricula.toLowerCase() &&
      (!p.eventId || p.eventId === targetEventId)
  );

  if (exists) {
    return {
      success: false,
      error: `Já existe um participante cadastrado com o número de matrícula "${trimmedMatricula}" neste evento.`,
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
  const trimmedName = data.fullName.trim();
  const trimmedMatricula = data.registrationNumber.replace(/\D/g, '').trim();
  const trimmedCompany = data.company.trim();

  if (!trimmedName) {
    return { success: false, error: 'O nome completo é obrigatório.' };
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

  // Verifica duplicação de matrícula em outro participante no mesmo evento
  const duplicate = current.some(
    (p) =>
      p.id !== id &&
      p.registrationNumber.toLowerCase() === trimmedMatricula.toLowerCase() &&
      (!p.eventId || p.eventId === targetEventId)
  );

  if (duplicate) {
    return {
      success: false,
      error: `A matrícula "${trimmedMatricula}" já pertence a outro participante cadastrado neste evento.`,
    };
  }

  const newAttended = data.attended !== undefined ? data.attended : existing.attended;
  const newAttendedAt =
    newAttended && !existing.attended
      ? new Date().toISOString()
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
  };

  // Salva no armazenamento local
  const updatedList = current.map((p) => (p.id === id ? updatedParticipant : p));
  saveParticipants(updatedList);

  // Envia atualização para o servidor central
  try {
    const res = await fetch(`/api/participants/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      credentials: 'include',
      body: JSON.stringify({
        fullName: trimmedName,
        registrationNumber: trimmedMatricula,
        company: trimmedCompany,
        eventId: targetEventId,
        eventName: targetEventName,
        attended: newAttended,
      }),
    });

    if (res.ok) {
      const serverData = await res.json();
      const confirmed: Participant = serverData.participant || updatedParticipant;
      setSyncStatus('connected');
      return { success: true, participant: confirmed };
    } else {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.error || 'Erro ao atualizar participante no servidor.' };
    }
  } catch (err) {
    console.warn('Servidor indisponível para atualização imediata, salvo localmente:', err);
    setSyncStatus('offline');
    return { success: true, participant: updatedParticipant };
  }
}

export function deleteParticipant(id: string): boolean {
  const current = getStoredParticipants();
  const updated = current.filter((p) => p.id !== id);
  if (updated.length !== current.length) {
    saveParticipants(updated);

    fetch(`/api/participants/${id}`, { method: 'DELETE' })
      .then(() => setSyncStatus('connected'))
      .catch(() => setSyncStatus('offline'));

    return true;
  }
  return false;
}

export function deleteMultipleParticipants(ids: string[]): number {
  if (!ids || ids.length === 0) return 0;
  const current = getStoredParticipants();
  const idSet = new Set(ids);
  const updated = current.filter((p) => !idSet.has(p.id));
  const removedCount = current.length - updated.length;
  if (removedCount > 0) {
    saveParticipants(updated);

    fetch('/api/participants/delete-multiple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
      .then(() => setSyncStatus('connected'))
      .catch(() => setSyncStatus('offline'));
  }
  return removedCount;
}

export function toggleAttendance(id: string): { participant: Participant | null; attended: boolean } {
  const current = getStoredParticipants();
  let updatedParticipant: Participant | null = null;
  let newAttended = false;

  const updated = current.map((p) => {
    if (p.id === id) {
      newAttended = !p.attended;
      updatedParticipant = {
        ...p,
        attended: newAttended,
        attendedAt: newAttended ? new Date().toISOString() : null,
      };
      return updatedParticipant;
    }
    return p;
  });

  saveParticipants(updated);

  // Sincroniza com o servidor central
  fetch(`/api/participants/${id}/toggle`, { method: 'POST' })
    .then(() => setSyncStatus('connected'))
    .catch(() => setSyncStatus('offline'));

  return { participant: updatedParticipant, attended: newAttended };
}

export function markAttendanceByCode(codeOrMatricula: string): {
  status: 'success' | 'already_checked' | 'not_found';
  participant?: Participant;
  message: string;
} {
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
    } catch {
      // ignora
    }
  }

  const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normInput = normalize(cleanInput);

  const participant = current.find((p) => {
    if (targetId && p.id === targetId) return true;
    if (p.id === cleanInput) return true;

    if (targetMatricula) {
      if (p.registrationNumber.toLowerCase() === targetMatricula.toLowerCase()) return true;
      if (normalize(p.registrationNumber) === normalize(targetMatricula)) return true;
    }

    if (targetName && p.fullName.toLowerCase() === targetName.toLowerCase()) return true;

    if (p.registrationNumber.toLowerCase() === cleanInput.toLowerCase()) return true;
    if (normMatricula(p.registrationNumber) === normInput) return true;

    const digitsOnly = cleanInput.replace(/\D/g, "");
    const matriculaDigits = p.registrationNumber.replace(/\D/g, "");
    if (digitsOnly && matriculaDigits && digitsOnly.length >= 3 && digitsOnly === matriculaDigits) {
      return true;
    }

    if (cleanInput.includes(p.registrationNumber) || cleanInput.includes(p.id)) {
      return true;
    }

    return false;
  });

  function normMatricula(val: string) {
    return val.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  if (!participant) {
    // Tenta consultar o servidor se por acaso outro celular acabou de cadastrar e ainda não chegou
    fetch('/api/participants/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codeOrMatricula: cleanInput }),
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data.participant) {
            const fresh = getStoredParticipants();
            const exists = fresh.some((p) => p.id === data.participant.id);
            const merged = exists
              ? fresh.map((p) => (p.id === data.participant.id ? data.participant : p))
              : [data.participant, ...fresh];
            saveParticipants(merged);
          }
        }
      })
      .catch(() => {});

    const displayCode = cleanInput.length > 50 ? `${cleanInput.substring(0, 47)}...` : cleanInput;
    return {
      status: 'not_found',
      message: `Participante não encontrado com o código: "${displayCode}". Verifique se o participante está cadastrado.`,
    };
  }

  if (participant.attended) {
    const formattedDate = participant.attendedAt
      ? new Date(participant.attendedAt).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : '';
    return {
      status: 'already_checked',
      participant,
      message: `Presença já confirmada anteriormente às ${formattedDate}!`,
    };
  }

  // Marca presença no cache local
  const now = new Date().toISOString();
  let confirmedParticipant: Participant | undefined;

  const updated = current.map((p) => {
    if (p.id === participant.id) {
      confirmedParticipant = {
        ...p,
        attended: true,
        attendedAt: now,
      };
      return confirmedParticipant;
    }
    return p;
  });

  saveParticipants(updated);

  // Sincroniza presença com o servidor central para atualizar portaria e admin
  fetch('/api/participants/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codeOrMatricula: cleanInput }),
  })
    .then(() => setSyncStatus('connected'))
    .catch(() => setSyncStatus('offline'));

  return {
    status: 'success',
    participant: confirmedParticipant,
    message: 'Presença confirmada com sucesso!',
  };
}

export function resetToDemoData(): void {
  saveParticipants(INITIAL_PARTICIPANTS);
  fetch('/api/participants/reset', { method: 'POST' })
    .then(() => setSyncStatus('connected'))
    .catch(() => setSyncStatus('offline'));
}

export function clearAllParticipants(): void {
  saveParticipants([]);
  fetch('/api/participants/delete-multiple', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: getStoredParticipants().map((p) => p.id) }),
  }).catch(() => {});
}

// --- MOTOR DE SINCRONIZAÇÃO EM TEMPO REAL MULTI-DISPOSITIVO ---

export async function syncWithServer(): Promise<void> {
  try {
    // Sincroniza qualquer participante salvo em modo offline previamente
    await flushOfflineQueue();

    const timestamp = Date.now();
    const [partRes, setRes, evtRes] = await Promise.all([
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
    ]);

    if (partRes.ok) {
      const serverParts = await partRes.json();
      if (Array.isArray(serverParts)) {
        saveParticipants(serverParts);
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

  // 2. Conecta ao SSE (/api/events) para receber cadastros e presenças em tempo real (< 100ms)
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
            if (Array.isArray(data.participants)) {
              saveParticipants(data.participants);
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
            const current = getStoredParticipants();
            if (!current.some((p) => p.id === data.id)) {
              saveParticipants([data, ...current]);
              // Dispara evento customizado para alertar componentes e painel de controle
              window.dispatchEvent(new CustomEvent('participant-received', { detail: data }));
            }
          } else if (type === 'attendance_updated' && data) {
            const current = getStoredParticipants();
            const updated = current.map((p) => (p.id === data.id ? data : p));
            saveParticipants(updated);
          } else if (type === 'participant_updated' && data) {
            const current = getStoredParticipants();
            const updated = current.map((p) => (p.id === data.id ? data : p));
            saveParticipants(updated);
            window.dispatchEvent(new CustomEvent('participant-updated', { detail: data }));
          } else if (type === 'participant_deleted' && data) {
            const current = getStoredParticipants();
            saveParticipants(current.filter((p) => p.id !== data));
          } else if (type === 'multiple_deleted' && Array.isArray(data)) {
            const current = getStoredParticipants();
            const set = new Set(data);
            saveParticipants(current.filter((p) => !set.has(p.id)));
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

  // 3. Heartbeat Polling a cada 3 segundos com anti-cache para garantir atualização em celulares 4G/5G
  const pollInterval = setInterval(() => {
    fetch(`/api/participants?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((serverList) => {
        if (Array.isArray(serverList)) {
          const local = getStoredParticipants();
          // Detecta se existem novos participantes recebidos no servidor
          const newItems = serverList.filter((sp) => !local.some((lp) => lp.id === sp.id));
          if (newItems.length > 0) {
            newItems.forEach((p) => {
              window.dispatchEvent(new CustomEvent('participant-received', { detail: p }));
            });
          }

          // Compara tamanho ou timestamps para sincronizar se houver novidade
          if (
            serverList.length !== local.length ||
            JSON.stringify(serverList.map((p) => `${p.id}:${p.attended}`)) !==
              JSON.stringify(local.map((p) => `${p.id}:${p.attended}`))
          ) {
            saveParticipants(serverList);
          }
          setSyncStatus('connected');
        }
      })
      .catch(() => {
        // não bloqueia
      });
  }, 3000);

  // Sincroniza ao voltar a ter internet ou focar na janela
  const handleOnline = () => {
    setSyncStatus('connecting');
    syncWithServer();
    if (!eventSource) connectSSE();
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      syncWithServer();
    }
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    if (eventSource) eventSource.close();
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    clearInterval(pollInterval);
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('visibilitychange', handleVisibilityChange);
    isInitialized = false;
  };
}

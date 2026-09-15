import { Participant, CompanySettings } from '../types';

const STORAGE_KEY = 'qr_event_participants_v1';
const COMPANY_KEY = 'qr_event_company_settings_v1';

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: 'Minha Empresa',
  eventName: 'Evento Corporativo & Treinamento',
  logoUrl: null,
  adminUsername: 'admin',
  adminPassword: '1234',
};

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

  // Permite login se o usuário for o configurado (ou 'admin' por compatibilidade se ainda não alterado) e a senha bater
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

const INITIAL_PARTICIPANTS: Participant[] = [
  {
    id: 'part_1',
    fullName: 'Carlos Eduardo Silva',
    registrationNumber: 'MAT-1001',
    company: 'Tech Solutions Brasil',
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    attended: true,
    attendedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'part_2',
    fullName: 'Mariana Albuquerque Costa',
    registrationNumber: 'MAT-1002',
    company: 'Inovação Digital Ltda',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    attended: false,
    attendedAt: null,
  },
  {
    id: 'part_3',
    fullName: 'Roberto Fernando Mendes',
    registrationNumber: 'MAT-1003',
    company: 'PetroSoft Engenharia',
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    attended: true,
    attendedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: 'part_4',
    fullName: 'Juliana Beatriz Santos',
    registrationNumber: 'MAT-1004',
    company: 'Global Logística',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    attended: false,
    attendedAt: null,
  },
  {
    id: 'part_5',
    fullName: 'Lucas Gabriel Oliveira',
    registrationNumber: 'MAT-1005',
    company: 'Nexus Consultoria',
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    attended: false,
    attendedAt: null,
  }
];

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

export function saveParticipants(participants: Participant[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(participants));
    window.dispatchEvent(new Event('participants-updated'));
  } catch (err) {
    console.error('Erro ao salvar participantes:', err);
  }
}

export function addParticipant(data: {
  fullName: string;
  registrationNumber: string;
  company: string;
}): { success: boolean; participant?: Participant; error?: string } {
  const current = getStoredParticipants();
  
  const trimmedMatricula = data.registrationNumber.trim();
  const trimmedName = data.fullName.trim();
  const trimmedCompany = data.company.trim();

  // Verifica se matrícula já existe
  const exists = current.some(
    p => p.registrationNumber.toLowerCase() === trimmedMatricula.toLowerCase()
  );

  if (exists) {
    return {
      success: false,
      error: `Já existe um participante cadastrado com o número de matrícula "${trimmedMatricula}".`,
    };
  }

  const newParticipant: Participant = {
    id: `part_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    fullName: trimmedName,
    registrationNumber: trimmedMatricula,
    company: trimmedCompany,
    createdAt: new Date().toISOString(),
    attended: false,
    attendedAt: null,
  };

  const updated = [newParticipant, ...current];
  saveParticipants(updated);

  return { success: true, participant: newParticipant };
}

export function deleteParticipant(id: string): boolean {
  const current = getStoredParticipants();
  const updated = current.filter(p => p.id !== id);
  if (updated.length !== current.length) {
    saveParticipants(updated);
    return true;
  }
  return false;
}

export function deleteMultipleParticipants(ids: string[]): number {
  if (!ids || ids.length === 0) return 0;
  const current = getStoredParticipants();
  const idSet = new Set(ids);
  const updated = current.filter(p => !idSet.has(p.id));
  const removedCount = current.length - updated.length;
  if (removedCount > 0) {
    saveParticipants(updated);
  }
  return removedCount;
}

export function toggleAttendance(id: string): { participant: Participant | null; attended: boolean } {
  const current = getStoredParticipants();
  let updatedParticipant: Participant | null = null;
  let newAttended = false;

  const updated = current.map(p => {
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
  return { participant: updatedParticipant, attended: newAttended };
}

export function markAttendanceByCode(codeOrMatricula: string): {
  status: 'success' | 'already_checked' | 'not_found';
  participant?: Participant;
  message: string;
} {
  const current = getStoredParticipants();
  const cleanInput = codeOrMatricula.trim();

  // O QR Code pode conter JSON do payload ou o ID direto ou o número de matrícula
  let targetId: string | null = null;
  let targetMatricula: string | null = null;

  try {
    if (cleanInput.startsWith('{') && cleanInput.endsWith('}')) {
      const parsed = JSON.parse(cleanInput);
      if (parsed.id) targetId = parsed.id;
      if (parsed.matricula) targetMatricula = parsed.matricula;
    }
  } catch {
    // Não é JSON, tratamos como ID ou matrícula
  }

  const participant = current.find(p => {
    if (targetId && p.id === targetId) return true;
    if (targetMatricula && p.registrationNumber.toLowerCase() === targetMatricula.toLowerCase()) return true;
    if (p.id === cleanInput) return true;
    if (p.registrationNumber.toLowerCase() === cleanInput.toLowerCase()) return true;
    return false;
  });

  if (!participant) {
    return {
      status: 'not_found',
      message: `Participante não encontrado com o código/matrícula: "${cleanInput}".`,
    };
  }

  if (participant.attended) {
    const formattedDate = participant.attendedAt 
      ? new Date(participant.attendedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : '';
    return {
      status: 'already_checked',
      participant,
      message: `Presença já confirmada anteriormente às ${formattedDate}!`,
    };
  }

  // Marca presença agora
  const now = new Date().toISOString();
  let confirmedParticipant: Participant | undefined;

  const updated = current.map(p => {
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

  return {
    status: 'success',
    participant: confirmedParticipant,
    message: 'Presença confirmada com sucesso!',
  };
}

export function resetToDemoData(): void {
  saveParticipants(INITIAL_PARTICIPANTS);
}

export function clearAllParticipants(): void {
  saveParticipants([]);
}

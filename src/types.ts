export interface Participant {
  id: string;
  fullName: string;
  registrationNumber: string; // Número de matrícula
  company: string;           // Empresa
  createdAt: string;         // Data/hora de cadastro ISO
  attended: boolean;         // Presença confirmada?
  attendedAt?: string | null; // Data/hora da confirmação
}

export interface QrPayload {
  app: 'qr-event-checkin';
  id: string;
  matricula: string;
  nome: string;
  empresa: string;
}

export interface CompanySettings {
  companyName: string;
  eventName: string;
  logoUrl: string | null;
  adminUsername?: string;
  adminPassword?: string;
}

export type ActiveTab = 'register' | 'scanner' | 'admin';

export interface ScanResult {
  type: 'success' | 'already_checked' | 'not_found' | 'error';
  message: string;
  participant?: Participant;
  timestamp: string;
}

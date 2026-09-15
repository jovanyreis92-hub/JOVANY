export interface EventItem {
  id: string;
  name: string;
  date: string;
  location?: string;
  description?: string;
  active: boolean;
  createdAt: string;
}

export interface Participant {
  id: string;
  fullName: string;
  registrationNumber: string; // Número de matrícula
  company: string;           // Empresa
  eventId?: string;          // ID do evento associado
  eventName?: string;        // Nome do evento associado
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
  evento?: string;
}

export type LayoutFontFamily = 'inter' | 'poppins' | 'roboto' | 'merriweather' | 'rounded' | 'mono';
export type LayoutScaleSize = 'compact' | 'normal' | 'large' | 'extra-large';

export interface CompanySettings {
  companyName: string;
  eventName: string;
  logoUrl: string | null;
  adminUsername?: string;
  adminPassword?: string;
  fontFamily?: LayoutFontFamily;
  layoutScale?: LayoutScaleSize;
}

export type ActiveTab = 'register' | 'scanner' | 'admin';

export interface ScanResult {
  type: 'success' | 'already_checked' | 'not_found' | 'error';
  message: string;
  participant?: Participant;
  timestamp: string;
}

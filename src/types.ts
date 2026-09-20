export interface EventItem {
  id: string;
  name: string;
  date: string;
  location?: string;
  description?: string;
  registrationStartDate?: string; // Data/hora de início das inscrições (YYYY-MM-DD ou YYYY-MM-DDTHH:mm)
  registrationEndDate?: string;   // Data/hora final de validade das inscrições (prazo de validade)
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
  primaryColor?: string;      // Cor primária do sistema em hex (ex: #0284c7)
  publicAppUrl?: string;
  creatorName?: string;       // Nome do criador
  creatorSignature?: string;  // Assinatura/texto personalizado no rodapé
}

export type ActiveTab = 'register' | 'admin';

export type UserRole = 'admin' | 'operator' | 'coordinator';

export interface UserAccount {
  id: string;
  username: string;          // Login / nome de usuário único
  displayName?: string;      // Nome visível / identificação
  password: string;          // Senha de acesso
  role: UserRole;            // Perfil de acesso
  createdAt: string;         // Data de criação ISO
  lastLoginAt?: string | null; // Data do último login registrado
  active: boolean;           // Status de ativação
}

export interface ScanResult {
  type: 'success' | 'already_checked' | 'not_found' | 'error';
  message: string;
  participant?: Participant;
  timestamp: string;
}

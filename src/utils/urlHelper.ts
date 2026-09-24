import { CompanySettings } from '../types';

export const CURRENT_DEV_APP_URL = 'https://ais-dev-rihuh2lzyxgzrc2qmh3tyj-161635627789.us-east1.run.app';
export const SHARED_CLOUD_APP_URL = 'https://ais-pre-rihuh2lzyxgzrc2qmh3tyj-161635627789.us-east1.run.app';

export interface PublicUrlInfo {
  url: string;
  isConverted: boolean;
  isLocalhost: boolean;
  type: 'live_session' | 'shared_cloud' | 'custom' | 'localhost' | 'production';
  note: string;
}

/**
 * Obtém a URL oficial ativa para compartilhamento do formulário de inscrição.
 * Usa a URL da sessão ativa (onde o servidor e o banco de dados estão rodando em tempo real)
 * para garantir que cadastros feitos em celulares (4G, 5G ou Wi-Fi) cheguem instantaneamente
 * ao painel administrativo.
 */
export function resolvePublicRegistrationUrl(
  companySettings?: Partial<CompanySettings>,
  customOverride?: string
): PublicUrlInfo {
  // 1. Se foi fornecida uma URL customizada informada explicitamente pelo usuário
  const explicitUrl = customOverride?.trim();
  if (explicitUrl) {
    let formatted = explicitUrl;
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = `https://${formatted}`;
    }

    try {
      const parsed = new URL(formatted);
      parsed.searchParams.set('tab', 'register');
      const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';

      return {
        url: parsed.toString(),
        isConverted: false,
        isLocalhost,
        type: isLocalhost ? 'localhost' : 'custom',
        note: isLocalhost
          ? 'Atenção: A URL configurada está como localhost. Para acesso em celulares externos (4G/5G), utilize a URL pública da nuvem.'
          : 'URL personalizada configurada para receber cadastros de qualquer celular.',
      };
    } catch {
      // continua para detecção padrão
    }
  }

  // 2. Se o usuário configurou uma URL própria nas configurações da empresa (diferente dos defaults)
  if (
    companySettings?.publicAppUrl &&
    companySettings.publicAppUrl.trim() &&
    companySettings.publicAppUrl !== CURRENT_DEV_APP_URL &&
    companySettings.publicAppUrl !== SHARED_CLOUD_APP_URL
  ) {
    let formatted = companySettings.publicAppUrl.trim();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = `https://${formatted}`;
    }
    try {
      const parsed = new URL(formatted);
      parsed.searchParams.set('tab', 'register');
      return {
        url: parsed.toString(),
        isConverted: false,
        isLocalhost: false,
        type: 'custom',
        note: 'URL pública personalizada ativa para receber cadastros de qualquer celular.',
      };
    } catch {
      // continua
    }
  }

  if (typeof window === 'undefined') {
    return {
      url: `${CURRENT_DEV_APP_URL}/?tab=register`,
      isConverted: false,
      isLocalhost: false,
      type: 'live_session',
      note: 'URL direta da sessão ativa conectada ao banco de dados em tempo real.',
    };
  }

  const origin = window.location.origin;
  const pathname = window.location.pathname;

  // 3. Se estiver rodando dentro do Google AI Studio (ais-dev- ou ais-pre-)
  if (origin.includes('ais-dev-')) {
    return {
      url: `${origin}${pathname}?tab=register`,
      isConverted: false,
      isLocalhost: false,
      type: 'live_session',
      note: 'URL direta da sessão ativa. Participantes de qualquer celular (4G, 5G ou Wi-Fi) enviam cadastros diretamente a este servidor em tempo real.',
    };
  }

  if (origin.includes('ais-pre-')) {
    return {
      url: `${origin}${pathname}?tab=register`,
      isConverted: false,
      isLocalhost: false,
      type: 'shared_cloud',
      note: 'URL pública compartilhada ativa. Participantes em 4G, 5G ou Wi-Fi enviam os cadastros diretamente para este servidor em tempo real.',
    };
  }

  // 4. Se estiver em localhost/127.0.0.1 (ex: container isolado)
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return {
      url: `${CURRENT_DEV_APP_URL}/?tab=register`,
      isConverted: true,
      isLocalhost: false,
      type: 'live_session',
      note: 'Conectado à URL pública ativa na nuvem para permitir acesso via 4G/5G.',
    };
  }

  // 5. URL padrão de produção
  return {
    url: `${origin}${pathname}?tab=register`,
    isConverted: false,
    isLocalhost: false,
    type: 'production',
    note: 'URL pública ativa pronta para receber cadastros de qualquer dispositivo.',
  };
}

/**
 * Obtém a URL oficial ativa para confirmação direta de presença por leitura de QR Code.
 * Essa URL pode ser lida tanto pelo Leitor embutido da aplicação quanto por QUALQUER câmera
 * nativa de celular (iOS, Android, etc.) em qualquer rede (Wi-Fi, 4G, 5G).
 */
export function resolvePublicCheckinUrl(
  participant: { id: string; registrationNumber?: string; fullName?: string; company?: string; eventId?: string },
  companySettings?: Partial<CompanySettings>
): string {
  const regInfo = resolvePublicRegistrationUrl(companySettings);
  try {
    const parsed = new URL(regInfo.url);
    parsed.searchParams.delete('tab');
    parsed.searchParams.set('checkin', participant.id);
    if (participant.registrationNumber) {
      parsed.searchParams.set('mat', participant.registrationNumber);
    }
    if (participant.fullName) {
      parsed.searchParams.set('nom', participant.fullName);
    }
    if (participant.company && participant.company !== 'Não informada') {
      parsed.searchParams.set('emp', participant.company);
    }
    return parsed.toString();
  } catch {
    const origin = typeof window !== 'undefined' ? window.location.origin : CURRENT_DEV_APP_URL;
    const mat = participant.registrationNumber ? `&mat=${encodeURIComponent(participant.registrationNumber)}` : '';
    const nom = participant.fullName ? `&nom=${encodeURIComponent(participant.fullName)}` : '';
    const emp = participant.company ? `&emp=${encodeURIComponent(participant.company)}` : '';
    return `${origin}/?checkin=${encodeURIComponent(participant.id)}${mat}${nom}${emp}`;
  }
}

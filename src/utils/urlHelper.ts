import { CompanySettings } from '../types';

export interface PublicUrlInfo {
  url: string;
  isConverted: boolean;
  isLocalhost: boolean;
  type: 'live_session' | 'shared_cloud' | 'custom' | 'localhost' | 'production';
  note: string;
}

/**
 * Obtém a URL oficial ativa para compartilhamento e leitura de QR Codes.
 * Usa prioritariamente o domínio real do navegador ativo (onde o servidor e o banco de dados estão rodando),
 * garantindo que computadores e celulares em qualquer rede (Wi-Fi, 4G, 5G) acessem a aplicação real.
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
          ? 'URL local ativa. Para celulares em redes móveis externas (4G/5G), configure um endereço público ou IP de rede.'
          : 'URL personalizada configurada para receber cadastros e confirmações de presença.',
      };
    } catch {
      // continua para detecção padrão
    }
  }

  // 2. Se o usuário configurou uma URL própria nas configurações da empresa (válida e não placeholder legado)
  if (
    companySettings?.publicAppUrl &&
    companySettings.publicAppUrl.trim() &&
    !companySettings.publicAppUrl.includes('rihuh2lzyxgzrc2qmh3tyj')
  ) {
    let formatted = companySettings.publicAppUrl.trim();
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
        type: 'custom',
        note: 'URL configurada nas preferências da empresa ativa para todos os dispositivos.',
      };
    } catch {
      // continua
    }
  }

  if (typeof window === 'undefined') {
    return {
      url: '/?tab=register',
      isConverted: false,
      isLocalhost: false,
      type: 'live_session',
      note: 'URL direta da sessão ativa conectada ao banco de dados em tempo real.',
    };
  }

  const origin = window.location.origin.replace(/\/$/, '');
  const pathname = window.location.pathname.startsWith('/') ? window.location.pathname : `/${window.location.pathname}`;
  const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');

  // 3. Se estiver rodando dentro do Google AI Studio ou Cloud Run (ais-dev- ou ais-pre-)
  if (origin.includes('ais-dev-') || origin.includes('ais-pre-') || origin.includes('run.app')) {
    return {
      url: `${origin}${pathname}?tab=register`,
      isConverted: false,
      isLocalhost: false,
      type: 'live_session',
      note: 'URL direta ativa. Participantes de qualquer celular (4G, 5G ou Wi-Fi) e computadores conectam-se em tempo real.',
    };
  }

  // 4. Se estiver em localhost ou IP da rede local
  if (isLocalhost) {
    return {
      url: `${origin}${pathname}?tab=register`,
      isConverted: false,
      isLocalhost: true,
      type: 'localhost',
      note: 'Ambiente local ativo. Dispositivos na mesma rede Wi-Fi podem acessar utilizando o IP da máquina.',
    };
  }

  // 5. URL padrão ativa de produção / domínio próprio
  return {
    url: `${origin}${pathname}?tab=register`,
    isConverted: false,
    isLocalhost: false,
    type: 'production',
    note: 'URL pública ativa pronta para receber cadastros e presenças em tempo real de qualquer dispositivo.',
  };
}

/**
 * Obtém a URL oficial ativa para confirmação direta de presença por leitura de QR Code.
 * Essa URL é codificada no QR Code do participante para permitir leitura instantânea
 * por QUALQUER câmera nativa de smartphone (iOS e Android) em QUALQUER rede (Wi-Fi, 4G, 5G),
 * e também pelo leitor embutido da aplicação.
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
    if (participant.eventId) {
      parsed.searchParams.set('evt', participant.eventId);
    }
    return parsed.toString();
  } catch {
    const origin = typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : '';
    const mat = participant.registrationNumber ? `&mat=${encodeURIComponent(participant.registrationNumber)}` : '';
    const nom = participant.fullName ? `&nom=${encodeURIComponent(participant.fullName)}` : '';
    const emp = participant.company ? `&emp=${encodeURIComponent(participant.company)}` : '';
    const evt = participant.eventId ? `&evt=${encodeURIComponent(participant.eventId)}` : '';
    return `${origin}/?checkin=${encodeURIComponent(participant.id)}${mat}${nom}${emp}${evt}`;
  }
}

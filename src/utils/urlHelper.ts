import { CompanySettings } from '../types';

export const FALLBACK_PUBLIC_APP_URL = 'https://ais-pre-rihuh2lzyxgzrc2qmh3tyj-161635627789.us-east1.run.app';

export interface PublicUrlInfo {
  url: string;
  isConverted: boolean;
  isLocalhost: boolean;
  type: 'public_preview' | 'custom' | 'localhost' | 'production';
  note: string;
}

/**
 * Obtém a URL pública oficial para compartilhamento do formulário de inscrição.
 * Converte automaticamente URLs de desenvolvimento restrito (ais-dev-) para a
 * URL pública de produção compartilhada (ais-pre-), permitindo acesso irrestrito
 * em qualquer celular, rede 4G/5G ou Wi-Fi externo sem exigir autenticação no Google AI Studio.
 */
export function resolvePublicRegistrationUrl(
  companySettings?: Partial<CompanySettings>,
  customOverride?: string
): PublicUrlInfo {
  // 1. Se foi fornecida uma URL customizada salva nas configurações ou informada no modal
  const explicitUrl = customOverride?.trim() || companySettings?.publicAppUrl?.trim();
  if (explicitUrl) {
    let formatted = explicitUrl;
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = `https://${formatted}`;
    }

    // Se o usuário colou a URL da janela de desenvolvimento (ais-dev-), converte automaticamente para a pública (ais-pre-)
    let converted = false;
    if (formatted.includes('ais-dev-')) {
      formatted = formatted.replace('ais-dev-', 'ais-pre-');
      converted = true;
    }

    try {
      const parsed = new URL(formatted);
      parsed.searchParams.set('tab', 'register');
      const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';

      return {
        url: parsed.toString(),
        isConverted: converted,
        isLocalhost,
        type: isLocalhost ? 'localhost' : 'custom',
        note: isLocalhost
          ? 'Atenção: A URL configurada está como localhost. Para acesso em celulares externos (4G/5G), utilize a URL pública oficial.'
          : 'URL pública oficial pronta para compartilhamento em qualquer celular e rede externa.',
      };
    } catch {
      // continua para a detecção padrão caso a URL digitada seja inválida
    }
  }

  if (typeof window === 'undefined') {
    return {
      url: `${FALLBACK_PUBLIC_APP_URL}/?tab=register`,
      isConverted: false,
      isLocalhost: false,
      type: 'public_preview',
      note: 'URL padrão compartilhada acessível em qualquer rede.',
    };
  }

  const origin = window.location.origin;
  const pathname = window.location.pathname;

  // 2. Detecção automática do ambiente Google AI Studio Dev (ais-dev- -> ais-pre-)
  if (origin.includes('ais-dev-')) {
    const publicOrigin = origin.replace('ais-dev-', 'ais-pre-');
    return {
      url: `${publicOrigin}${pathname}?tab=register`,
      isConverted: true,
      isLocalhost: false,
      type: 'public_preview',
      note: 'Ajustado automaticamente para a URL pública (ais-pre). Acessível livremente em celulares 4G/5G e qualquer rede externa sem necessidade de login Google.',
    };
  }

  // 3. Se estiver em localhost/127.0.0.1 no container/desenvolvimento
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    // Retorna a URL pública oficial compartilhada na nuvem Cloud Run para que os celulares e QR Codes funcionem
    return {
      url: `${FALLBACK_PUBLIC_APP_URL}/?tab=register`,
      isConverted: true,
      isLocalhost: false,
      type: 'public_preview',
      note: 'Configurado com a URL pública oficial do evento para permitir acesso imediato via 4G/5G e redes externas.',
    };
  }

  // 4. URL de produção padrão (já é pública)
  return {
    url: `${origin}${pathname}?tab=register`,
    isConverted: false,
    isLocalhost: false,
    type: 'production',
    note: 'URL pública ativa pronta para compartilhamento em qualquer dispositivo.',
  };
}

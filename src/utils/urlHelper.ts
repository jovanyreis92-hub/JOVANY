import { CompanySettings } from '../types';

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
    try {
      const parsed = new URL(formatted);
      parsed.searchParams.set('tab', 'register');
      return {
        url: parsed.toString(),
        isConverted: false,
        isLocalhost: parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1',
        type: 'custom',
        note: 'URL pública personalizada definida pelo organizador.',
      };
    } catch {
      // continua para o fallback padrão caso a URL digitada seja inválida
    }
  }

  if (typeof window === 'undefined') {
    return {
      url: 'https://ais-pre-rihuh2lzyxgzrc2qmh3tyj-161635627789.us-east1.run.app/?tab=register',
      isConverted: false,
      isLocalhost: false,
      type: 'public_preview',
      note: 'URL padrão compartilhada.',
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
      note: 'Ajustado automaticamente para a URL pública (ais-pre). Acessível livremente em celulares 4G/5G e qualquer rede externa.',
    };
  }

  // 3. Detecção de ambiente local (localhost / 127.0.0.1)
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return {
      url: `${origin}${pathname}?tab=register`,
      isConverted: false,
      isLocalhost: true,
      type: 'localhost',
      note: 'Você está no ambiente local. Celulares em outras redes não conseguem acessar "localhost" diretamente. Utilize a URL pública ou informe o IP da sua rede Wi-Fi.',
    };
  }

  // 4. URL de produção padrão (já é pública)
  return {
    url: `${origin}${pathname}?tab=register`,
    isConverted: false,
    isLocalhost: false,
    type: 'production',
    note: 'URL pública ativa pronta para compartilhamento.',
  };
}

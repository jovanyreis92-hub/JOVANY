import { LayoutFontFamily, LayoutScaleSize } from '../types';

export interface FontOption {
  id: LayoutFontFamily;
  name: string;
  category: string;
  cssFamily: string;
  preview: string;
  description: string;
}

export interface ScaleOption {
  id: LayoutScaleSize;
  name: string;
  percentage: string;
  basePx: number;
  description: string;
  badge: string;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'inter',
    name: 'Inter',
    category: 'Moderna Sans',
    cssFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    preview: 'Presença Confirmada 2026',
    description: 'Interface limpa, moderna e com excelente legibilidade digital.',
  },
  {
    id: 'poppins',
    name: 'Poppins',
    category: 'Geométrica Suave',
    cssFamily: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
    preview: 'Presença Confirmada 2026',
    description: 'Traços arredondados e elegantes com ar sofisticado.',
  },
  {
    id: 'roboto',
    name: 'Roboto',
    category: 'Corporativa Neutra',
    cssFamily: "'Roboto', -apple-system, BlinkMacSystemFont, sans-serif",
    preview: 'Presença Confirmada 2026',
    description: 'Padrão corporativo estruturado, equilibrado e clássico.',
  },
  {
    id: 'merriweather',
    name: 'Merriweather',
    category: 'Elegante Serifada',
    cssFamily: "'Merriweather', Georgia, 'Times New Roman', serif",
    preview: 'Presença Confirmada 2026',
    description: 'Estilo editorial, formal e com alta distinção acadêmica.',
  },
  {
    id: 'rounded',
    name: 'Nunito',
    category: 'Amigável & Arredondada',
    cssFamily: "'Nunito', -apple-system, BlinkMacSystemFont, sans-serif",
    preview: 'Presença Confirmada 2026',
    description: 'Cantos suaves, visual acolhedor e leitura confortável.',
  },
  {
    id: 'mono',
    name: 'JetBrains Mono',
    category: 'Técnica & Monospace',
    cssFamily: "'JetBrains Mono', Consolas, Monaco, monospace",
    preview: 'Presença Confirmada 2026',
    description: 'Alinhamento fixo de caracteres, ideal para eventos de tecnologia.',
  },
];

export const SCALE_OPTIONS: ScaleOption[] = [
  {
    id: 'compact',
    name: 'Compacto',
    percentage: '88%',
    basePx: 14,
    description: 'Elementos menores, exibe mais conteúdo e dados por tela.',
    badge: 'Alta Densidade',
  },
  {
    id: 'normal',
    name: 'Padrão',
    percentage: '100%',
    basePx: 16,
    description: 'Tamanho original equilibrado, recomendado para a maioria dos usos.',
    badge: 'Recomendado',
  },
  {
    id: 'large',
    name: 'Grande',
    percentage: '112%',
    basePx: 18,
    description: 'Fontes ampliadas, maior facilidade de leitura e botões de toque.',
    badge: 'Confortável',
  },
  {
    id: 'extra-large',
    name: 'Extra Grande',
    percentage: '125%',
    basePx: 20,
    description: 'Visual ampliado com alta visibilidade para totens ou acessibilidade.',
    badge: 'Máxima Visibilidade',
  },
];

/**
 * Aplica as preferências de fonte e tamanho no DOM global.
 */
export function applyLayoutPreferences(
  fontFamily?: LayoutFontFamily,
  layoutScale?: LayoutScaleSize
): void {
  if (typeof document === 'undefined') return;

  const fontId = fontFamily || 'inter';
  const scaleId = layoutScale || 'normal';

  const fontConfig = FONT_OPTIONS.find((f) => f.id === fontId) || FONT_OPTIONS[0];
  const scaleConfig = SCALE_OPTIONS.find((s) => s.id === scaleId) || SCALE_OPTIONS[1];

  // Aplica tamanho base no elemento raiz (HTML) para que todas as unidades rem do Tailwind escalem
  document.documentElement.style.fontSize = `${scaleConfig.basePx}px`;

  // Aplica a família de fontes no body
  document.body.style.fontFamily = fontConfig.cssFamily;

  // Atributos de dados para seletores e debugging
  document.documentElement.setAttribute('data-font', fontId);
  document.documentElement.setAttribute('data-scale', scaleId);
}

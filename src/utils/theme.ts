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

export interface ColorPreset {
  id: string;
  name: string;
  hex: string;
  category: string;
  tag: string;
}

export const DEFAULT_PRIMARY_COLOR = '#0284c7';

export const COLOR_PRESETS: ColorPreset[] = [
  { id: 'sky', name: 'Azul Céu', hex: '#0284c7', category: 'Padrão Corporativo', tag: 'Original' },
  { id: 'blue', name: 'Azul Safira', hex: '#2563eb', category: 'Corporativo Clássico', tag: 'Clássico' },
  { id: 'navy', name: 'Azul Marinho', hex: '#1e3a8a', category: 'Formal Institucional', tag: 'Executivo' },
  { id: 'indigo', name: 'Índigo Tech', hex: '#4f46e5', category: 'Tecnologia & Inovação', tag: 'Tech' },
  { id: 'violet', name: 'Violeta / Púrpura', hex: '#7c3aed', category: 'Criativo & Nobre', tag: 'Criativo' },
  { id: 'emerald', name: 'Verde Esmeralda', hex: '#059669', category: 'Saúde & Sustentabilidade', tag: 'Sustentável' },
  { id: 'teal', name: 'Verde Petróleo', hex: '#0d9488', category: 'Elegância & Equilíbrio', tag: 'Sereno' },
  { id: 'rose', name: 'Vinho / Bordeaux', hex: '#be123c', category: 'Eventos & Gala', tag: 'Prestígio' },
  { id: 'red', name: 'Rubi Intenso', hex: '#dc2626', category: 'Vibrante & Marcante', tag: 'Impacto' },
  { id: 'orange', name: 'Laranja Coral', hex: '#ea580c', category: 'Dinâmico & Enérgico', tag: 'Energia' },
  { id: 'amber', name: 'Âmbar Dourado', hex: '#d97706', category: 'Nobre & Caloroso', tag: 'Dourado' },
  { id: 'slate', name: 'Grafite Neutro', hex: '#334155', category: 'Minimalista & Técnico', tag: 'Minimal' },
];

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let cleanHex = hex.trim().replace(/^#/, '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    return null;
  }
  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [clamp(r), clamp(g), clamp(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export function adjustBrightness(r: number, g: number, b: number, percent: number): string {
  if (percent > 0) {
    const factor = percent / 100;
    const newR = r + (255 - r) * factor;
    const newG = g + (255 - g) * factor;
    const newB = b + (255 - b) * factor;
    return rgbToHex(newR, newG, newB);
  } else {
    const factor = (100 + percent) / 100;
    return rgbToHex(r * factor, g * factor, b * factor);
  }
}

export interface ComputedThemeColors {
  primary: string;
  hover: string;
  active: string;
  light: string;
  soft: string;
  border: string;
  text: string;
  contrast: string;
  ring: string;
  shadow: string;
}

export function computeThemeColors(hexInput?: string): ComputedThemeColors {
  const baseHex = hexInput && hexToRgb(hexInput) ? hexInput : DEFAULT_PRIMARY_COLOR;
  const rgb = hexToRgb(baseHex) || { r: 2, g: 132, b: 199 };
  const { r, g, b } = rgb;

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const contrast = luminance > 0.65 ? '#0f172a' : '#ffffff';

  return {
    primary: rgbToHex(r, g, b),
    hover: adjustBrightness(r, g, b, -14),
    active: adjustBrightness(r, g, b, -24),
    light: adjustBrightness(r, g, b, 82),
    soft: adjustBrightness(r, g, b, 94),
    border: adjustBrightness(r, g, b, 65),
    text: adjustBrightness(r, g, b, -20),
    contrast,
    ring: `rgba(${r}, ${g}, ${b}, 0.35)`,
    shadow: `0 4px 14px 0 rgba(${r}, ${g}, ${b}, 0.22)`,
  };
}

/**
 * Aplica as variáveis CSS de cor primária no DOM global.
 */
export function applyPrimaryColor(hexColor?: string): void {
  if (typeof document === 'undefined') return;
  const colors = computeThemeColors(hexColor);
  const root = document.documentElement;

  root.style.setProperty('--primary-color', colors.primary);
  root.style.setProperty('--primary-hover', colors.hover);
  root.style.setProperty('--primary-active', colors.active);
  root.style.setProperty('--primary-light', colors.light);
  root.style.setProperty('--primary-soft', colors.soft);
  root.style.setProperty('--primary-border', colors.border);
  root.style.setProperty('--primary-text', colors.text);
  root.style.setProperty('--primary-contrast', colors.contrast);
  root.style.setProperty('--primary-ring', colors.ring);
  root.style.setProperty('--primary-shadow', colors.shadow);
  root.setAttribute('data-primary-color', colors.primary);
}

/**
 * Aplica as preferências de fonte, tamanho e cor primária no DOM global.
 */
export function applyLayoutPreferences(
  fontFamily?: LayoutFontFamily,
  layoutScale?: LayoutScaleSize,
  primaryColor?: string
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

  // Aplica a cor primária dinâmica
  applyPrimaryColor(primaryColor);
}

import { EventItem } from '../types';

export interface EventRegistrationValidity {
  status: 'open' | 'not_started' | 'ended' | 'no_restriction';
  canRegister: boolean;
  headline: string;
  detail: string;
  badgeClass: string;
  badgeLabel: string;
  startDateFormatted?: string;
  endDateFormatted?: string;
}

/**
 * Formata strings de data ou data/hora (YYYY-MM-DD ou YYYY-MM-DDTHH:mm) no padrão legível brasileiro.
 */
export function formatEventDateTime(dateTimeStr?: string): string {
  if (!dateTimeStr) return '';

  try {
    // Se for apenas YYYY-MM-DD
    if (dateTimeStr.length === 10 && dateTimeStr.includes('-')) {
      const [year, month, day] = dateTimeStr.split('-');
      return `${day}/${month}/${year}`;
    }

    // Se tiver horário
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return dateTimeStr;

    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateTimeStr;
  }
}

/**
 * Analisa e retorna o status de validade das inscrições de um evento programado.
 */
export function getEventRegistrationStatus(event?: EventItem | null): EventRegistrationValidity {
  if (!event) {
    return {
      status: 'no_restriction',
      canRegister: true,
      headline: 'Inscrições Abertas',
      detail: 'Cadastre-se normalmente para o evento.',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badgeLabel: 'Inscrições Abertas',
    };
  }

  const now = new Date();
  const startStr = event.registrationStartDate?.trim();
  const endStr = event.registrationEndDate?.trim();

  const startDateFormatted = startStr ? formatEventDateTime(startStr) : undefined;
  const endDateFormatted = endStr ? formatEventDateTime(endStr) : undefined;

  let startDate: Date | null = null;
  let endDate: Date | null = null;

  if (startStr) {
    // Se for apenas YYYY-MM-DD, assume o início do dia local 00:00:00
    startDate = startStr.length === 10 ? new Date(`${startStr}T00:00:00`) : new Date(startStr);
  }

  if (endStr) {
    // Se for apenas YYYY-MM-DD, assume o final do dia local 23:59:59
    endDate = endStr.length === 10 ? new Date(`${endStr}T23:59:59`) : new Date(endStr);
  }

  // 1. Verifica se o prazo final de validade já expirou
  if (endDate && now > endDate) {
    return {
      status: 'ended',
      canRegister: false,
      headline: 'Inscrições Encerradas',
      detail: `O prazo de validade para inscrição deste evento encerrou em ${endDateFormatted}. Novos cadastros não são mais permitidos.`,
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
      badgeLabel: 'Prazo Expirado',
      startDateFormatted,
      endDateFormatted,
    };
  }

  // 2. Verifica se as inscrições ainda não iniciaram
  if (startDate && now < startDate) {
    return {
      status: 'not_started',
      canRegister: false,
      headline: 'Inscrições em Breve',
      detail: `As inscrições para este evento estarão disponíveis a partir de ${startDateFormatted}.`,
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      badgeLabel: 'Abertura em Breve',
      startDateFormatted,
      endDateFormatted,
    };
  }

  // 3. Se tiver data final de término futura, está aberto com prazo
  if (endDate) {
    return {
      status: 'open',
      canRegister: true,
      headline: 'Inscrições Abertas',
      detail: `Inscrições válidas até ${endDateFormatted}. Garanta sua vaga com antecedência!`,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badgeLabel: `Válido até ${endDateFormatted}`,
      startDateFormatted,
      endDateFormatted,
    };
  }

  // 4. Se tiver apenas início e já passou, aberto sem prazo final estrito
  if (startDate) {
    return {
      status: 'open',
      canRegister: true,
      headline: 'Inscrições Abertas',
      detail: `Inscrições iniciadas em ${startDateFormatted}.`,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badgeLabel: 'Inscrições Abertas',
      startDateFormatted,
      endDateFormatted,
    };
  }

  // 5. Sem restrição de data
  return {
    status: 'no_restriction',
    canRegister: true,
    headline: 'Inscrições Abertas',
    detail: 'Inscrições regulares ativas.',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeLabel: 'Inscrições Abertas',
  };
}

/**
 * Monta o link único de inscrição vinculado diretamente a um evento específico
 */
export function buildEventRegistrationUrl(baseUrl: string, eventId: string): string {
  // Remove parâmetros existentes e barras no final para não duplicar ?tab=register
  const cleanBase = (baseUrl || '').split('?')[0].replace(/\/?$/, '');
  return `${cleanBase}/?tab=register&eventId=${encodeURIComponent(eventId)}`;
}

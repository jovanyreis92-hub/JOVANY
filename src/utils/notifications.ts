import { Participant } from '../types';

const WEB_NOTIFICATIONS_ENABLED_KEY = 'web_notifications_enabled';

// Ícone SVG em Data URI em verde e padrão para notificações limpas do sistema
const NOTIFICATION_DEFAULT_ICON =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="%2310b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';

/**
 * Verifica se o navegador atual suporta a Web Notifications API
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Retorna o status atual da permissão de notificações no navegador
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Verifica se as notificações estão ativadas na preferência do usuário (localStorage)
 */
export function isWebNotificationsEnabled(): boolean {
  if (!isNotificationSupported()) return false;
  try {
    const val = localStorage.getItem(WEB_NOTIFICATIONS_ENABLED_KEY);
    if (val === null) {
      // Se a permissão já foi concedida anteriormente, padrão é ativo
      return Notification.permission === 'granted';
    }
    return val === 'true';
  } catch {
    return true;
  }
}

/**
 * Salva a preferência de notificações no localStorage e notifica os componentes
 */
export function setWebNotificationsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(WEB_NOTIFICATIONS_ENABLED_KEY, String(enabled));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('web-notifications-setting-changed', {
          detail: { enabled },
        })
      );
    }
  } catch (err) {
    console.error('Erro ao salvar preferência de notificações:', err);
  }
}

/**
 * Solicita ao usuário a permissão para exibir notificações no navegador (Web Notifications API)
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setWebNotificationsEnabled(true);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('web-notifications-permission-changed', {
          detail: { permission },
        })
      );
    }
    return permission;
  } catch (err) {
    console.error('Erro ao solicitar permissão da Web Notifications API:', err);
    return Notification.permission;
  }
}

/**
 * Dispara uma notificação nativa no navegador informando a presença confirmada do participante
 */
export function sendAttendanceNotification(
  participant: Participant,
  eventTitle?: string,
  options?: { logoUrl?: string }
): boolean {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;
  if (!isWebNotificationsEnabled()) return false;

  try {
    const timeStr = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const title = `✅ Presença Confirmada: ${participant.fullName}`;
    const matriculaText = participant.registrationNumber ? `Matrícula: ${participant.registrationNumber}` : '';
    const companyText = participant.company ? `Empresa: ${participant.company}` : '';
    const eventText = eventTitle ? `Evento: ${eventTitle}` : '';

    const bodyLines = [
      [matriculaText, companyText].filter(Boolean).join(' • '),
      eventText,
      `Horário de check-in: ${timeStr}`,
    ].filter(Boolean);

    const notificationOptions = {
      body: bodyLines.join('\n'),
      icon: options?.logoUrl || NOTIFICATION_DEFAULT_ICON,
      badge: NOTIFICATION_DEFAULT_ICON,
      tag: `attendance-${participant.id}`,
      silent: false,
    };

    const notification = new Notification(title, notificationOptions);

    notification.onclick = () => {
      try {
        if (typeof window !== 'undefined') {
          window.focus();
        }
        notification.close();
      } catch {
        // ignore
      }
    };

    // Fecha a notificação automaticamente após 8 segundos para não poluir a tela do SO
    setTimeout(() => {
      try {
        notification.close();
      } catch {
        // ignore
      }
    }, 8000);

    return true;
  } catch (err) {
    console.error('Erro ao disparar notificação via Web Notifications API:', err);
    return false;
  }
}

/**
 * Dispara uma notificação de teste para o administrador validar o funcionamento no navegador/SO
 */
export function sendTestNotification(options?: { logoUrl?: string }): boolean {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const notification = new Notification('🔔 Teste de Notificação Web', {
      body: 'As notificações do Painel Administrativo estão funcionando perfeitamente! Você será alertado sempre que um participante confirmar presença via QR Code.',
      icon: options?.logoUrl || NOTIFICATION_DEFAULT_ICON,
      badge: NOTIFICATION_DEFAULT_ICON,
      tag: 'test-notification',
    });

    notification.onclick = () => {
      try {
        if (typeof window !== 'undefined') {
          window.focus();
        }
        notification.close();
      } catch {
        // ignore
      }
    };

    setTimeout(() => {
      try {
        notification.close();
      } catch {
        // ignore
      }
    }, 6000);

    return true;
  } catch (err) {
    console.error('Erro ao disparar notificação de teste:', err);
    return false;
  }
}

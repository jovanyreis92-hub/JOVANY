import QRCode from 'qrcode';
import { Participant, QrPayload } from '../types';
import { getCompanySettings, getStoredEvents } from './storage';
import { resolvePublicCheckinUrl } from './urlHelper';

export function createQrPayload(participant: Participant): string {
  // Gera código ultra-compacto oficial para leitura veloz com a câmera do leitor do aplicativo
  // Formato: CP:<id>:<matricula>:<nome>:<empresa>:<evento>
  // Payload direto sem inchaço de URL encoding reduz o QR Code para versão mínima (módulos gigantes),
  // garantindo que todos os dados do participante (incluindo evento) sejam lidos e exibidos 100% offline.
  const cleanName = (participant.fullName || '').trim().replace(/[:|]/g, ' ');
  const cleanCompany = (participant.company || '').trim().replace(/[:|]/g, ' ');
  const cleanMatricula = (participant.registrationNumber || '').trim().replace(/[:|]/g, '');
  const cleanEvent = (participant.eventName || '').trim().replace(/[:|]/g, ' ');
  return `CP:${participant.id}:${cleanMatricula}:${cleanName}:${cleanCompany}:${cleanEvent}`;
}

export async function generateQrCodeDataUrl(text: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: 480,
      margin: 1, // Margem mínima de 1 módulo maximiza o tamanho dos blocos de dados
      color: {
        dark: '#000000', // Preto puro 100% opaco para máxima taxa de contraste contra luz solar e reflexos
        light: '#ffffff', // Fundo branco puro 100% opaco sem artefatos
      },
      errorCorrectionLevel: 'M', // Nível M (15% de redundância) protege contra reflexos e riscos sem adensar o QR
    });
    return dataUrl;
  } catch (err) {
    console.error('Erro ao gerar DataURL do QR Code:', err);
    throw err;
  }
}

/**
 * Baixa apenas o arquivo PNG do QR Code individual
 */
export async function downloadQrCodeImage(participant: Participant): Promise<void> {
  const payload = createQrPayload(participant);
  const dataUrl = await generateQrCodeDataUrl(payload);

  const link = document.createElement('a');
  const safeName = (participant.fullName || 'participante').toLowerCase().replace(/[^a-z0-9]/g, '_');
  link.download = `qrcode_${participant.registrationNumber || 'registro'}_${safeName}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Gera e baixa uma Credencial/Crachá completo com visual profissional
 */
export async function downloadBadgeImage(participant: Participant): Promise<void> {
  const settings = getCompanySettings();
  const payload = createQrPayload(participant);
  const qrDataUrl = await generateQrCodeDataUrl(payload);

  const canvas = document.createElement('canvas');
  const width = 600;
  const height = 900;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Fundo do crachá com acabamento profissional
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  // Furo simulado do cordão do crachá no topo
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.arc(width / 2, 18, 9, 0, Math.PI * 2);
  ctx.fill();

  // Topo elegante (Azul Escuro / Slate Profissional)
  const grad = ctx.createLinearGradient(0, 0, width, 230);
  grad.addColorStop(0, '#090d16');
  grad.addColorStop(1, '#1e293b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 30, width, 195);

  // Filete de destaque azul celeste
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 222, width, 4);

  // Se houver logo da empresa, carrega e desenha
  let logoDrawn = false;
  if (settings.logoUrl) {
    try {
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = settings.logoUrl;
      await new Promise((resolve) => {
        logoImg.onload = resolve;
        logoImg.onerror = resolve; // não bloqueia se falhar
      });
      if (logoImg.complete && logoImg.naturalWidth > 0) {
        // Desenha logo no topo central ou lateral
        const maxLogoW = 120;
        const maxLogoH = 46;
        let lw = logoImg.naturalWidth;
        let lh = logoImg.naturalHeight;
        const ratio = Math.min(maxLogoW / lw, maxLogoH / lh);
        lw = lw * ratio;
        lh = lh * ratio;
        ctx.drawImage(logoImg, width / 2 - lw / 2, 45, lw, lh);
        logoDrawn = true;
      }
    } catch {
      // continua sem logo
    }
  }

  // Título da credencial e nome da empresa
  ctx.textAlign = 'center';
  if (!logoDrawn) {
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText((settings.companyName || 'CREDENCIAL OFICIAL').toUpperCase(), width / 2, 60);
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(settings.eventName ? settings.eventName.toUpperCase() : 'PASSE DE ACESSO & PRESENÇA', width / 2, logoDrawn ? 115 : 92);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px sans-serif';
  ctx.fillText('CREDENCIAL OFICIAL DE ACESSO', width / 2, logoDrawn ? 138 : 120);

  // Cartão branco interno para o QR Code
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.1)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetY = 4;
  ctx.fillRect(110, 160, 380, 380);
  ctx.shadowColor = 'transparent';

  // Borda suave ao redor do QR Code
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(110, 160, 380, 380);

  // Desenhar QR Code na imagem
  const qrImg = new Image();
  qrImg.src = qrDataUrl;
  await new Promise((resolve) => {
    qrImg.onload = resolve;
  });
  ctx.drawImage(qrImg, 130, 180, 340, 340);

  // Informações do participante abaixo do QR Code
  ctx.textAlign = 'center';

  // Nome do participante
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px sans-serif';
  const displayName = participant.fullName.length > 28
    ? participant.fullName.substring(0, 26) + '...'
    : participant.fullName;
  ctx.fillText(displayName, width / 2, 590);

  // Matrícula
  ctx.fillStyle = '#0369a1';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`MATRÍCULA: ${participant.registrationNumber}`, width / 2, 625);

  // Empresa
  ctx.fillStyle = '#475569';
  ctx.font = '16px sans-serif';
  ctx.fillText(`EMPRESA: ${participant.company}`, width / 2, 655);

  // Local do Evento ou Reunião
  const events = getStoredEvents();
  const matchedEvent = events.find((e) => e.id === participant.eventId || e.name === participant.eventName);
  const locationText = matchedEvent?.location || '';
  if (locationText) {
    ctx.fillStyle = '#0369a1';
    ctx.font = 'bold 13px sans-serif';
    const displayLocation = locationText.length > 45 ? locationText.substring(0, 42) + '...' : locationText;
    ctx.fillText(`LOCAL: ${displayLocation.toUpperCase()}`, width / 2, 685);
  }

  // Linha divisória
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, 712);
  ctx.lineTo(520, 712);
  ctx.stroke();

  // Rodapé de segurança
  ctx.fillStyle = '#0284c7';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('LEITURA EXCLUSIVA NO LEITOR DO APLICATIVO', width / 2, 735);

  ctx.fillStyle = '#64748b';
  ctx.font = '12px sans-serif';
  ctx.fillText(`Identificador Único: ${participant.id}`, width / 2, 760);
  ctx.fillText(`Cadastrado em: ${new Date(participant.createdAt).toLocaleDateString('pt-BR')}`, width / 2, 785);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('Aproxime da câmera do leitor do sistema (Funciona Online ou Offline)', width / 2, 820);

  // Baixa a imagem gerada
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  const safeName = (participant.fullName || 'participante').toLowerCase().replace(/[^a-z0-9]/g, '_');
  link.download = `credencial_${participant.registrationNumber || 'registro'}_${safeName}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

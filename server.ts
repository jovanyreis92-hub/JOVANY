import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

const DATA_DIR = path.join(process.cwd(), 'data');
const PARTICIPANTS_FILE = path.join(DATA_DIR, 'participants.json');
const PARTICIPANTS_BACKUP_FILE = path.join(DATA_DIR, 'participants.backup.json');
const DELETED_PARTICIPANTS_FILE = path.join(DATA_DIR, 'deleted_participants.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

// Garante que o diretório data exista
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helpers para leitura e escrita em disco resiliente e atômica
function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    }
  } catch (err) {
    console.warn(`[SERVER] Erro ao ler ${filePath}:`, err);
  }
  return fallback;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    const tempPath = `${filePath}.tmp_${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (writeErr) {
      console.error(`[SERVER] Erro crítico ao salvar ${filePath}:`, writeErr);
    }
  }
}

// Carrega lista de IDs de participantes excluídos (tombstones) para impedir retorno acidental
const rawDeletedIds = readJsonFile<string[]>(DELETED_PARTICIPANTS_FILE, []);
let deletedParticipantIds = new Set<string>(Array.isArray(rawDeletedIds) ? rawDeletedIds : []);

function persistDeletedIdsToDisk(): void {
  writeJsonFile(DELETED_PARTICIPANTS_FILE, Array.from(deletedParticipantIds));
}

// Salva participantes de forma atômica no arquivo principal e no backup de redundância (filtrando deletados)
function persistParticipantsToDisk(parts: any[]): void {
  const filtered = parts.filter((p) => p && p.id && !deletedParticipantIds.has(p.id));
  writeJsonFile(PARTICIPANTS_FILE, filtered);
  writeJsonFile(PARTICIPANTS_BACKUP_FILE, filtered);
}

// Recupera dados combinando o arquivo primário com o backup de segurança, expurgando deletados
const primaryStored = readJsonFile<any[]>(PARTICIPANTS_FILE, []);
const backupStored = readJsonFile<any[]>(PARTICIPANTS_BACKUP_FILE, []);
const mergedMap = new Map<string, any>();

// Une os registros por ID, ignorando estritamente qualquer registro excluído
[...backupStored, ...primaryStored].forEach((p) => {
  if (!p || !p.id) return;
  if (deletedParticipantIds.has(p.id)) return;
  const key = p.id;
  const existing = mergedMap.get(key);
  if (!existing) {
    mergedMap.set(key, p);
  } else {
    // Se o registro existente ou o novo tiver presença confirmada, preserva a presença
    const attended = Boolean(existing.attended || p.attended);
    const attendedAt = existing.attendedAt || p.attendedAt || (attended ? new Date().toISOString() : null);
    mergedMap.set(key, {
      ...existing,
      ...p,
      attended,
      attendedAt,
    });
  }
});

let participants: any[] = Array.from(mergedMap.values()).filter(p => !deletedParticipantIds.has(p.id));
// Atualiza os dois arquivos no disco para garantir paridade imediata e limpeza de deletados
persistParticipantsToDisk(participants);
let companySettings: any = readJsonFile<any>(SETTINGS_FILE, {
  companyName: 'Minha Empresa',
  eventName: 'COZINHA SHOW',
  logoUrl: null,
  adminUsername: 'admin',
  adminPassword: '1234',
  fontFamily: 'inter',
  layoutScale: 'normal',
  publicAppUrl: 'https://ais-pre-rihuh2lzyxgzrc2qmh3tyj-161635627789.us-east1.run.app',
  creatorName: 'Jovany Reis',
  creatorSignature: 'Desenvolvido por Jovany Reis • Sistema de Credenciamento & Inscrições',
});
let eventsList: any[] = readJsonFile<any[]>(EVENTS_FILE, [
  {
    id: 'event_1',
    name: 'COZINHA SHOW',
    date: '2026-10-15',
    location: 'Espaço Cozinha Show',
    description: 'Evento Cozinha Show - Credenciamento e Presença de Participantes',
    registrationStartDate: '2026-09-01T08:00',
    registrationEndDate: '2026-12-31T23:59',
    active: true,
    createdAt: new Date().toISOString(),
  },
]);

interface SseClient {
  id: number;
  res: express.Response;
}
let sseClients: SseClient[] = [];
let nextClientId = 1;

function broadcastSSE(type: string, data: any) {
  const payload = `data: ${JSON.stringify({ type, data })}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.res.write(payload);
    } catch {
      // Ignora erro de socket desconectado
    }
  });
}

function findParticipantByCodeOrInput(input: any): any | null {
  if (!input) return null;
  const cleanInput = String(input).trim();
  if (!cleanInput) return null;

  let targetId: string | null = null;
  let targetMatricula: string | null = null;
  let targetName: string | null = null;

  const jsonMatch = cleanInput.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.id) targetId = String(parsed.id).trim();
      if (parsed.matricula) targetMatricula = String(parsed.matricula).trim();
      if (parsed.registrationNumber) targetMatricula = String(parsed.registrationNumber).trim();
      if (parsed.code) targetMatricula = String(parsed.code).trim();
      if (parsed.nome) targetName = String(parsed.nome).trim();
      if (parsed.name) targetName = String(parsed.name).trim();
    } catch {
      // ignora se não for JSON válido
    }
  }

  const normalize = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const normInput = normalize(cleanInput);

  return participants.find((p) => {
    if (targetId && p.id === targetId) return true;
    if (p.id === cleanInput) return true;

    if (targetMatricula) {
      if (p.registrationNumber?.toLowerCase() === targetMatricula.toLowerCase()) return true;
      if (normalize(p.registrationNumber || '') === normalize(targetMatricula)) return true;
    }

    if (targetName && p.fullName?.toLowerCase() === targetName.toLowerCase()) return true;

    if (p.registrationNumber?.toLowerCase() === cleanInput.toLowerCase()) return true;
    if (normalize(p.registrationNumber || '') === normInput) return true;

    const digitsOnly = cleanInput.replace(/\D/g, '');
    const matriculaDigits = (p.registrationNumber || '').replace(/\D/g, '');
    if (digitsOnly && matriculaDigits && digitsOnly.length >= 3 && digitsOnly === matriculaDigits) {
      return true;
    }

    if (cleanInput.includes(p.registrationNumber) || cleanInput.includes(p.id)) {
      return true;
    }

    return false;
  });
}

async function startServer() {
  // Configuração global de CORS para aceitar requisições de qualquer celular, rede ou origem
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Cache-Control, Pragma, X-Admin-Auth, Authorization'
    );
    res.setHeader('Vary', 'Origin');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use('/api', express.json({ limit: '20mb' }));
  app.use('/api', express.urlencoded({ extended: true, limit: '20mb' }));

  // SSE Keepalive a cada 15 segundos para evitar fechamento de conexões móveis (4G/5G)
  const heartbeat = setInterval(() => {
    sseClients.forEach((client) => {
      try {
        client.res.write(': keepalive\n\n');
      } catch {
        // fechado
      }
    });
  }, 15000);
  heartbeat.unref();

  // 1. Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      participantsCount: participants.length,
      connectedClients: sseClients.length,
    });
  });

  // 2. Obter lista de participantes (sempre filtra excluídos)
  app.get('/api/participants', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    participants = participants.filter((p) => p && p.id && !deletedParticipantIds.has(p.id));
    res.json(participants);
  });

  // 2.1 Obter lista de IDs excluídos (tombstones) para clientes sincronizarem
  app.get('/api/deleted-participants', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.json(Array.from(deletedParticipantIds));
  });

  // 3. Cadastrar participante (suporta cadastros de múltiplos celulares e redes móveis)
  app.post('/api/participants', (req, res) => {
    try {
      const data = req.body;
      if (!data || !data.fullName || !data.registrationNumber) {
        return res.status(400).json({ error: 'Nome e matrícula são obrigatórios.' });
      }

      const trimmedMatricula = String(data.registrationNumber).replace(/\D/g, '').trim();
      const trimmedName = String(data.fullName).trim();
      const targetEventId = data.eventId || 'event_1';

      if (!trimmedMatricula) {
        return res.status(400).json({ error: 'A matrícula deve conter somente números.' });
      }

      // Se o ID enviado estiver na lista de deletados, remove do tombstone pois é um cadastro explícito novo
      if (data.id && deletedParticipantIds.has(data.id)) {
        deletedParticipantIds.delete(data.id);
        persistDeletedIdsToDisk();
      }

      // Se já existir com a mesma matrícula no mesmo evento
      const existingSameMatricula = participants.find(
        (p) =>
          p.registrationNumber === trimmedMatricula &&
          (p.eventId || 'event_1') === targetEventId
      );
      if (existingSameMatricula) {
        // Se for o mesmo participante (mesmo id ou mesmo nome), atualiza os dados e retorna sucesso idempotente
        if (
          (data.id && existingSameMatricula.id === data.id) ||
          existingSameMatricula.fullName.trim().toLowerCase() === trimmedName.toLowerCase()
        ) {
          if (data.company && (!existingSameMatricula.company || existingSameMatricula.company === 'Não informada')) {
            existingSameMatricula.company = String(data.company).trim();
          }
          if (data.attended && !existingSameMatricula.attended) {
            existingSameMatricula.attended = true;
            existingSameMatricula.attendedAt = data.attendedAt || new Date().toISOString();
          }
          persistParticipantsToDisk(participants);
          broadcastSSE('participant_updated', existingSameMatricula);
          return res.status(200).json({ success: true, participant: existingSameMatricula, merged: true });
        }
        return res.status(409).json({
          error: `Já existe um participante cadastrado com a matrícula "${trimmedMatricula}" neste evento (${existingSameMatricula.fullName}).`,
        });
      }

      // Se já existir com o mesmo nome exato no mesmo evento
      const existingSameName = participants.find(
        (p) =>
          p.fullName.trim().toLowerCase() === trimmedName.toLowerCase() &&
          (p.eventId || 'event_1') === targetEventId
      );
      if (existingSameName) {
        if (
          (data.id && existingSameName.id === data.id) ||
          existingSameName.registrationNumber === trimmedMatricula
        ) {
          if (data.company && (!existingSameName.company || existingSameName.company === 'Não informada')) {
            existingSameName.company = String(data.company).trim();
          }
          if (data.attended && !existingSameName.attended) {
            existingSameName.attended = true;
            existingSameName.attendedAt = data.attendedAt || new Date().toISOString();
          }
          persistParticipantsToDisk(participants);
          broadcastSSE('participant_updated', existingSameName);
          return res.status(200).json({ success: true, participant: existingSameName, merged: true });
        }
        return res.status(409).json({
          error: `Já existe um participante cadastrado com o nome "${trimmedName}" neste evento (Matrícula: ${existingSameName.registrationNumber}).`,
        });
      }

      const newParticipant = {
        id: data.id || `part_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        fullName: trimmedName,
        registrationNumber: trimmedMatricula,
        company: data.company ? String(data.company).trim() : 'Não informada',
        eventId: targetEventId,
        eventName: data.eventName || companySettings.eventName || 'COZINHA SHOW',
        createdAt: data.createdAt || new Date().toISOString(),
        attended: Boolean(data.attended),
        attendedAt: data.attendedAt || null,
      };

      participants = [newParticipant, ...participants.filter((p) => p.id !== newParticipant.id && !deletedParticipantIds.has(p.id))];
      persistParticipantsToDisk(participants);
      broadcastSSE('participant_added', newParticipant);

      console.log(`[SERVER] Novo participante recebido: ${newParticipant.fullName} (Matrícula: ${newParticipant.registrationNumber})`);
      res.status(201).json({ success: true, participant: newParticipant });
    } catch (err) {
      console.error('[SERVER] Erro ao cadastrar participante:', err);
      res.status(500).json({ error: 'Erro interno ao salvar participante.' });
    }
  });

  // 4. Lote de participantes com união inteligente e BLOQUEIO ESTRITO DE ITENS EXCLUÍDOS
  app.post('/api/participants/batch', (req, res) => {
    try {
      const incoming: any[] = req.body?.participants;
      if (!Array.isArray(incoming)) {
        return res.status(400).json({ error: 'Formato inválido para lote de participantes.' });
      }

      let addedCount = 0;
      let modified = false;

      incoming.forEach((item) => {
        if (!item || (!item.id && !item.registrationNumber)) return;
        
        // CRÍTICO: Bloqueia re-inserção de participante previamente excluído (impede retorno ao cadastro)
        if (item.id && deletedParticipantIds.has(item.id)) {
          return;
        }

        const index = participants.findIndex(
          (p) =>
            (item.id && p.id === item.id) ||
            (item.registrationNumber &&
              p.registrationNumber === item.registrationNumber &&
              (p.eventId || 'event_1') === (item.eventId || 'event_1'))
        );

        if (index === -1) {
          participants.unshift(item);
          addedCount++;
          modified = true;
        } else {
          const current = participants[index];
          let updatedItem = false;
          if (item.attended && !current.attended) {
            current.attended = true;
            current.attendedAt = item.attendedAt || new Date().toISOString();
            updatedItem = true;
          }
          if (item.company && (!current.company || current.company === 'Não informada')) {
            current.company = item.company;
            updatedItem = true;
          }
          if (item.fullName && current.fullName !== item.fullName && item.fullName.length > current.fullName.length) {
            current.fullName = item.fullName;
            updatedItem = true;
          }
          if (updatedItem) {
            modified = true;
          }
        }
      });

      if (modified) {
        participants = participants.filter((p) => !deletedParticipantIds.has(p.id));
        persistParticipantsToDisk(participants);
        broadcastSSE('init', {
          participants,
          deletedIds: Array.from(deletedParticipantIds),
          settings: companySettings,
          events: eventsList,
        });
      }

      res.json({ success: true, added: addedCount, total: participants.length });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao processar lote de participantes.' });
    }
  });

  // 5. Atualizar participante existente
  app.put('/api/participants/:id', (req, res) => {
    const { id } = req.params;
    const index = participants.findIndex((p) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Participante não encontrado.' });
    }

    const updated = {
      ...participants[index],
      ...req.body,
      id,
    };

    participants[index] = updated;
    persistParticipantsToDisk(participants);
    broadcastSSE('participant_updated', updated);

    res.json({ success: true, participant: updated });
  });

  // 6. Toggle presença manual
  app.post('/api/participants/:id/toggle', (req, res) => {
    const { id } = req.params;
    const participant = participants.find((p) => p.id === id);
    if (!participant) {
      return res.status(404).json({ error: 'Participante não encontrado.' });
    }

    participant.attended = !participant.attended;
    participant.attendedAt = participant.attended ? new Date().toISOString() : null;

    persistParticipantsToDisk(participants);
    broadcastSSE('attendance_updated', participant);
    if (participant.attended) {
      broadcastSSE('attendance_confirmed', { participant, timestamp: participant.attendedAt });
    }

    res.json({ success: true, participant });
  });

  // 7. Confirmação de Presença por Leitura de QR Code
  app.post('/api/participants/attendance', (req, res) => {
    const { id, codeOrMatricula, matricula, registrationNumber, attended, attendedAt } = req.body;
    
    let participant: any = null;
    if (id) {
      participant = participants.find((p) => p.id === id);
    }
    if (!participant && (codeOrMatricula || matricula || registrationNumber)) {
      participant = findParticipantByCodeOrInput(codeOrMatricula || matricula || registrationNumber);
    }

    if (!participant) {
      return res.status(404).json({ 
        success: false, 
        status: 'not_found', 
        error: 'Participante não encontrado no sistema.',
        message: 'Código de participante ou matrícula não encontrado.' 
      });
    }

    if (attended === undefined && participant.attended) {
      const formattedDate = participant.attendedAt
        ? new Date(participant.attendedAt).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        : '';
      return res.json({
        success: true,
        status: 'already_checked',
        participant,
        message: `Presença já confirmada anteriormente às ${formattedDate}!`,
      });
    }

    participant.attended = attended !== undefined ? Boolean(attended) : true;
    participant.attendedAt = participant.attended ? (attendedAt || new Date().toISOString()) : null;

    persistParticipantsToDisk(participants);
    broadcastSSE('attendance_updated', participant);
    if (participant.attended) {
      broadcastSSE('attendance_confirmed', { participant, timestamp: participant.attendedAt });
    }

    console.log(`[SERVER] Presença confirmada via QR: ${participant.fullName}`);
    res.json({ 
      success: true, 
      status: 'success', 
      participant, 
      message: participant.attended ? 'Presença confirmada com sucesso!' : 'Presença desmarcada.' 
    });
  });

  // 8. Excluir participante (registra tombstone definitivo para impedir re-surgimento)
  app.delete('/api/participants/:id', (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'ID do participante obrigatório.' });

    // Registra o ID na lista persistente de excluídos (tombstones)
    deletedParticipantIds.add(id);
    persistDeletedIdsToDisk();

    const initialLength = participants.length;
    participants = participants.filter((p) => p.id !== id);

    persistParticipantsToDisk(participants);
    broadcastSSE('participant_deleted', id);

    console.log(`[SERVER] Participante ${id} excluído com sucesso e adicionado ao registro de exclusões.`);
    res.json({ success: true, id });
  });

  // 9. Excluir múltiplos participantes
  app.post('/api/participants/delete-multiple', (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.json({ success: true, deletedCount: 0 });
    }

    // Registra todos os IDs na lista persistente de excluídos
    ids.forEach((id) => {
      if (id) deletedParticipantIds.add(String(id));
    });
    persistDeletedIdsToDisk();

    const idsSet = new Set(ids);
    const initialLength = participants.length;
    participants = participants.filter((p) => !idsSet.has(p.id));

    persistParticipantsToDisk(participants);
    broadcastSSE('multiple_deleted', ids);

    console.log(`[SERVER] ${ids.length} participantes excluídos com sucesso.`);
    res.json({ success: true, deletedCount: initialLength - participants.length, ids });
  });

  // 10. Resetar participantes
  app.post('/api/participants/reset', (req, res) => {
    const newItems = Array.isArray(req.body?.participants) ? req.body.participants : [];
    
    // Se for reset para demonstração, remove os IDs dos itens inseridos da lista de excluídos
    if (req.body?.clearTombstones) {
      deletedParticipantIds.clear();
      persistDeletedIdsToDisk();
    } else {
      newItems.forEach((p) => {
        if (p && p.id) {
          deletedParticipantIds.delete(p.id);
        }
      });
      persistDeletedIdsToDisk();
    }

    participants = newItems;
    persistParticipantsToDisk(participants);
    broadcastSSE('reset', participants);
    res.json({ success: true, count: participants.length });
  });

  // 11. Configurações da Empresa
  app.get('/api/company-settings', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json(companySettings);
  });

  app.post('/api/company-settings', (req, res) => {
    if (req.body && typeof req.body === 'object') {
      companySettings = { ...companySettings, ...req.body };
      writeJsonFile(SETTINGS_FILE, companySettings);
      broadcastSSE('settings_updated', companySettings);
      return res.json({ success: true, settings: companySettings });
    }
    res.status(400).json({ error: 'Dados de configurações inválidos.' });
  });

  // 12. Lista de Eventos
  app.get('/api/events-list', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json(eventsList);
  });

  app.post('/api/events-list', (req, res) => {
    if (Array.isArray(req.body)) {
      eventsList = req.body;
      writeJsonFile(EVENTS_FILE, eventsList);
      broadcastSSE('events_updated', eventsList);
      return res.json({ success: true, events: eventsList });
    }
    res.status(400).json({ error: 'Formato inválido para lista de eventos.' });
  });

  // 13. Server-Sent Events (SSE) para atualização em tempo real de celulares
  app.get('/api/events', (_req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    const clientId = nextClientId++;
    const client: SseClient = { id: clientId, res };
    sseClients.push(client);

    // Envia estado inicial ao cliente conectado incluindo lista de deletados
    res.write(
      `data: ${JSON.stringify({
        type: 'init',
        data: {
          participants,
          deletedIds: Array.from(deletedParticipantIds),
          settings: companySettings,
          events: eventsList,
        },
      })}\n\n`
    );

    _req.on('close', () => {
      sseClients = sseClients.filter((c) => c.id !== clientId);
    });
  });

  // Middleware de Assets: Vite em Dev, estático em Produção
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[SERVER] Servidor rodando em http://${HOST}:${PORT}`);
  });
}

startServer();

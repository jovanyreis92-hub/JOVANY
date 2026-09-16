import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { autoCorrectAndAccent } from "./src/utils/textCorrector";

interface EventItem {
  id: string;
  name: string;
  date: string;
  location?: string;
  description?: string;
  active: boolean;
  createdAt: string;
}

interface Participant {
  id: string;
  fullName: string;
  registrationNumber: string;
  company: string;
  eventId?: string;
  eventName?: string;
  createdAt: string;
  attended: boolean;
  attendedAt?: string | null;
}

interface CompanySettings {
  companyName: string;
  eventName: string;
  logoUrl: string | null;
  adminUsername?: string;
  adminPassword?: string;
  fontFamily?: string;
  layoutScale?: string;
  publicAppUrl?: string;
}

const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: "Minha Empresa",
  eventName: "Evento Corporativo & Treinamento 2026",
  logoUrl: null,
  adminUsername: "admin",
  adminPassword: "1234",
  fontFamily: "inter",
  layoutScale: "normal",
  publicAppUrl: "https://ais-pre-rihuh2lzyxgzrc2qmh3tyj-161635627789.us-east1.run.app",
};

const INITIAL_EVENTS: EventItem[] = [
  {
    id: "event_1",
    name: "Evento Corporativo & Treinamento 2026",
    date: "2026-09-20",
    location: "Auditório Principal - Sede",
    description: "Treinamento de integração corporativa e apresentação de metas estratégicas.",
    active: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
  },
  {
    id: "event_2",
    name: "Workshop de Tecnologia & Inovação",
    date: "2026-10-05",
    location: "Sala de Conferências A",
    description: "Capacitação prática em ferramentas digitais e inteligência artificial aplicada.",
    active: false,
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
  },
];

const INITIAL_PARTICIPANTS: Participant[] = [
  {
    id: "part_1",
    fullName: "Carlos Eduardo Silva",
    registrationNumber: "1001",
    company: "Tech Solutions Brasil",
    eventId: "event_1",
    eventName: "Evento Corporativo & Treinamento 2026",
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    attended: true,
    attendedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "part_2",
    fullName: "Mariana Albuquerque Costa",
    registrationNumber: "1002",
    company: "Inovação Digital Ltda",
    eventId: "event_1",
    eventName: "Evento Corporativo & Treinamento 2026",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    attended: false,
    attendedAt: null,
  },
  {
    id: "part_3",
    fullName: "Roberto Fernando Mendes",
    registrationNumber: "1003",
    company: "PetroSoft Engenharia",
    eventId: "event_1",
    eventName: "Evento Corporativo & Treinamento 2026",
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    attended: true,
    attendedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: "part_4",
    fullName: "Juliana Beatriz Santos",
    registrationNumber: "1004",
    company: "Global Logística",
    eventId: "event_2",
    eventName: "Workshop de Tecnologia & Inovação",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    attended: false,
    attendedAt: null,
  },
  {
    id: "part_5",
    fullName: "Lucas Gabriel Oliveira",
    registrationNumber: "1005",
    company: "Nexus Consultoria",
    eventId: "event_2",
    eventName: "Workshop de Tecnologia & Inovação",
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    attended: false,
    attendedAt: null,
  },
];

// Diretório e arquivos de persistência centralizada
const DATA_DIR = path.join(process.cwd(), "data");
const PARTICIPANTS_FILE = path.join(DATA_DIR, "participants.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const EVENTS_FILE = path.join(DATA_DIR, "events.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadParticipants(): Participant[] {
  ensureDataDir();
  try {
    if (fs.existsSync(PARTICIPANTS_FILE)) {
      const data = fs.readFileSync(PARTICIPANTS_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error("Erro ao carregar participants.json:", err);
  }
  saveParticipants(INITIAL_PARTICIPANTS);
  return INITIAL_PARTICIPANTS;
}

function saveParticipants(participants: Participant[]) {
  ensureDataDir();
  try {
    fs.writeFileSync(PARTICIPANTS_FILE, JSON.stringify(participants, null, 2), "utf-8");
  } catch (err) {
    console.error("Erro ao salvar participants.json:", err);
  }
}

function loadSettings(): CompanySettings {
  ensureDataDir();
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
      const parsed = JSON.parse(data);
      return { ...DEFAULT_COMPANY_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.error("Erro ao carregar settings.json:", err);
  }
  saveSettings(DEFAULT_COMPANY_SETTINGS);
  return DEFAULT_COMPANY_SETTINGS;
}

function saveSettings(settings: CompanySettings) {
  ensureDataDir();
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
  } catch (err) {
    console.error("Erro ao salvar settings.json:", err);
  }
}

function loadEvents(): EventItem[] {
  ensureDataDir();
  try {
    if (fs.existsSync(EVENTS_FILE)) {
      const data = fs.readFileSync(EVENTS_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error("Erro ao carregar events.json:", err);
  }
  saveEvents(INITIAL_EVENTS);
  return INITIAL_EVENTS;
}

function saveEvents(events: EventItem[]) {
  ensureDataDir();
  try {
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), "utf-8");
  } catch (err) {
    console.error("Erro ao salvar events.json:", err);
  }
}

let memoryParticipants: Participant[] = loadParticipants();
let memorySettings: CompanySettings = loadSettings();
let memoryEvents: EventItem[] = loadEvents();

// Lista de clientes conectados ao Server-Sent Events (SSE) para atualização em tempo real
type SseClient = {
  id: number;
  res: express.Response;
};
const sseClients: SseClient[] = [];
let nextClientId = 1;

function broadcastEvent(type: string, payload: unknown) {
  const data = JSON.stringify({ type, data: payload, timestamp: Date.now() });
  const message = `data: ${data}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    try {
      sseClients[i].res.write(message);
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares essenciais
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));

  // CORS aberto para que conexões móveis (4G, 5G, Wi-Fi variado) funcionem sem bloqueio
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // --- ROTAS DA API DE SINCRONIZAÇÃO EM TEMPO REAL ---

  // Health check e status de conexões multi-dispositivo
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      serverTime: new Date().toISOString(),
      activeClients: sseClients.length,
      participantsCount: memoryParticipants.length,
    });
  });

  // Informações de rede e URL pública para celulares e participantes externos
  app.get("/api/public-info", (req, res) => {
    const host = (req.headers["x-forwarded-host"] || req.headers.host || "") as string;
    const proto = (req.headers["x-forwarded-proto"] || "https") as string;
    let publicOrigin = host ? `${proto}://${host}` : "";
    if (publicOrigin.includes("ais-dev-")) {
      publicOrigin = publicOrigin.replace("ais-dev-", "ais-pre-");
    }
    res.json({
      publicOrigin,
      configuredUrl: memorySettings.publicAppUrl || null,
      shareUrl: `${memorySettings.publicAppUrl || publicOrigin || ""}/?tab=register`,
    });
  });

  // Server-Sent Events para notificações instantâneas a todos os celulares
  app.get("/api/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const clientId = nextClientId++;
    const client: SseClient = { id: clientId, res };
    sseClients.push(client);

    // Envia estado inicial imediato na conexão
    const initialData = JSON.stringify({
      type: "init",
      data: {
        participants: memoryParticipants,
        settings: memorySettings,
        events: memoryEvents,
      },
      timestamp: Date.now(),
    });
    res.write(`data: ${initialData}\n\n`);

    // Heartbeat periódico (a cada 25 segundos) para manter túneis de 4G/5G ativos
    const heartbeat = setInterval(() => {
      try {
        res.write(": keepalive\n\n");
      } catch {
        clearInterval(heartbeat);
      }
    }, 25000);

    req.on("close", () => {
      clearInterval(heartbeat);
      const index = sseClients.findIndex((c) => c.id === clientId);
      if (index !== -1) {
        sseClients.splice(index, 1);
      }
    });
  });

  // Listar eventos
  app.get("/api/events-list", (req, res) => {
    res.json(memoryEvents);
  });

  // Salvar/atualizar lista completa de eventos
  app.post("/api/events-list", (req, res) => {
    const incoming = req.body;
    if (!Array.isArray(incoming)) {
      res.status(400).json({ success: false, error: "Formato inválido. Esperada lista de eventos." });
      return;
    }
    memoryEvents = incoming;
    saveEvents(memoryEvents);
    broadcastEvent("events_updated", memoryEvents);
    res.json({ success: true, events: memoryEvents });
  });

  // Listar todos os participantes
  app.get("/api/participants", (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.json(memoryParticipants);
  });

  // Cadastrar novo participante (enviado de qualquer celular em qualquer rede)
  app.post("/api/participants", (req, res) => {
    const { id, fullName, registrationNumber, company, eventId, eventName, createdAt } = req.body;

    const trimmedName = autoCorrectAndAccent((fullName || "").trim());
    const trimmedMatricula = (registrationNumber || "").toString().replace(/\D/g, "").trim();
    const trimmedCompany = autoCorrectAndAccent((company || "").trim());

    if (!trimmedName) {
      res.status(400).json({ success: false, error: "Nome completo é obrigatório." });
      return;
    }

    if (!trimmedMatricula) {
      res.status(400).json({ success: false, error: "O número de matrícula é obrigatório e deve conter somente números." });
      return;
    }

    const activeEvt = memoryEvents.find((e) => e.active) || memoryEvents[0];
    const targetEventId = eventId || activeEvt?.id || "event_1";
    const targetEventName = eventName || activeEvt?.name || "Evento Corporativo";

    // Verifica duplicação de matrícula dentro do mesmo evento (case-insensitive)
    const exists = memoryParticipants.some(
      (p) =>
        p.registrationNumber.toLowerCase() === trimmedMatricula.toLowerCase() &&
        (!p.eventId || p.eventId === targetEventId)
    );

    if (exists) {
      res.status(409).json({
        success: false,
        error: `Já existe um participante com a matrícula "${trimmedMatricula}" neste evento.`,
      });
      return;
    }

    const finalId = (id && typeof id === "string" && id.startsWith("part_"))
      ? id.trim()
      : `part_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newParticipant: Participant = {
      id: finalId,
      fullName: trimmedName,
      registrationNumber: trimmedMatricula,
      company: trimmedCompany || "Não informada",
      eventId: targetEventId,
      eventName: targetEventName,
      createdAt: createdAt || new Date().toISOString(),
      attended: false,
      attendedAt: null,
    };

    // Insere no início da lista
    memoryParticipants = [newParticipant, ...memoryParticipants];
    saveParticipants(memoryParticipants);

    console.log(`[NOVO CADASTRO RECEBIDO] ${newParticipant.fullName} (Matrícula: ${newParticipant.registrationNumber}) - Evento: ${newParticipant.eventName}`);

    // Notifica instantaneamente todos os outros celulares e painéis conectados via SSE
    broadcastEvent("participant_added", newParticipant);

    res.status(201).json({ success: true, participant: newParticipant });
  });

  // Sincronização em lote para participantes cadastrados em modo offline
  app.post("/api/participants/batch", (req, res) => {
    const incoming = req.body?.participants;
    if (!Array.isArray(incoming) || incoming.length === 0) {
      res.status(400).json({ success: false, error: "Lista de participantes inválida." });
      return;
    }

    const added: Participant[] = [];
    for (const item of incoming) {
      const matricula = (item.registrationNumber || "").toString().replace(/\D/g, "").trim();
      const name = autoCorrectAndAccent((item.fullName || "").trim());
      if (!name || !matricula) continue;

      const eventId = item.eventId || "event_1";
      const alreadyExists = memoryParticipants.some(
        (p) => p.registrationNumber.toLowerCase() === matricula.toLowerCase() && (!p.eventId || p.eventId === eventId)
      );

      if (!alreadyExists) {
        const participant: Participant = {
          id: item.id || `part_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          fullName: name,
          registrationNumber: matricula,
          company: autoCorrectAndAccent((item.company || "").trim()) || "NÃO INFORMADA",
          eventId,
          eventName: item.eventName || "Evento Corporativo",
          createdAt: item.createdAt || new Date().toISOString(),
          attended: !!item.attended,
          attendedAt: item.attendedAt || null,
        };
        memoryParticipants.unshift(participant);
        added.push(participant);
        broadcastEvent("participant_added", participant);
      }
    }

    if (added.length > 0) {
      saveParticipants(memoryParticipants);
      console.log(`[SINCRONIZAÇÃO EM LOTE] ${added.length} participantes sincronizados com sucesso.`);
    }

    res.json({ success: true, addedCount: added.length, participants: memoryParticipants });
  });

  // Marcar presença por QR Code / Matrícula (leitor da portaria ou celular de recepção)
  app.post("/api/participants/attendance", (req, res) => {
    const { codeOrMatricula } = req.body;
    const cleanInput = (codeOrMatricula || "").trim();

    if (!cleanInput) {
      res.status(400).json({ status: "not_found", message: "Nenhum código fornecido." });
      return;
    }

    let targetId: string | null = null;
    let targetMatricula: string | null = null;
    let targetName: string | null = null;

    // Tenta extrair JSON caso o QR code contenha payload em JSON
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
        // ignora
      }
    }

    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, "");
    const normInput = normalize(cleanInput);

    const participantIndex = memoryParticipants.findIndex((p) => {
      if (targetId && p.id === targetId) return true;
      if (p.id === cleanInput) return true;

      if (targetMatricula) {
        if (p.registrationNumber.toLowerCase() === targetMatricula.toLowerCase()) return true;
        if (normalize(p.registrationNumber) === normalize(targetMatricula)) return true;
      }

      if (targetName && p.fullName.toLowerCase() === targetName.toLowerCase()) return true;

      if (p.registrationNumber.toLowerCase() === cleanInput.toLowerCase()) return true;
      if (normInput && normalize(p.registrationNumber) === normInput) return true;

      const digitsOnly = cleanInput.replace(/\D/g, "");
      const matriculaDigits = p.registrationNumber.replace(/\D/g, "");
      if (digitsOnly && matriculaDigits && digitsOnly.length >= 3 && digitsOnly === matriculaDigits) {
        return true;
      }

      if (cleanInput.includes(p.registrationNumber) || cleanInput.includes(p.id)) {
        return true;
      }

      return false;
    });

    if (participantIndex === -1) {
      const displayCode = cleanInput.length > 50 ? `${cleanInput.substring(0, 47)}...` : cleanInput;
      res.status(404).json({
        status: "not_found",
        message: `Participante não encontrado com o código: "${displayCode}".`,
      });
      return;
    }

    const currentPart = memoryParticipants[participantIndex];

    if (currentPart.attended) {
      const timeStr = currentPart.attendedAt
        ? new Date(currentPart.attendedAt).toLocaleTimeString("pt-BR")
        : "";
      res.json({
        status: "already_checked",
        message: `Presença de ${currentPart.fullName} já havia sido registrada anteriormente${timeStr ? ` às ${timeStr}` : ""}.`,
        participant: currentPart,
      });
      return;
    }

    const updatedParticipant: Participant = {
      ...currentPart,
      attended: true,
      attendedAt: new Date().toISOString(),
    };

    memoryParticipants[participantIndex] = updatedParticipant;
    saveParticipants(memoryParticipants);

    // Notifica todos os dispositivos conectados
    broadcastEvent("attendance_updated", updatedParticipant);

    res.json({
      status: "success",
      message: `Presença confirmada com sucesso para ${updatedParticipant.fullName}!`,
      participant: updatedParticipant,
    });
  });

  // Alternar presença manualmente pelo painel
  app.post("/api/participants/:id/toggle", (req, res) => {
    const { id } = req.params;
    const index = memoryParticipants.findIndex((p) => p.id === id);

    if (index === -1) {
      res.status(404).json({ success: false, error: "Participante não encontrado." });
      return;
    }

    const current = memoryParticipants[index];
    const newAttended = !current.attended;
    const updated: Participant = {
      ...current,
      attended: newAttended,
      attendedAt: newAttended ? new Date().toISOString() : null,
    };

    memoryParticipants[index] = updated;
    saveParticipants(memoryParticipants);

    broadcastEvent("attendance_updated", updated);

    res.json({ success: true, participant: updated, attended: newAttended });
  });

  // Atualizar / Alterar dados de um participante individual
  app.put("/api/participants/:id", (req, res) => {
    const { id } = req.params;
    const { fullName, registrationNumber, company, eventId, eventName, attended } = req.body;

    const index = memoryParticipants.findIndex((p) => p.id === id);
    if (index === -1) {
      res.status(404).json({ success: false, error: "Participante não encontrado." });
      return;
    }

    const current = memoryParticipants[index];
    const rawName = fullName !== undefined ? fullName : current.fullName;
    const trimmedName = autoCorrectAndAccent((rawName || "").trim());
    const rawMatricula = registrationNumber !== undefined ? registrationNumber.toString() : current.registrationNumber;
    const trimmedMatricula = rawMatricula.replace(/\D/g, "").trim();
    const rawCompany = company !== undefined ? company : current.company;
    const trimmedCompany = autoCorrectAndAccent((rawCompany || "").trim());

    if (!trimmedName) {
      res.status(400).json({ success: false, error: "O nome completo do participante é obrigatório." });
      return;
    }

    if (!trimmedMatricula) {
      res.status(400).json({ success: false, error: "A matrícula é obrigatória e deve conter números." });
      return;
    }

    const targetEventId = eventId !== undefined ? eventId : (current.eventId || "event_1");
    // Verifica se outro participante já possui essa mesma matrícula no mesmo evento
    const duplicate = memoryParticipants.some(
      (p) => p.id !== id && p.registrationNumber.toLowerCase() === trimmedMatricula.toLowerCase() && (!p.eventId || p.eventId === targetEventId)
    );
    if (duplicate) {
      res.status(409).json({ success: false, error: `A matrícula "${trimmedMatricula}" já pertence a outro participante neste evento.` });
      return;
    }

    let targetEventName = eventName !== undefined ? eventName : current.eventName;
    if (!targetEventName && targetEventId) {
      const foundEvt = memoryEvents.find((e) => e.id === targetEventId);
      if (foundEvt) targetEventName = foundEvt.name;
    }

    let newAttended = current.attended;
    let newAttendedAt = current.attendedAt;
    if (attended !== undefined) {
      newAttended = Boolean(attended);
      if (newAttended && !current.attended) {
        newAttendedAt = new Date().toISOString();
      } else if (!newAttended) {
        newAttendedAt = null;
      }
    }

    const updated: Participant = {
      ...current,
      fullName: trimmedName,
      registrationNumber: trimmedMatricula,
      company: trimmedCompany || "Não informada",
      eventId: targetEventId,
      eventName: targetEventName || current.eventName || "Evento Geral",
      attended: newAttended,
      attendedAt: newAttendedAt,
    };

    memoryParticipants[index] = updated;
    saveParticipants(memoryParticipants);

    console.log(`[PARTICIPANTE EDITADO] ${updated.fullName} (${updated.registrationNumber}) - Evento: ${updated.eventName}`);
    broadcastEvent("participant_updated", updated);

    res.json({ success: true, participant: updated });
  });

  // Excluir participante
  app.delete("/api/participants/:id", (req, res) => {
    const { id } = req.params;
    const prevLength = memoryParticipants.length;
    memoryParticipants = memoryParticipants.filter((p) => p.id !== id);

    if (memoryParticipants.length !== prevLength) {
      saveParticipants(memoryParticipants);
      broadcastEvent("participant_deleted", id);
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: "Participante não encontrado." });
    }
  });

  // Exclusão múltipla
  app.post("/api/participants/delete-multiple", (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, count: 0 });
      return;
    }

    const idSet = new Set(ids);
    const prevLength = memoryParticipants.length;
    memoryParticipants = memoryParticipants.filter((p) => !idSet.has(p.id));
    const removedCount = prevLength - memoryParticipants.length;

    if (removedCount > 0) {
      saveParticipants(memoryParticipants);
      broadcastEvent("multiple_deleted", ids);
    }

    res.json({ success: true, count: removedCount });
  });

  // Restaurar dados de demonstração
  app.post("/api/participants/reset", (req, res) => {
    memoryParticipants = [...INITIAL_PARTICIPANTS];
    saveParticipants(memoryParticipants);
    broadcastEvent("reset", memoryParticipants);
    res.json({ success: true, participants: memoryParticipants });
  });

  // Obter configurações da empresa
  app.get("/api/company-settings", (req, res) => {
    res.json(memorySettings);
  });

  // Atualizar configurações da empresa
  app.post("/api/company-settings", (req, res) => {
    const incoming = req.body;
    memorySettings = {
      ...memorySettings,
      ...incoming,
    };
    saveSettings(memorySettings);
    broadcastEvent("settings_updated", memorySettings);
    res.json({ success: true, settings: memorySettings });
  });

  // Vite middleware em desenvolvimento ou arquivos estáticos em produção
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        allowedHosts: true,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor de credenciamento multi-dispositivo rodando em http://localhost:${PORT}`);
  });
}

startServer();

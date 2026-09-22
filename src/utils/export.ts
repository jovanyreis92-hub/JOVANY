import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { Participant } from '../types';
import { getCompanySettings, getStoredEvents } from './storage';

export async function exportToExcel(
  participants: Participant[], 
  filenamePrefix = 'lista-presenca',
  eventNameFilter?: string
): Promise<void> {
  const company = getCompanySettings();
  const total = participants.length;
  const presentes = participants.filter(p => p.attended).length;
  const ausentes = total - presentes;
  const taxaPresenca = total > 0 ? `${((presentes / total) * 100).toFixed(1)}%` : '0%';
  const displayEventName = eventNameFilter || company.eventName || 'Evento Geral';
  const events = getStoredEvents();
  const matchedEvent = events.find((e) => e.name === displayEventName || e.id === displayEventName);
  const eventLoc = matchedEvent?.location || '';

  const workbook = new ExcelJS.Workbook();
  workbook.creator = company.companyName || 'Sistema de Credenciamento';
  workbook.created = new Date();

  // 1. Aba principal da lista de participantes
  const sheet = workbook.addWorksheet('Lista de Presença', {
    views: [{ showGridLines: true }]
  });

  // Título e Cabeçalho Institucional
  sheet.mergeCells('A1:G1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `${(company.companyName || 'EMPRESA').toUpperCase()} - RELATÓRIO OFICIAL DE PRESENÇA`;
  titleCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // slate-900
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 28;

  sheet.mergeCells('A2:G2');
  const subCell = sheet.getCell('A2');
  subCell.value = `Evento: ${displayEventName}${eventLoc ? ` | Local: ${eventLoc}` : ''} | Emitido em: ${new Date().toLocaleString('pt-BR')}`;
  subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF334155' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(2).height = 20;

  // Linha em branco
  sheet.getRow(3).height = 8;

  // Cabeçalho das Colunas
  const headers = ['Nº', 'Nome Completo', 'Nº de Matrícula', 'Empresa', 'Evento', 'Situação (Presença)', 'Horário de Confirmação'];
  const headerRow = sheet.getRow(4);
  headerRow.values = headers;
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // slate-800
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
  });

  // Linhas dos Participantes
  participants.forEach((p, index) => {
    const rowNumber = 5 + index;
    const row = sheet.getRow(rowNumber);
    const isPresent = p.attended;
    const statusText = isPresent ? 'PRESENTE' : 'AUSENTE';
    const eventName = p.eventName || displayEventName;

    row.values = [
      index + 1,
      p.fullName,
      p.registrationNumber,
      p.company || 'Não informada',
      eventName,
      statusText,
      p.attendedAt ? new Date(p.attendedAt).toLocaleString('pt-BR') : '-',
    ];
    row.height = 20;

    const isEven = index % 2 === 0;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 10 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      // Todos os dados do participante 100% centralizados
      cell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Fundo padrão zebrado para colunas comuns
      if (colNumber !== 6) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' },
        };
      }
    });

    // SITUAÇÃO: PRESENTE EM COR VERDE, AUSENTE EM COR AMARELA
    const statusCell = row.getCell(6);
    if (isPresent) {
      // Cor Verde para Presente
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD1FAE5' }, // Verde claro elegante (emerald-100)
      };
      statusCell.font = {
        name: 'Calibri',
        size: 10,
        bold: true,
        color: { argb: 'FF065F46' }, // Verde escuro para leitura nítida (emerald-800)
      };
      statusCell.border = {
        top: { style: 'thin', color: { argb: 'FFA7F3D0' } },
        bottom: { style: 'thin', color: { argb: 'FFA7F3D0' } },
        left: { style: 'thin', color: { argb: 'FFA7F3D0' } },
        right: { style: 'thin', color: { argb: 'FFA7F3D0' } },
      };
    } else {
      // Cor Amarela para Ausente
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEF08A' }, // Amarelo nítido e suave (yellow-200)
      };
      statusCell.font = {
        name: 'Calibri',
        size: 10,
        bold: true,
        color: { argb: 'FF854D0E' }, // Âmbar/Amarelo escuro com contraste perfeito (yellow-800)
      };
      statusCell.border = {
        top: { style: 'thin', color: { argb: 'FFFDE047' } },
        bottom: { style: 'thin', color: { argb: 'FFFDE047' } },
        left: { style: 'thin', color: { argb: 'FFFDE047' } },
        right: { style: 'thin', color: { argb: 'FFFDE047' } },
      };
    }
  });

  // Linha totalizadora de rodapé da tabela com a contagem de inscritos
  const totalRowNumber = 5 + participants.length;
  const totalRow = sheet.getRow(totalRowNumber);
  totalRow.values = [
    '',
    `Total: ${total} inscritos`,
    '',
    '',
    '',
    `${presentes} Presentes (${taxaPresenca})`,
    `${ausentes} Ausentes`
  ];
  totalRow.height = 24;
  totalRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  // Largura das Colunas
  sheet.columns = [
    { key: 'num', width: 7 },
    { key: 'nome', width: 34 },
    { key: 'matricula', width: 18 },
    { key: 'empresa', width: 26 },
    { key: 'evento', width: 28 },
    { key: 'situacao', width: 22 },
    { key: 'horario', width: 24 },
  ];

  // 2. Aba de Resumo Geral das Métricas
  const summarySheet = workbook.addWorksheet('Resumo Executivo');
  summarySheet.columns = [{ width: 28 }, { width: 34 }];
  const sTitle = summarySheet.getRow(1);
  sTitle.values = ['Métrica', 'Valor'];
  sTitle.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } }; // sky-600
  sTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  sTitle.height = 24;

  const metrics: [string, string | number][] = [
    ['Empresa / Instituição', company.companyName || '-'],
    ['Evento', displayEventName],
    ['Total de Inscritos', total],
    ['Total de Presentes', presentes],
    ['Total de Ausentes', ausentes],
    ['Taxa de Presença', taxaPresenca],
    ['Data da Emissão', new Date().toLocaleString('pt-BR')],
  ];

  metrics.forEach((m, idx) => {
    const r = summarySheet.getRow(2 + idx);
    r.values = m;
    r.height = 20;
    r.getCell(1).font = { bold: true, color: { argb: 'FF334155' } };
    r.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    if (m[0].includes('Presentes')) {
      r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
      r.getCell(2).font = { bold: true, color: { argb: 'FF065F46' } };
    } else if (m[0].includes('Ausentes')) {
      r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF08A' } };
      r.getCell(2).font = { bold: true, color: { argb: 'FF854D0E' } };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `${filenamePrefix}-${dateStr}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToPDF(
  participants: Participant[], 
  filenamePrefix = 'lista-presenca',
  eventNameFilter?: string
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const company = getCompanySettings();
  const total = participants.length;
  const presentes = participants.filter(p => p.attended).length;
  const ausentes = total - presentes;
  const taxaPresenca = total > 0 ? `${((presentes / total) * 100).toFixed(1)}%` : '0%';
  const dataEmissao = new Date().toLocaleString('pt-BR');
  const displayEvent = eventNameFilter || company.eventName || 'Evento Geral';
  const pdfEvents = getStoredEvents();
  const matchedPdfEvent = pdfEvents.find((e) => e.name === displayEvent || e.id === displayEvent);
  const pdfEventLoc = matchedPdfEvent?.location || '';

  // Cabeçalho institucional centralizado na página A4 (largura 210mm, centro = 105mm)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  const title = company.companyName 
    ? `${company.companyName.toUpperCase()} - LISTA DE PRESENÇA` 
    : 'LISTA DE PRESENÇA E CREDENCIAMENTO';
  doc.text(title, 105, 12, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(56, 189, 248); // sky-400
  doc.text(`Evento: ${displayEvent}${pdfEventLoc ? ` | Local: ${pdfEventLoc}` : ''}`, 105, 18, { align: 'center' });

  doc.setTextColor(203, 213, 225); // slate-300
  doc.setFontSize(8);
  doc.text(`Relatório Oficial emitido em: ${dataEmissao}`, 105, 24, { align: 'center' });

  // Bloco de Métricas / Resumo centralizado
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 35, 182, 19, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 35, 182, 19, 2, 2, 'S');

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('TOTAL INSCRITOS', 36.75, 41, { align: 'center' });
  doc.text('PRESENTES', 82.25, 41, { align: 'center' });
  doc.text('AUSENTES', 127.75, 41, { align: 'center' });
  doc.text('TAXA DE ADESÃO', 173.25, 41, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(`${total}`, 36.75, 49, { align: 'center' });

  doc.setTextColor(22, 101, 52); // green-800
  doc.text(`${presentes}`, 82.25, 49, { align: 'center' });

  doc.setTextColor(133, 77, 14); // yellow-800
  doc.text(`${ausentes}`, 127.75, 49, { align: 'center' });

  doc.setTextColor(2, 132, 199); // sky-600
  doc.text(`${taxaPresenca}`, 173.25, 49, { align: 'center' });

  // Tabela de participantes com todos os dados rigorosamente centralizados
  const tableRows = participants.map((p, index) => [
    String(index + 1),
    p.fullName,
    p.registrationNumber,
    p.company || 'Não informada',
    p.eventName || displayEvent,
    p.attended ? 'PRESENTE' : 'AUSENTE',
    p.attendedAt ? new Date(p.attendedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-',
  ]);

  autoTable(doc, {
    startY: 58,
    head: [['#', 'Nome Completo', 'Matrícula', 'Empresa', 'Evento', 'Situação', 'Horário']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
      valign: 'middle',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      halign: 'center',
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', valign: 'middle' },
      1: { cellWidth: 42, halign: 'center', valign: 'middle' },
      2: { cellWidth: 22, halign: 'center', valign: 'middle' },
      3: { cellWidth: 32, halign: 'center', valign: 'middle' },
      4: { cellWidth: 32, halign: 'center', valign: 'middle' },
      5: { cellWidth: 24, halign: 'center', valign: 'middle' },
      6: { cellWidth: 20, halign: 'center', valign: 'middle' },
    },
    didParseCell: (data) => {
      // Garante centralização vertical e horizontal em todas as células do corpo
      if (data.section === 'body') {
        data.cell.styles.halign = 'center';
        data.cell.styles.valign = 'middle';
      }

      // Situação (Presença na coluna índice 5): Presente cor verde, Ausente cor amarela
      if (data.section === 'body' && data.column.index === 5) {
        if (data.cell.raw === 'PRESENTE') {
          // Verde: Fundo verde suave + texto verde escuro em negrito
          data.cell.styles.fillColor = [209, 250, 229]; // emerald-100
          data.cell.styles.textColor = [6, 95, 70];    // emerald-800
          data.cell.styles.fontStyle = 'bold';
        } else {
          // Amarela: Fundo amarelo suave + texto âmbar/amarelo escuro em negrito
          data.cell.styles.fillColor = [254, 240, 138]; // yellow-200
          data.cell.styles.textColor = [133, 77, 14];   // yellow-800
          data.cell.styles.fontStyle = 'bold';
        }
      }

      // Centralização vertical e horizontal no rodapé da tabela
      if (data.section === 'foot') {
        data.cell.styles.halign = 'center';
        data.cell.styles.valign = 'middle';
      }
    },
    foot: [
      ['', `Total: ${total} inscritos`, '', '', '', `${presentes} presentes`, `${ausentes} ausentes`]
    ],
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      valign: 'middle',
    },
    didDrawPage: (data) => {
      // Rodapé com paginação
      const str = `Página ${data.pageNumber} de ${doc.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(str, 196, 287, { align: 'right' });
      doc.text('Sistema de Credenciamento e Presença QR', 14, 287);
    }
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`${filenamePrefix}-${dateStr}.pdf`);
}

// -------------------------------------------------------------
// IMPORTAÇÃO DE DADOS DO EXCEL (.xlsx, .xls, .csv)
// -------------------------------------------------------------

export interface ParsedImportRow {
  rawRow: number;
  fullName: string;
  registrationNumber: string;
  company: string;
  attended: boolean;
  eventName?: string;
  isValid: boolean;
  error?: string;
}

export interface ParseExcelResult {
  rows: ParsedImportRow[];
  validParticipants: Participant[];
  totalRows: number;
  validCount: number;
  invalidCount: number;
  warnings: string[];
  fileName: string;
}

/**
 * Lê e analisa um arquivo de planilha (.xlsx, .xls, .csv)
 * Identifica automaticamente colunas de Nome, Matrícula, Empresa e Presença
 */
export async function parseExcelFile(
  file: File,
  options?: {
    defaultEventId?: string;
    defaultEventName?: string;
  }
): Promise<ParseExcelResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('A planilha selecionada está vazia ou não contém abas.');
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!rawData || rawData.length === 0) {
    throw new Error('A planilha está vazia.');
  }

  // 1. Detecta em qual linha está o cabeçalho (busca até a linha 12)
  let headerRowIndex = -1;
  let nameCol = -1;
  let matriculaCol = -1;
  let companyCol = -1;
  let attendanceCol = -1;
  let eventCol = -1;

  for (let r = 0; r < Math.min(rawData.length, 12); r++) {
    const row = rawData[r];
    if (!Array.isArray(row)) continue;

    const rowStrings = row.map((c) => String(c || '').toLowerCase().trim());
    const hasName = rowStrings.some((s) => s.includes('nome') || s.includes('name') || s.includes('participante'));
    const hasMatricula = rowStrings.some((s) => s.includes('matr') || s.includes('inscri') || s.includes('registro') || s.includes('código') || s.includes('codigo') || s.includes('cpf'));

    if (hasName || hasMatricula) {
      headerRowIndex = r;
      rowStrings.forEach((text, colIdx) => {
        if (nameCol === -1 && (text.includes('nome') || text.includes('name') || text.includes('participante') || text.includes('aluno'))) {
          nameCol = colIdx;
        } else if (matriculaCol === -1 && (text.includes('matr') || text.includes('inscri') || text.includes('registro') || text.includes('código') || text.includes('codigo') || text.includes('cpf') || text === 'id')) {
          matriculaCol = colIdx;
        } else if (companyCol === -1 && (text.includes('empresa') || text.includes('company') || text.includes('institui') || text.includes('organiza') || text.includes('entidade') || text.includes('setor'))) {
          companyCol = colIdx;
        } else if (attendanceCol === -1 && (text.includes('presen') || text.includes('presente') || text.includes('attended') || text.includes('status') || text.includes('situa'))) {
          attendanceCol = colIdx;
        } else if (eventCol === -1 && (text.includes('evento') || text.includes('event'))) {
          eventCol = colIdx;
        }
      });
      break;
    }
  }

  // Se não encontrou cabeçalhos explícitos, adota ordem padrão baseada no tipo de conteúdo
  if (headerRowIndex === -1) {
    headerRowIndex = 0;
    // Tenta deduzir se a primeira coluna é número (matrícula) ou nome
    const firstCell = String(rawData[0]?.[0] || '').trim();
    if (/^\d+$/.test(firstCell)) {
      matriculaCol = 0;
      nameCol = 1;
      companyCol = 2;
      attendanceCol = 3;
    } else {
      nameCol = 0;
      matriculaCol = 1;
      companyCol = 2;
      attendanceCol = 3;
    }
  }

  const defaultEventId = options?.defaultEventId || 'event_1';
  const defaultEventName = options?.defaultEventName || 'COZINHA SHOW';

  const rows: ParsedImportRow[] = [];
  const validParticipants: Participant[] = [];
  const warnings: string[] = [];

  const existingMatriculas = new Set<string>();

  for (let r = headerRowIndex + 1; r < rawData.length; r++) {
    const row = rawData[r];
    if (!Array.isArray(row) || row.every((c) => String(c || '').trim() === '')) {
      continue; // Pula linha em branco
    }

    const rawName = nameCol >= 0 ? String(row[nameCol] || '').trim() : '';
    const rawMatricula = matriculaCol >= 0 ? String(row[matriculaCol] || '').trim() : '';
    const rawCompany = companyCol >= 0 ? String(row[companyCol] || '').trim() : '';
    const rawAttendance = attendanceCol >= 0 ? String(row[attendanceCol] || '').trim().toLowerCase() : '';
    const rawEvent = eventCol >= 0 ? String(row[eventCol] || '').trim() : '';

    // Se a linha não tiver nome nem matrícula, pula
    if (!rawName && !rawMatricula) {
      continue;
    }

    let isValid = true;
    let errorMsg = '';

    if (!rawName || rawName.length < 2) {
      isValid = false;
      errorMsg = 'Nome inválido ou vazio.';
    }

    // Limpa e normaliza a matrícula (somente dígitos)
    let cleanMatricula = rawMatricula.replace(/\D/g, '').trim();
    if (!cleanMatricula) {
      // Auto-gera número caso a planilha do usuário não contenha coluna de matrícula
      const autoNum = `${Date.now().toString().slice(-4)}${(r + 1).toString().padStart(3, '0')}`;
      cleanMatricula = autoNum;
    }

    // Verifica duplicidade dentro da própria planilha
    if (existingMatriculas.has(cleanMatricula)) {
      warnings.push(`Linha ${r + 1}: Matrícula "${cleanMatricula}" repetida na planilha. Gerada variação única.`);
      cleanMatricula = `${cleanMatricula}${r}`;
    }
    existingMatriculas.add(cleanMatricula);

    // Normaliza presença
    const attended =
      rawAttendance === 'sim' ||
      rawAttendance === 's' ||
      rawAttendance === 'presente' ||
      rawAttendance === 'present' ||
      rawAttendance === '1' ||
      rawAttendance === 'true' ||
      rawAttendance === 'p' ||
      rawAttendance === 'x';

    const finalName = rawName.toUpperCase();
    const finalCompany = rawCompany ? rawCompany.toUpperCase() : 'Não informada';
    const finalEventName = rawEvent || defaultEventName;

    const parsedRow: ParsedImportRow = {
      rawRow: r + 1,
      fullName: finalName,
      registrationNumber: cleanMatricula,
      company: finalCompany,
      attended,
      eventName: finalEventName,
      isValid,
      error: errorMsg,
    };

    rows.push(parsedRow);

    if (isValid) {
      const nowIso = new Date().toISOString();
      const newPart: Participant = {
        id: `part_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        fullName: finalName,
        registrationNumber: cleanMatricula,
        company: finalCompany,
        eventId: defaultEventId,
        eventName: finalEventName,
        createdAt: nowIso,
        attended,
        attendedAt: attended ? nowIso : null,
      };
      validParticipants.push(newPart);
    }
  }

  return {
    rows,
    validParticipants,
    totalRows: rows.length,
    validCount: validParticipants.length,
    invalidCount: rows.length - validParticipants.length,
    warnings,
    fileName: file.name,
  };
}

/**
 * Gera e baixa uma planilha modelo do Excel (.xlsx) para importação
 */
export async function downloadExcelTemplate(eventName = 'COZINHA SHOW'): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema de Credenciamento';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Modelo de Importação', {
    views: [{ showGridLines: true }],
  });

  // Cabeçalho institucional
  sheet.mergeCells('A1:D1');
  const title = sheet.getCell('A1');
  title.value = `PLANILHA MODELO DE IMPORTAÇÃO - EVENTO: ${eventName.toUpperCase()}`;
  title.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  title.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 24;

  // Linhas das colunas
  const headers = ['Nome Completo', 'Nº de Matrícula', 'Empresa', 'Presença (SIM/NÃO)'];
  const headerRow = sheet.getRow(2);
  headerRow.values = headers;
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
  });

  // Exemplos de preenchimento
  const sampleData = [
    ['CARLOS EDUARDO SILVA', '1001', 'RESTAURANTE COZINHA GOURMET', 'NÃO'],
    ['MARIANA SOUZA SANTOS', '1002', 'BUFFET DELÍCIAS & CIA', 'SIM'],
    ['LUCAS GABRIEL OLIVEIRA', '1003', 'HOTEL & EVENTOS BRASIL', 'NÃO'],
    ['FERNANDA BEATRIZ COSTA', '1004', 'GASTRONOMIA SHOW LTDA', 'SIM'],
  ];

  sampleData.forEach((rowValues, idx) => {
    const row = sheet.getRow(3 + idx);
    row.values = rowValues;
    row.height = 19;
    row.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  // Larguras das colunas
  sheet.columns = [
    { key: 'nome', width: 34 },
    { key: 'matricula', width: 18 },
    { key: 'empresa', width: 32 },
    { key: 'presenca', width: 22 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'modelo-importacao-participantes.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


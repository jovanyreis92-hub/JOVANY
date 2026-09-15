import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { Participant } from '../types';
import { getCompanySettings } from './storage';

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
  subCell.value = `Evento: ${displayEventName} | Emitido em: ${new Date().toLocaleString('pt-BR')}`;
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

      if (colNumber === 1 || colNumber === 3 || colNumber === 7) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colNumber === 6) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }

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

  // Linha de Rodapé/Totalizador
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
  totalRow.height = 22;
  totalRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
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

  // Cabeçalho institucional
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const title = company.companyName 
    ? `${company.companyName.toUpperCase()} - LISTA DE PRESENÇA` 
    : 'LISTA DE PRESENÇA E CREDENCIAMENTO';
  doc.text(title, 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(56, 189, 248); // sky-400
  doc.text(`Evento: ${displayEvent}`, 14, 18);

  doc.setTextColor(203, 213, 225); // slate-300
  doc.setFontSize(8);
  doc.text(`Relatório Oficial emitido em: ${dataEmissao}`, 14, 24);

  // Bloco de Métricas / Resumo
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 35, 182, 19, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 35, 182, 19, 2, 2, 'S');

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('TOTAL INSCRITOS', 20, 41);
  doc.text('PRESENTES', 65, 41);
  doc.text('AUSENTES', 120, 41);
  doc.text('TAXA DE ADESÃO', 165, 41);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(`${total}`, 20, 49);

  doc.setTextColor(22, 101, 52); // green-800
  doc.text(`${presentes}`, 65, 49);

  doc.setTextColor(133, 77, 14); // yellow-800
  doc.text(`${ausentes}`, 120, 49);

  doc.setTextColor(2, 132, 199); // sky-600
  doc.text(`${taxaPresenca}`, 165, 49);

  // Tabela de participantes
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
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 42 },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 32 },
      4: { cellWidth: 34 },
      5: { cellWidth: 26, halign: 'center' },
      6: { cellWidth: 16, halign: 'center' },
    },
    didParseCell: (data) => {
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
    },
    foot: [
      ['', `Total: ${total} participantes`, '', '', '', `${presentes} presentes`, `${ausentes} ausentes`]
    ],
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
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


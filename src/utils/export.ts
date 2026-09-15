import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Participant } from '../types';
import { getCompanySettings } from './storage';

export function exportToExcel(participants: Participant[], filenamePrefix = 'lista-presenca'): void {
  const company = getCompanySettings();
  const total = participants.length;
  const presentes = participants.filter(p => p.attended).length;
  const ausentes = total - presentes;
  const taxaPresenca = total > 0 ? `${((presentes / total) * 100).toFixed(1)}%` : '0%';

  // 1. Dados detalhados dos participantes
  const data = participants.map((p, index) => ({
    'Nº': index + 1,
    'Nome Completo': p.fullName,
    'Nº de Matrícula': p.registrationNumber,
    'Empresa': p.company,
    'Data de Cadastro': new Date(p.createdAt).toLocaleString('pt-BR'),
    'Status de Presença': p.attended ? 'PRESENTE' : 'AUSENTE',
    'Horário de Confirmação': p.attendedAt ? new Date(p.attendedAt).toLocaleString('pt-BR') : '-',
  }));

  // 2. Tabela de resumo
  const summaryData = [
    { 'Métrica': 'Empresa / Instituição', 'Valor': company.companyName || '-' },
    { 'Métrica': 'Evento / Treinamento', 'Valor': company.eventName || '-' },
    { 'Métrica': 'Total de Inscritos', 'Valor': total },
    { 'Métrica': 'Total de Presentes', 'Valor': presentes },
    { 'Métrica': 'Total de Ausentes', 'Valor': ausentes },
    { 'Métrica': 'Taxa de Presença', 'Valor': taxaPresenca },
    { 'Métrica': 'Data do Relatório', 'Valor': new Date().toLocaleString('pt-BR') },
  ];

  const workbook = XLSX.utils.book_new();

  // Aba principal de participantes
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Ajuste de largura das colunas
  worksheet['!cols'] = [
    { wch: 6 },  // Nº
    { wch: 32 }, // Nome
    { wch: 18 }, // Matrícula
    { wch: 25 }, // Empresa
    { wch: 20 }, // Cadastro
    { wch: 18 }, // Presença
    { wch: 22 }, // Horário
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Participantes');

  // Aba de resumo
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 24 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo Geral');

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${filenamePrefix}-${dateStr}.xlsx`);
}

export function exportToPDF(participants: Participant[], filenamePrefix = 'lista-presenca'): void {
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

  // Cabeçalho institucional
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  const title = company.companyName 
    ? `${company.companyName.toUpperCase()} - LISTA DE PRESENÇA` 
    : 'LISTA DE PRESENÇA E CREDENCIAMENTO';
  doc.text(title, 14, 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(56, 189, 248); // sky-400
  doc.text(company.eventName || 'Evento Corporativo & Treinamento', 14, 19);

  doc.setTextColor(203, 213, 225); // slate-300
  doc.setFontSize(8);
  doc.text(`Relatório Oficial emitido em: ${dataEmissao}`, 14, 25);

  // Bloco de Métricas / Resumo
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 36, 182, 20, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 36, 182, 20, 2, 2, 'S');

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('TOTAL DE INSCRITOS', 20, 43);
  doc.text('PRESENTES CONFIRMADOS', 65, 43);
  doc.text('AUSENTES', 120, 43);
  doc.text('TAXA DE ADESÃO', 160, 43);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(`${total}`, 20, 51);

  doc.setTextColor(22, 101, 52); // green-800
  doc.text(`${presentes}`, 65, 51);

  doc.setTextColor(153, 27, 27); // red-800
  doc.text(`${ausentes}`, 120, 51);

  doc.setTextColor(2, 132, 199); // sky-600
  doc.text(`${taxaPresenca}`, 160, 51);

  // Tabela de participantes
  const tableRows = participants.map((p, index) => [
    String(index + 1),
    p.fullName,
    p.registrationNumber,
    p.company,
    p.attended ? 'PRESENTE' : 'AUSENTE',
    p.attendedAt ? new Date(p.attendedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-',
  ]);

  autoTable(doc, {
    startY: 62,
    head: [['#', 'Nome Completo', 'Matrícula', 'Empresa', 'Presença', 'Horário']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 55 },
      2: { cellWidth: 32 },
      3: { cellWidth: 45 },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 18, halign: 'center' },
    },
    didParseCell: (data) => {
      // Destaque para PRESENTE (verde) e AUSENTE (cinza/vermelho)
      if (data.section === 'body' && data.column.index === 4) {
        if (data.cell.raw === 'PRESENTE') {
          data.cell.styles.textColor = [22, 101, 52];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [156, 163, 175];
        }
      }
    },
    foot: [
      ['', `Total: ${total} participantes`, '', '', `${presentes} presentes`, '']
    ],
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8.5,
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

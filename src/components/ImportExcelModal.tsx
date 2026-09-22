import React, { useState, useRef } from 'react';
import {
  Upload,
  X,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle,
  FileText,
  HelpCircle,
  ArrowRight,
  Database,
  RefreshCw,
  Users,
} from 'lucide-react';
import { EventItem, Participant } from '../types';
import {
  parseExcelFile,
  downloadExcelTemplate,
  ParseExcelResult,
} from '../utils/export';
import { importBatchParticipants } from '../utils/storage';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventsList: EventItem[];
  currentEventId?: string;
  onImportSuccess: (count: number, message: string) => void;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  isOpen,
  onClose,
  eventsList,
  currentEventId,
  onImportSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseExcelResult | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>(
    currentEventId || eventsList[0]?.id || 'event_1'
  );
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const activeEvent = eventsList.find((e) => e.id === selectedEventId) || eventsList[0];
  const targetEventName = activeEvent?.name || 'COZINHA SHOW';

  const handleFileChange = async (selectedFile: File) => {
    if (!selectedFile) return;
    setErrorMessage(null);
    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const result = await parseExcelFile(selectedFile, {
        defaultEventId: selectedEventId,
        defaultEventName: targetEventName,
      });

      if (result.validCount === 0) {
        setErrorMessage(
          'Nenhum participante válido foi encontrado na planilha. Verifique se o arquivo possui colunas como "Nome Completo" e "Matrícula".'
        );
        setParseResult(null);
      } else {
        setParseResult(result);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao ler a planilha. Certifique-se de que é um arquivo Excel (.xlsx, .xls ou .csv) válido.');
      setParseResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadExcelTemplate(targetEventName);
    } catch (err) {
      console.error('Erro ao baixar modelo:', err);
    }
  };

  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.validParticipants.length === 0) return;

    if (importMode === 'replace') {
      const confirmReplace = window.confirm(
        'ATENÇÃO: Você selecionou "Substituir Lista Atual". Isso irá substituir os participantes existentes exclusivamente pelos da planilha. Deseja continuar?'
      );
      if (!confirmReplace) return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Ajusta o evento selecionado em todos os participantes válidos
      const adjustedParticipants: Participant[] = parseResult.validParticipants.map((p) => ({
        ...p,
        eventId: selectedEventId,
        eventName: targetEventName,
      }));

      const res = await importBatchParticipants(adjustedParticipants, importMode);

      if (res.success) {
        const msg =
          importMode === 'replace'
            ? `${res.added} participantes importados com substituição de lista com sucesso!`
            : `${res.added} novos participantes adicionados com sucesso (${res.total} no total)!`;

        onImportSuccess(res.added, msg);
        handleResetAndClose();
      } else {
        setErrorMessage(res.error || 'Erro ao processar a gravação no servidor.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao salvar dados importados.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetAndClose = () => {
    setFile(null);
    setParseResult(null);
    setErrorMessage(null);
    setIsProcessing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="modal-import-excel"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Cabeçalho do Modal */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Importar Dados do Excel</span>
                <span className="text-[10px] font-semibold bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full uppercase">
                  .xlsx / .xls / .csv
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Cadastre dezenas ou centenas de participantes de uma só vez
              </p>
            </div>
          </div>
          <button
            id="btn-close-import-modal"
            type="button"
            onClick={handleResetAndClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {errorMessage && (
            <div
              id="import-error-alert"
              className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong className="block font-semibold">Atenção ao importar arquivo:</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Seleção do Evento Destino */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="select-import-event"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
              >
                <Database className="h-3.5 w-3.5 text-primary-theme" />
                <span>Evento de Destino dos Participantes:</span>
              </label>
              <span className="text-[11px] font-semibold text-primary-theme bg-primary-theme-soft px-2 py-0.5 rounded-md">
                {targetEventName}
              </span>
            </div>
            <select
              id="select-import-event"
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                if (file) {
                  handleFileChange(file);
                }
              }}
              className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            >
              {eventsList.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.name} {evt.date ? `(${evt.date})` : ''} {evt.active ? '• Ativo' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Zona de Upload / Arrastar Arquivo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Selecione o arquivo da planilha:</span>
              <button
                id="btn-download-excel-template"
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-semibold hover:underline cursor-pointer"
                title="Baixar planilha modelo de exemplo com colunas pré-formatadas"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Baixar Planilha Modelo (.xlsx)</span>
              </button>
            </div>

            <div
              id="dropzone-excel-file"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]'
                  : file
                  ? 'border-emerald-400 bg-emerald-50/20'
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50/70 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />

              <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center mb-3">
                <Upload className="h-6 w-6" />
              </div>

              {file ? (
                <div>
                  <p className="text-sm font-bold text-slate-800 flex items-center justify-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <span>{file.name}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {(file.size / 1024).toFixed(1)} KB • Clique para escolher outro arquivo
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-bold text-slate-700">
                    Arraste sua planilha aqui ou clique para selecionar
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Formatos aceitos: Microsoft Excel (.xlsx, .xls) e CSV (.csv)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Modo de Importação: Mesclar vs Substituir */}
          <div className="space-y-1.5">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Método de Integração:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label
                className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                  importMode === 'merge'
                    ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950 ring-1 ring-emerald-500'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="text-xs">
                  <span className="font-bold block">Adicionar e Mesclar (Recomendado)</span>
                  <span className="text-slate-500 text-[11px] leading-tight">
                    Mantém os participantes atuais e adiciona os novos da planilha sem apagar nada.
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                  importMode === 'replace'
                    ? 'border-amber-500 bg-amber-50/40 text-amber-950 ring-1 ring-amber-500'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                />
                <div className="text-xs">
                  <span className="font-bold block text-amber-900">Substituir Lista Atual</span>
                  <span className="text-slate-500 text-[11px] leading-tight">
                    Substitui exclusivamente pela lista desta nova planilha.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Pré-visualização dos Dados Encontrados */}
          {parseResult && (
            <div className="space-y-3 pt-2 border-t border-slate-100 animate-in fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Pré-visualização da Planilha:
                  </h4>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold">
                    {parseResult.validCount} válidos
                  </span>
                  {parseResult.invalidCount > 0 && (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md font-bold">
                      {parseResult.invalidCount} ignorados
                    </span>
                  )}
                </div>
              </div>

              {/* Tabela de Amostra */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-100 text-slate-700 sticky top-0 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 text-center w-10">#</th>
                        <th className="py-2 px-3">Nome Completo</th>
                        <th className="py-2 px-3 text-center">Matrícula</th>
                        <th className="py-2 px-3">Empresa</th>
                        <th className="py-2 px-3 text-center">Presença</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parseResult.rows.slice(0, 10).map((row, idx) => (
                        <tr
                          key={idx}
                          className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50 text-rose-700'}
                        >
                          <td className="py-1.5 px-3 text-center font-mono text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-1.5 px-3 font-medium text-slate-800 truncate max-w-[140px]">
                            {row.fullName || <span className="text-rose-500 italic">Vazio</span>}
                          </td>
                          <td className="py-1.5 px-3 text-center font-mono text-slate-600">
                            {row.registrationNumber}
                          </td>
                          <td className="py-1.5 px-3 text-slate-600 truncate max-w-[130px]">
                            {row.company}
                          </td>
                          <td className="py-1.5 px-3 text-center">
                            {row.attended ? (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                PRESENTE
                              </span>
                            ) : (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                AUSENTE
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parseResult.rows.length > 10 && (
                  <div className="py-1.5 px-3 bg-slate-50 text-[10px] text-center text-slate-500 border-t border-slate-100">
                    ... e mais {parseResult.rows.length - 10} participantes na planilha.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Botões de Ação */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleResetAndClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            id="btn-confirm-import-excel"
            type="button"
            disabled={!parseResult || parseResult.validCount === 0 || isProcessing}
            onClick={handleConfirmImport}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all cursor-pointer ${
              !parseResult || parseResult.validCount === 0 || isProcessing
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
            }`}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Processando Importação...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>
                  Importar {parseResult?.validCount || 0} Participantes
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

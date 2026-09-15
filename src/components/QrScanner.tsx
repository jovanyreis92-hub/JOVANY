import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  Camera, 
  CameraOff, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Upload, 
  Hash, 
  Building2, 
  User, 
  Volume2, 
  VolumeX,
  FlipHorizontal,
  Info
} from 'lucide-react';
import { Participant, ScanResult } from '../types';
import { markAttendanceByCode } from '../utils/storage';
import { playSuccessBeep, playWarningBeep, playErrorBeep } from '../utils/audio';

interface QrScannerProps {
  onAttendanceMarked: (participant: Participant) => void;
  onNavigateToAdmin: () => void;
}

export const QrScanner: React.FC<QrScannerProps> = ({
  onAttendanceMarked,
  onNavigateToAdmin,
}) => {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [manualMatricula, setManualMatricula] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const lastScannedCodeRef = useRef<{ code: string; time: number } | null>(null);

  const READER_ELEMENT_ID = 'reader-canvas-box';

  const handleScanSuccess = useCallback((decodedText: string) => {
    // Evita leituras duplicadas no mesmo segundo
    const now = Date.now();
    if (
      lastScannedCodeRef.current &&
      lastScannedCodeRef.current.code === decodedText &&
      now - lastScannedCodeRef.current.time < 3000
    ) {
      return;
    }
    lastScannedCodeRef.current = { code: decodedText, time: now };

    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const result = markAttendanceByCode(decodedText);

      if (result.status === 'success' && result.participant) {
        if (soundEnabled) playSuccessBeep();
        setScanResult({
          type: 'success',
          message: result.message,
          participant: result.participant,
          timestamp: new Date().toLocaleTimeString('pt-BR'),
        });
        onAttendanceMarked(result.participant);
      } else if (result.status === 'already_checked' && result.participant) {
        if (soundEnabled) playWarningBeep();
        setScanResult({
          type: 'already_checked',
          message: result.message,
          participant: result.participant,
          timestamp: new Date().toLocaleTimeString('pt-BR'),
        });
      } else {
        if (soundEnabled) playErrorBeep();
        setScanResult({
          type: 'not_found',
          message: result.message,
          timestamp: new Date().toLocaleTimeString('pt-BR'),
        });
      }
    } catch (err) {
      console.error('Erro ao processar QR:', err);
      if (soundEnabled) playErrorBeep();
      setScanResult({
        type: 'error',
        message: 'Falha ao decodificar dados do código.',
        timestamp: new Date().toLocaleTimeString('pt-BR'),
      });
    } finally {
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1500);
    }
  }, [soundEnabled, onAttendanceMarked]);

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      }
    } catch (err) {
      console.warn('Erro ao parar scanner:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const startScanner = async () => {
    setCameraError(null);
    try {
      // Para qualquer instância anterior
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      const html5QrCode = new Html5Qrcode(READER_ELEMENT_ID, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: facingMode },
        config,
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // Frame sem QR code - ignorar
        }
      );

      setIsScanning(true);
    } catch (err: unknown) {
      console.error('Erro ao iniciar câmera:', err);
      setIsScanning(false);
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('NotAllowedError') || errorMsg.includes('Permission')) {
        setCameraError('Permissão da câmera não concedida. Permita o acesso à câmera nas configurações do navegador ou utilize o upload de imagem abaixo.');
      } else if (errorMsg.includes('NotFoundError')) {
        setCameraError('Nenhuma câmera encontrada neste dispositivo.');
      } else {
        setCameraError('Não foi possível iniciar a câmera. Se estiver no preview, você pode enviar a imagem do QR Code ou digitar a matrícula.');
      }
    }
  };

  // Alterna câmera frontal / traseira
  const handleToggleCamera = async () => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacing);
    if (isScanning) {
      await stopScanner();
      setTimeout(() => {
        startScanner();
      }, 300);
    }
  };

  // Leitura a partir de imagem salva no celular / computador
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Se scanner estava ativo com vídeo, parar temporariamente
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
        setIsScanning(false);
      }

      const tempScanner = new Html5Qrcode('temp-file-scanner', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });

      const decodedText = await tempScanner.scanFile(file, true);
      handleScanSuccess(decodedText);
    } catch (err) {
      console.error('Erro ao escanear imagem de arquivo:', err);
      if (soundEnabled) playErrorBeep();
      setScanResult({
        type: 'not_found',
        message: 'Não foi detectado nenhum código QR legível nesta imagem. Tente uma foto mais nítida ou digite a matrícula.',
        timestamp: new Date().toLocaleTimeString('pt-BR'),
      });
    } finally {
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Confirmação manual por matrícula
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualMatricula.trim()) return;
    handleScanSuccess(manualMatricula.trim());
    setManualMatricula('');
  };

  // Limpeza no unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Elemento oculto para processar fotos de arquivo */}
      <div id="temp-file-scanner" className="hidden"></div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Topo do Leitor */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wide border border-emerald-400/20 mb-2">
                <Camera className="h-3.5 w-3.5" />
                <span>Portaria & Recepção</span>
              </div>
              <h2 className="text-2xl font-bold text-white">
                Leitor de Presença QR
              </h2>
              <p className="text-slate-300 text-sm mt-0.5">
                Aponte a câmera do celular para o código QR do participante para confirmar a presença.
              </p>
            </div>

            {/* Controles de Som e Câmera */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                id="btn-toggle-sound"
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                  soundEnabled
                    ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                    : 'bg-slate-800/50 text-slate-400 border-slate-700'
                }`}
                title={soundEnabled ? 'Silenciar bipes' : 'Ativar bipes de confirmação'}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-400" /> : <VolumeX className="h-4 w-4" />}
                <span className="hidden sm:inline">{soundEnabled ? 'Som Ativo' : 'Mudo'}</span>
              </button>

              <button
                id="btn-toggle-camera-facing"
                type="button"
                onClick={handleToggleCamera}
                className="p-2 rounded-xl text-xs font-medium border bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                title="Trocar entre câmera frontal e traseira"
              >
                <FlipHorizontal className="h-4 w-4 text-sky-400" />
                <span className="hidden sm:inline">
                  {facingMode === 'environment' ? 'Traseira' : 'Frontal'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Área Central de Leitura */}
        <div className="p-6">
          {/* Container do Vídeo da Câmera */}
          <div className="max-w-md mx-auto relative rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-inner">
            <div
              id={READER_ELEMENT_ID}
              className="w-full min-h-[300px] flex items-center justify-center text-white"
            >
              {!isScanning && (
                <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                  <div className="h-16 w-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-300 mb-4 shadow-sm">
                    <Camera className="h-8 w-8 text-sky-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-200 mb-1">
                    Câmera Pronta para Iniciar
                  </p>
                  <p className="text-xs text-slate-400 max-w-xs mb-5">
                    Clique no botão abaixo para ativar a câmera do seu celular e iniciar a leitura dos crachás.
                  </p>
                  <button
                    id="btn-start-camera"
                    type="button"
                    onClick={startScanner}
                    className="flex items-center gap-2 py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-emerald-600/20"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Iniciar Leitura da Câmera</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mira visual quando ativo */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6">
                <div className="bg-slate-900/80 text-white text-xs px-3 py-1 rounded-full backdrop-blur-xs border border-white/20 animate-pulse">
                  Posicione o QR Code no centro
                </div>

                <div className="w-52 h-52 border-2 border-sky-400/80 rounded-2xl relative shadow-lg">
                  {/* Cantoneiras */}
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400"></div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400"></div>
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400"></div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400"></div>
                  
                  {/* Linha de varredura animada */}
                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-bounce"></div>
                </div>

                <div className="flex items-center gap-2 pointer-events-auto">
                  <button
                    id="btn-stop-camera"
                    type="button"
                    onClick={stopScanner}
                    className="flex items-center gap-1.5 py-1.5 px-4 bg-rose-600/90 hover:bg-rose-700 text-white text-xs font-semibold rounded-full shadow-md backdrop-blur-xs transition-colors"
                  >
                    <CameraOff className="h-3.5 w-3.5" />
                    <span>Pausar Câmera</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mensagem de Erro na Câmera */}
          {cameraError && (
            <div
              id="camera-error-message"
              className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3"
            >
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-800">Atenção ao acesso da câmera:</p>
                <p>{cameraError}</p>
              </div>
            </div>
          )}

          {/* Feedback Visual da Última Leitura */}
          {scanResult && (
            <div
              id="scan-result-card"
              className={`mt-6 p-4 sm:p-5 rounded-2xl border transition-all ${
                scanResult.type === 'success'
                  ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                  : scanResult.type === 'already_checked'
                  ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                  : 'bg-rose-50/90 border-rose-300 text-rose-950'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {scanResult.type === 'success' && (
                    <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                  )}
                  {scanResult.type === 'already_checked' && (
                    <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                      <AlertCircle className="h-6 w-6" />
                    </div>
                  )}
                  {(scanResult.type === 'not_found' || scanResult.type === 'error') && (
                    <div className="h-10 w-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-sm">
                      <AlertCircle className="h-6 w-6" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      {scanResult.type === 'success' && 'PRESENÇA CONFIRMADA!'}
                      {scanResult.type === 'already_checked' && 'ATENÇÃO - JÁ REGISTRADO'}
                      {scanResult.type === 'not_found' && 'CÓDIGO NÃO ENCONTRADO'}
                      {scanResult.type === 'error' && 'ERRO DE LEITURA'}
                    </span>
                    <span className="text-[11px] opacity-75 font-mono">
                      {scanResult.timestamp}
                    </span>
                  </div>

                  <p className="text-base font-bold mt-0.5">
                    {scanResult.message}
                  </p>

                  {/* Informações detalhadas do participante se encontrado */}
                  {scanResult.participant && (
                    <div className="mt-3 pt-3 border-t border-black/10 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 opacity-60 shrink-0" />
                        <span className="font-semibold truncate">
                          {scanResult.participant.fullName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5 opacity-60 shrink-0" />
                        <span className="font-mono">
                          {scanResult.participant.registrationNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 opacity-60 shrink-0" />
                        <span className="truncate">
                          {scanResult.participant.company}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Opções Alternativas: Enviar Arquivo de Foto ou Busca Manual */}
          <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Opção 1: Upload de imagem do QR Code */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Escanear da Galeria ou Foto
              </label>
              <p className="text-xs text-slate-500 mb-3">
                Se tiver um print ou foto do crachá salvo no celular:
              </p>
              <input
                ref={fileInputRef}
                id="input-qr-file"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                id="btn-upload-qr-file"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors"
              >
                <Upload className="h-3.5 w-3.5 text-slate-500" />
                <span>Carregar Imagem / Foto do QR</span>
              </button>
            </div>

            {/* Opção 2: Validação manual por matrícula */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <label
                htmlFor="input-manual-matricula"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
              >
                Confirmar por Matrícula
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Em caso de celular descarregado do participante:
              </p>
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  id="input-manual-matricula"
                  type="text"
                  value={manualMatricula}
                  onChange={(e) => setManualMatricula(e.target.value)}
                  placeholder="Ex: MAT-1001"
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
                <button
                  id="btn-submit-manual-matricula"
                  type="submit"
                  className="py-1.5 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold transition-colors shrink-0"
                >
                  Confirmar
                </button>
              </form>
            </div>
          </div>

          {/* Dica do Painel */}
          <div className="mt-6 text-center">
            <button
              id="btn-view-admin-from-scanner"
              type="button"
              onClick={onNavigateToAdmin}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-sky-600 transition-colors font-medium"
            >
              <Info className="h-3.5 w-3.5" />
              <span>Ver lista completa de presença no Painel Administrativo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

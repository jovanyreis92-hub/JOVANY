import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  Camera, 
  CameraOff, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  Hash, 
  Building2, 
  User, 
  Volume2, 
  VolumeX,
  FlipHorizontal,
  Info,
  RefreshCw
} from 'lucide-react';
import { Participant, ScanResult } from '../types';
import { markAttendanceByCode } from '../utils/storage';
import { playSuccessBeep, playWarningBeep, playErrorBeep } from '../utils/audio';

interface QrScannerProps {
  onAttendanceMarked: (participant: Participant) => void;
  onNavigateToAdmin?: () => void;
  isActive?: boolean;
}

export const QrScanner: React.FC<QrScannerProps> = ({
  onAttendanceMarked,
  onNavigateToAdmin,
  isActive = true,
}) => {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [manualMatricula, setManualMatricula] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const lastScannedCodeRef = useRef<{ code: string; time: number } | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const isStartingRef = useRef<boolean>(false);

  const READER_ELEMENT_ID = 'reader-canvas-box';

  const safelyStopMediaTracks = () => {
    try {
      const container = document.getElementById(READER_ELEMENT_ID);
      if (container) {
        const videos = container.querySelectorAll('video');
        videos.forEach((video) => {
          try {
            if (video.srcObject) {
              const stream = video.srcObject as MediaStream;
              if (typeof stream?.getTracks === 'function') {
                stream.getTracks().forEach((track) => track.stop());
              }
              video.srcObject = null;
            }
            video.pause();
          } catch {
            // ignore
          }
        });
      }
    } catch {
      // ignore
    }
  };

  const handleScanSuccess = useCallback((decodedText: string) => {
    // Evita leituras duplicadas no mesmo segundo para o mesmo código
    const now = Date.now();
    if (
      lastScannedCodeRef.current &&
      lastScannedCodeRef.current.code === decodedText &&
      now - lastScannedCodeRef.current.time < 2500
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
        message: 'Falha ao decodificar dados do código lido.',
        timestamp: new Date().toLocaleTimeString('pt-BR'),
      });
    } finally {
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1200);
    }
  }, [soundEnabled, onAttendanceMarked]);

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        const instance = scannerRef.current;
        if (instance.isScanning) {
          await instance.stop().catch(() => {});
        }
        safelyStopMediaTracks();
        try {
          instance.clear();
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    } finally {
      safelyStopMediaTracks();
      if (isMountedRef.current) {
        setIsScanning(false);
      }
    }
  };

  const startScanner = async (specificCameraId?: string) => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    setCameraError(null);

    try {
      // Para qualquer instância anterior antes de recriar
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop().catch(() => {});
          }
          scannerRef.current.clear();
        } catch {
          // ignore
        }
      }
      safelyStopMediaTracks();

      if (!isMountedRef.current) {
        isStartingRef.current = false;
        return;
      }

      // Carrega lista de câmeras do dispositivo se ainda não foram detectadas
      let cameras = availableCameras;
      try {
        if (cameras.length === 0) {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            cameras = devices.map((d, index) => ({
              id: d.id,
              label: d.label || `Câmera ${index + 1}`,
            }));
            setAvailableCameras(cameras);
          }
        }
      } catch {
        // Pode requerer permissão prévia no navegador, ignorar
      }

      const html5QrCode = new Html5Qrcode(READER_ELEMENT_ID, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });
      scannerRef.current = html5QrCode;

      // Configurações de leitura otimizadas para detecção rápida e nítida
      const config = {
        fps: 20,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.max(Math.floor(minEdge * 0.8), 220);
          return { width: size, height: size };
        },
      };

      // Determina qual câmera usar
      const camIdToUse = specificCameraId || selectedCameraId;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let cameraTarget: any = camIdToUse || { facingMode: facingMode };

      // Se há lista de câmeras e nenhuma foi selecionada explicitamente, busca traseira ou primeira
      if (!camIdToUse && cameras.length > 0) {
        const backCam = cameras.find(c => 
          c.label.toLowerCase().includes('back') || 
          c.label.toLowerCase().includes('traseira') ||
          c.label.toLowerCase().includes('rear') ||
          c.label.toLowerCase().includes('environment')
        );
        const frontCam = cameras.find(c => 
          c.label.toLowerCase().includes('front') || 
          c.label.toLowerCase().includes('frontal') ||
          c.label.toLowerCase().includes('user')
        );

        if (facingMode === 'environment' && backCam) {
          cameraTarget = backCam.id;
          setSelectedCameraId(backCam.id);
        } else if (facingMode === 'user' && frontCam) {
          cameraTarget = frontCam.id;
          setSelectedCameraId(frontCam.id);
        } else {
          cameraTarget = cameras[0].id;
          setSelectedCameraId(cameras[0].id);
        }
      }

      try {
        await html5QrCode.start(
          cameraTarget,
          config,
          (decodedText) => {
            handleScanSuccess(decodedText);
          },
          () => {
            // Frame sem QR code - normal
          }
        );
      } catch (firstErr) {
        console.warn('Tentativa com câmera primária falhou, acionando fallback:', firstErr);
        // Fallback: se câmera traseira falhou (comum em notebooks com apenas webcam frontal)
        if (cameraTarget && typeof cameraTarget === 'object' && cameraTarget.facingMode === 'environment') {
          await html5QrCode.start(
            { facingMode: 'user' },
            config,
            (decodedText) => {
              handleScanSuccess(decodedText);
            },
            () => {}
          );
        } else if (cameras.length > 0 && cameraTarget !== cameras[0].id) {
          await html5QrCode.start(
            cameras[0].id,
            config,
            (decodedText) => {
              handleScanSuccess(decodedText);
            },
            () => {}
          );
        } else {
          throw firstErr;
        }
      }

      if (isMountedRef.current) {
        setIsScanning(true);
      } else {
        safelyStopMediaTracks();
        html5QrCode.stop().catch(() => {});
        try {
          html5QrCode.clear();
        } catch {
          // ignore
        }
      }
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      console.warn('Câmera não iniciada:', err);
      setIsScanning(false);
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('NotAllowedError') || errorMsg.includes('Permission')) {
        setCameraError('Permissão da câmera bloqueada ou não concedida. Permita o acesso à câmera nas configurações do navegador ou utilize o upload de imagem abaixo.');
      } else if (errorMsg.includes('NotFoundError')) {
        setCameraError('Nenhuma câmera encontrada neste dispositivo. Você pode enviar a foto do QR Code ou digitar a matrícula.');
      } else {
        setCameraError('Não foi possível iniciar a câmera diretamente. Utilize o botão "Iniciar Leitura", o envio de foto ou digitação da matrícula.');
      }
    } finally {
      isStartingRef.current = false;
    }
  };

  // Alterna câmera frontal / traseira ou entre câmeras disponíveis
  const handleToggleCamera = async () => {
    if (availableCameras.length > 1) {
      const currentIndex = availableCameras.findIndex(c => c.id === selectedCameraId);
      const nextIndex = (currentIndex + 1) % availableCameras.length;
      const nextCam = availableCameras[nextIndex];
      setSelectedCameraId(nextCam.id);
      if (isScanning) {
        await stopScanner();
        setTimeout(() => {
          if (isMountedRef.current) {
            startScanner(nextCam.id);
          }
        }, 250);
      }
    } else {
      const newFacing = facingMode === 'environment' ? 'user' : 'environment';
      setFacingMode(newFacing);
      if (isScanning) {
        await stopScanner();
        setTimeout(() => {
          if (isMountedRef.current) {
            startScanner();
          }
        }, 250);
      }
    }
  };

  // Leitura a partir de imagem salva no celular / computador
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop().catch(() => {});
        setIsScanning(false);
      }

      const tempScanner = new Html5Qrcode('temp-file-scanner', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });

      // Segundo argumento `false` evita renderizar a imagem no DOM
      const decodedText = await tempScanner.scanFile(file, false);
      try {
        tempScanner.clear();
      } catch {
        // ignore
      }
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
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      safelyStopMediaTracks();
      if (scannerRef.current) {
        const instance = scannerRef.current;
        scannerRef.current = null;
        if (instance.isScanning) {
          instance.stop().catch(() => {});
        }
        try {
          instance.clear();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Se a aba do scanner for desativada (usuário navegou para Cadastro ou Admin), desliga a câmera com segurança
  useEffect(() => {
    if (!isActive && isScanning) {
      stopScanner();
    }
  }, [isActive, isScanning]);

  // Tenta auto-iniciar suavemente ao abrir a aba se ainda não estiver rodando
  useEffect(() => {
    if (isActive && !isScanning && !cameraError) {
      const timer = setTimeout(() => {
        if (isMountedRef.current && isActive && !isScanning && !isStartingRef.current) {
          startScanner();
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Elemento reservado para decodificar arquivos de imagem */}
      <div id="temp-file-scanner" className="hidden" />

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
                Aponte a câmera para o QR Code do crachá do participante para confirmar presença instantaneamente.
              </p>
            </div>

            {/* Controles de Som e Câmera */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                id="btn-toggle-sound"
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
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
                className="p-2 rounded-xl text-xs font-medium border bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Trocar câmera"
              >
                <FlipHorizontal className="h-4 w-4 text-sky-400" />
                <span className="hidden sm:inline">
                  {availableCameras.length > 1
                    ? `Câmera (${availableCameras.findIndex(c => c.id === selectedCameraId) + 1}/${availableCameras.length})`
                    : (facingMode === 'environment' ? 'Traseira' : 'Frontal')}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Área Central de Leitura */}
        <div className="p-6">
          {/* Container do Vídeo da Câmera */}
          <div className="max-w-md mx-auto relative rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-inner min-h-[320px] flex items-center justify-center">
            
            {/* CONTAINER EXCLUSIVO DO HTML5-QRCODE - sem filhos do React para estabilidade absoluta */}
            <div
              id={READER_ELEMENT_ID}
              className={`w-full ${isScanning ? 'block' : 'hidden'}`}
            />

            {/* Tela inicial de espera / ativação da câmera */}
            {!isScanning && (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                <div className="h-16 w-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-300 mb-4 shadow-sm">
                  <Camera className="h-8 w-8 text-sky-400" />
                </div>
                <p className="text-base font-semibold text-slate-100 mb-1">
                  Câmera Pronta para Leitura
                </p>
                <p className="text-xs text-slate-400 max-w-xs mb-5">
                  Clique no botão abaixo para ativar a câmera do dispositivo e iniciar o escaneamento dos crachás.
                </p>
                <button
                  id="btn-start-camera"
                  type="button"
                  onClick={() => startScanner()}
                  className="flex items-center gap-2 py-3 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-emerald-600/25 cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                  <span>Ativar Leitor de QR Code</span>
                </button>
              </div>
            )}

            {/* Mira visual de enquadramento quando ativo */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-5">
                <div className="bg-slate-900/85 text-white text-xs px-3.5 py-1.5 rounded-full backdrop-blur-xs border border-white/20 animate-pulse font-medium shadow-sm">
                  Aponte para o QR Code do Crachá
                </div>

                {/* Retângulo Guia de Leitura com cantoneiras de mira */}
                <div className="w-56 h-56 border-2 border-sky-400/80 rounded-2xl relative shadow-lg">
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg"></div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg"></div>
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg"></div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg"></div>
                  
                  {/* Linha de varredura verde animada */}
                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-bounce"></div>
                </div>

                <div className="flex items-center gap-2 pointer-events-auto">
                  <button
                    id="btn-stop-camera"
                    type="button"
                    onClick={stopScanner}
                    className="flex items-center gap-1.5 py-1.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-full shadow-md backdrop-blur-xs transition-colors cursor-pointer"
                  >
                    <CameraOff className="h-3.5 w-3.5" />
                    <span>Pausar Câmera</span>
                  </button>

                  <button
                    id="btn-restart-camera"
                    type="button"
                    onClick={() => {
                      stopScanner().then(() => {
                        setTimeout(() => startScanner(), 200);
                      });
                    }}
                    className="flex items-center gap-1 py-1.5 px-3 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-full shadow-md backdrop-blur-xs transition-colors cursor-pointer"
                    title="Reiniciar câmera se travar"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Recarregar</span>
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
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => startScanner()}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white text-xs rounded-md font-medium cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Tentar Novamente</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Feedback Visual da Última Leitura */}
          {scanResult && (
            <div
              id="scan-result-card"
              className={`mt-6 p-4 sm:p-5 rounded-2xl border transition-all animate-fadeIn ${
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
                        <span className="font-mono font-medium">
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
                Se tiver um print ou foto do crachá salvo no celular/computador:
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
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
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
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={manualMatricula}
                  onChange={(e) => setManualMatricula(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ex: 1001"
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
                <button
                  id="btn-submit-manual-matricula"
                  type="submit"
                  className="py-1.5 px-3 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer"
                >
                  Confirmar
                </button>
              </form>
            </div>
          </div>

          {/* Dica do Painel */}
          {onNavigateToAdmin && (
            <div className="mt-6 text-center">
              <button
                id="btn-view-admin-from-scanner"
                type="button"
                onClick={onNavigateToAdmin}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-sky-600 transition-colors font-medium cursor-pointer"
              >
                <Info className="h-3.5 w-3.5" />
                <span>Ver lista completa de presença no Painel Administrativo</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

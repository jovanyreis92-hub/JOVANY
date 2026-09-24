import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  Camera, 
  CameraOff, 
  CheckCircle2, 
  AlertCircle, 
  Hash, 
  Building2, 
  User, 
  Volume2, 
  VolumeX,
  Info,
  RefreshCw,
  Zap,
  Sparkles,
  Clock,
  Check,
  CheckCheck
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
  const facingMode = 'environment';
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  // Estados exclusivos para ALTO CHECK-IN POR QR (Modo Contínuo de Recepção Rápida)
  const [autoCheckinEnabled, setAutoCheckinEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('auto_checkin_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [sessionCheckinCount, setSessionCheckinCount] = useState<number>(0);
  const [flashStatus, setFlashStatus] = useState<'success' | 'already_checked' | 'not_found' | 'error' | null>(null);
  const [autoResetCountdown, setAutoResetCountdown] = useState<number | null>(null);
  const [recentCheckins, setRecentCheckins] = useState<Array<{
    id: string;
    fullName: string;
    registrationNumber: string;
    company: string;
    time: string;
    status: 'success' | 'already_checked';
  }>>([]);

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
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

  const clearAutoReset = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setAutoResetCountdown(null);
  }, []);

  const triggerAutoReset = useCallback((seconds: number = 3) => {
    clearAutoReset();
    setAutoResetCountdown(seconds);
    let remaining = seconds;
    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearAutoReset();
        setScanResult(null);
      } else {
        setAutoResetCountdown(remaining);
      }
    }, 1000);
  }, [clearAutoReset]);

  const toggleAutoCheckin = () => {
    setAutoCheckinEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('auto_checkin_enabled', String(next));
      } catch {}
      return next;
    });
  };

  const handleScanSuccess = useCallback(async (decodedText: string) => {
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
      const result = await markAttendanceByCode(decodedText);
      const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Efeito luminoso de confirmação na moldura da câmera
      setFlashStatus(result.status as any);
      setTimeout(() => {
        setFlashStatus(null);
      }, 800);

      if (result.status === 'success' && result.participant) {
        if (soundEnabled) playSuccessBeep();
        if (typeof window !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
          try { navigator.vibrate([120, 60, 120]); } catch {}
        }

        setSessionCheckinCount((prev) => prev + 1);
        setRecentCheckins((prev) => [
          {
            id: result.participant!.id,
            fullName: result.participant!.fullName,
            registrationNumber: result.participant!.registrationNumber,
            company: result.participant!.company,
            time: timeStr,
            status: 'success',
          },
          ...prev.slice(0, 4),
        ]);

        setScanResult({
          type: 'success',
          message: result.message,
          participant: result.participant,
          timestamp: timeStr,
        });
        onAttendanceMarked(result.participant);

        // Se Auto Check-in estiver ativo, programa o auto-reset para o próximo crachá
        if (autoCheckinEnabled) {
          triggerAutoReset(3);
        }
      } else if (result.status === 'already_checked' && result.participant) {
        if (soundEnabled) playWarningBeep();
        if (typeof window !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
          try { navigator.vibrate([200]); } catch {}
        }
        setScanResult({
          type: 'already_checked',
          message: result.message,
          participant: result.participant,
          timestamp: timeStr,
        });
        if (autoCheckinEnabled) {
          triggerAutoReset(3);
        }
      } else {
        if (soundEnabled) playErrorBeep();
        setScanResult({
          type: 'not_found',
          message: result.message,
          timestamp: timeStr,
        });
        if (autoCheckinEnabled) {
          triggerAutoReset(3);
        }
      }
    } catch (err) {
      console.error('Erro ao processar QR:', err);
      if (soundEnabled) playErrorBeep();
      setScanResult({
        type: 'error',
        message: 'Falha ao decodificar dados do código lido.',
        timestamp: new Date().toLocaleTimeString('pt-BR'),
      });
      if (autoCheckinEnabled) {
        triggerAutoReset(3);
      }
    } finally {
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1200);
    }
  }, [soundEnabled, onAttendanceMarked, autoCheckinEnabled, triggerAutoReset]);

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

        if (backCam) {
          cameraTarget = backCam.id;
          setSelectedCameraId(backCam.id);
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
        setCameraError('Permissão da câmera bloqueada ou não concedida. Permita o acesso à câmera nas configurações do navegador ou utilize a confirmação manual por matrícula abaixo.');
      } else if (errorMsg.includes('NotFoundError')) {
        setCameraError('Nenhuma câmera encontrada neste dispositivo. Você pode confirmar a presença pela matrícula abaixo.');
      } else {
        setCameraError('Não foi possível iniciar a câmera diretamente. Utilize o botão "Iniciar Leitura" ou confirme pela digitação da matrícula abaixo.');
      }
    } finally {
      isStartingRef.current = false;
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
      clearAutoReset();
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
  }, [clearAutoReset]);

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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Topo do Leitor */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wide border border-emerald-400/20">
                  <Camera className="h-3.5 w-3.5" />
                  <span>Portaria & Recepção</span>
                </div>
                {sessionCheckinCount > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-400/30">
                    <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{sessionCheckinCount} {sessionCheckinCount === 1 ? 'check-in' : 'check-ins'} nesta sessão</span>
                  </div>
                )}
              </div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>Leitor de Presença QR</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-semibold uppercase tracking-wider">
                  Auto Check-in
                </span>
              </h2>
              <p className="text-slate-300 text-sm mt-0.5">
                Validação e confirmação de presença instantânea contínua com auto-reset para o próximo crachá.
              </p>
            </div>

            {/* Controles de Som, Auto Check-in e Câmera */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
              <button
                id="btn-toggle-auto-checkin"
                type="button"
                onClick={toggleAutoCheckin}
                className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  autoCheckinEnabled
                    ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/40 shadow-xs'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                }`}
                title={autoCheckinEnabled ? 'Auto Check-in ativo: credenciamento contínuo sem toques manuais' : 'Clique para reativar o Auto Check-in contínuo'}
              >
                <Zap className={`h-4 w-4 ${autoCheckinEnabled ? 'text-amber-400 fill-amber-400 animate-pulse' : 'text-slate-400'}`} />
                <span className="font-semibold">{autoCheckinEnabled ? 'Auto Check-in Ativo' : 'Auto Check-in Pausado'}</span>
              </button>

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
            </div>
          </div>
        </div>

        {/* Faixa de Status de Sincronização em Tempo Real Multi-Rede */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-slate-900 border-t border-b border-slate-800 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-emerald-400">Sincronização em Rede Ativa</span>
            <span className="hidden sm:inline text-slate-400">
              • Leituras QR confirmam presença simultaneamente em computadores e celulares (Wi-Fi, 4G e 5G)
            </span>
          </div>
          <span className="text-[11px] bg-slate-800 px-2.5 py-0.5 rounded-full text-slate-300 font-mono font-medium border border-slate-700">
            Tempo Real &lt; 100ms
          </span>
        </div>

        {/* Área Central de Leitura */}
        <div className="p-6">
          {/* Container do Vídeo da Câmera com feedback luminoso dinâmico */}
          <div
            className={`max-w-md mx-auto relative rounded-2xl overflow-hidden bg-slate-950 border-2 transition-all duration-300 min-h-[320px] flex items-center justify-center ${
              flashStatus === 'success'
                ? 'border-emerald-400 ring-4 ring-emerald-400/80 shadow-2xl shadow-emerald-500/40'
                : flashStatus === 'already_checked'
                ? 'border-amber-400 ring-4 ring-amber-400/80 shadow-2xl shadow-amber-500/40'
                : flashStatus === 'not_found' || flashStatus === 'error'
                ? 'border-rose-400 ring-4 ring-rose-400/80 shadow-2xl shadow-rose-500/40'
                : 'border-slate-800 shadow-inner'
            }`}
          >
            
            {/* CONTAINER EXCLUSIVO DO HTML5-QRCODE - sem filhos do React para estabilidade absoluta */}
            <div
              id={READER_ELEMENT_ID}
              className={`w-full ${isScanning ? 'block' : 'hidden'}`}
            />

            {/* Tela inicial de espera / ativação da câmera */}
            {!isScanning && (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                <div className="h-16 w-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-300 mb-4 shadow-sm">
                  <Camera className="h-8 w-8 text-primary-theme" />
                </div>
                <p className="text-base font-semibold text-slate-100 mb-1">
                  Câmera Pronta para Leitura
                </p>
                <p className="text-xs text-slate-400 max-w-xs mb-5">
                  Clique no botão abaixo para ativar a câmera e começar o auto check-in instantâneo dos participantes.
                </p>
                <button
                  id="btn-start-camera"
                  type="button"
                  onClick={() => startScanner()}
                  className="flex items-center gap-2 py-3 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-emerald-600/25 cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                  <span>Ativar Auto Check-in QR</span>
                </button>
              </div>
            )}

            {/* Mira visual de enquadramento quando ativo */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-5">
                <div className="bg-slate-900/90 text-white text-xs px-3.5 py-1.5 rounded-full backdrop-blur-xs border border-white/20 font-medium shadow-sm flex items-center gap-1.5">
                  <Zap className={`h-3.5 w-3.5 ${autoCheckinEnabled ? 'text-amber-400 fill-amber-400 animate-pulse' : 'text-slate-400'}`} />
                  <span>{autoCheckinEnabled ? 'Auto Check-in Ativo • Aponte o QR Code' : 'Aponte para o QR Code do Crachá'}</span>
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

          {/* Feedback Visual da Leitura com Auto-Reset para Auto Check-in */}
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
                    <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      {scanResult.type === 'success' && (
                        <>
                          <Zap className="h-3.5 w-3.5 text-emerald-600 fill-emerald-600" />
                          <span>AUTO CHECK-IN: PRESENÇA CONFIRMADA!</span>
                        </>
                      )}
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

                  {/* Badge de Confirmação Sincronizada em Rede */}
                  {scanResult.type === 'success' && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600/10 text-emerald-800 text-[11px] font-semibold border border-emerald-500/25">
                      <CheckCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Sincronizado: Presença confirmada em todos os celulares e computadores conectados</span>
                    </div>
                  )}

                  {scanResult.type === 'already_checked' && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-600/10 text-amber-800 text-[11px] font-semibold border border-amber-500/25">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span>Status Sincronizado: Presença já havia sido confirmada anteriormente por este ou outro dispositivo</span>
                    </div>
                  )}

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

                  {/* Indicador de Auto-Reset para próximo participante no Auto Check-in */}
                  {autoCheckinEnabled && autoResetCountdown !== null && (
                    <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-black/10 text-xs">
                      <div className="flex items-center gap-1.5 font-medium opacity-90">
                        <Clock className="h-3.5 w-3.5 animate-spin" />
                        <span>Próximo crachá pronto em <strong>{autoResetCountdown}s</strong>...</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          clearAutoReset();
                          setScanResult(null);
                        }}
                        className="px-2.5 py-1 rounded-md bg-black/10 hover:bg-black/20 text-current text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        Pronto Agora
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Histórico Recente de Auto Check-ins da Sessão */}
          {recentCheckins.length > 0 && (
            <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <CheckCheck className="h-4 w-4 text-emerald-600" />
                  <span>Últimos Check-ins da Sessão ({recentCheckins.length})</span>
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {sessionCheckinCount} total
                </span>
              </div>
              <div className="space-y-1.5">
                {recentCheckins.map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{item.fullName}</p>
                        <p className="text-[11px] text-slate-500 font-mono">Matrícula: {item.registrationNumber} • {item.company}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-700 font-medium shrink-0 ml-2">
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Opção Alternativa: Validação manual por matrícula */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 max-w-lg mx-auto">
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
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ring-primary-theme focus:border-primary-theme"
                />
                <button
                  id="btn-submit-manual-matricula"
                  type="submit"
                  className="py-1.5 px-3 btn-primary-action text-white rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer"
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
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-primary-theme transition-colors font-medium cursor-pointer"
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

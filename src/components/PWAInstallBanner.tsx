import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, PlusSquare, X, Smartphone, CheckCircle } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isInstalled || isDismissed) {
    return null;
  }

  return (
    <>
      {/* Banner for Chromium / Android / Desktop */}
      {isInstallable && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-4 text-white shadow-xl shadow-emerald-950/40">
          <button
            onClick={() => setIsDismissed(true)}
            className="absolute top-2 right-2 p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"
            aria-label="Fechar aviso"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 text-white shadow-inner">
              <Smartphone className="w-6 h-6" />
            </div>
            <div className="flex-1 pr-6">
              <h4 className="text-sm font-bold tracking-tight">Instalar no Celular</h4>
              <p className="text-xs text-emerald-100 mt-0.5">
                Use como aplicativo direto na sua tela inicial, sem precisar de navegador!
              </p>
            </div>
          </div>
          <button
            onClick={install}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 px-4 text-xs font-bold text-emerald-900 shadow-md hover:bg-emerald-50 active:scale-[0.98] transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Adicionar à Tela Inicial
          </button>
        </div>
      )}

      {/* Button & Guide for iOS Safari */}
      {isIOS && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 p-4 text-white shadow-lg">
          <button
            onClick={() => setIsDismissed(true)}
            className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition"
            aria-label="Fechar aviso"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="flex-1 pr-6">
              <h4 className="text-sm font-semibold text-white">Usar no iPhone / iPad</h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Instale este app na sua tela de início para abrir em tela cheia.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowIOSGuide(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 px-4 text-xs font-bold text-white shadow hover:bg-emerald-500 active:scale-[0.98] transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Ver como instalar no iPhone
          </button>
        </div>
      )}

      {/* iOS Safari Step-by-Step Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 text-white shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-white">Instalar no iPhone</h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3.5 rounded-2xl bg-slate-800/60 p-3.5 border border-slate-700/50">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">
                  1
                </div>
                <div>
                  <p className="text-xs text-slate-200">
                    Toque no botão <strong>Compartilhar</strong> na barra inferior do Safari.
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <Share2 className="w-4 h-4" /> Ícone de compartilhamento
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3.5 rounded-2xl bg-slate-800/60 p-3.5 border border-slate-700/50">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">
                  2
                </div>
                <div>
                  <p className="text-xs text-slate-200">
                    Role a lista para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <PlusSquare className="w-4 h-4" /> Adicionar à Tela de Início
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3.5 rounded-2xl bg-slate-800/60 p-3.5 border border-slate-700/50">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">
                  3
                </div>
                <div>
                  <p className="text-xs text-slate-200">
                    Toque em <strong>Adicionar</strong> no canto superior direito. Pronto! O app estará na sua tela inicial!
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <CheckCircle className="w-4 h-4" /> Funciona offline e como app nativo
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-500 transition cursor-pointer"
            >
              Entendido!
            </button>
          </div>
        </div>
      )}
    </>
  );
};

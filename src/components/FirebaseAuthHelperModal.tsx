import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  Globe,
  Copy,
  Check,
  ExternalLink,
  X,
  RefreshCw,
  LogIn,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

interface FirebaseAuthHelperModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseAuthHelperModal: React.FC<FirebaseAuthHelperModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    authError,
    authErrorCode,
    isUnauthorizedDomain,
    currentDomain,
    firebaseConsoleUrl,
    clearAuthError,
    signInWithGoogle,
    signInWithGoogleRedirect,
    isLoggingIn,
  } = useAuth();

  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!currentDomain) return;
    navigator.clipboard.writeText(currentDomain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const isPopupBlocked = authErrorCode === 'auth/popup-blocked';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Liberar Login no Vercel
              </h2>
              <p className="text-xs text-slate-400">Autorização no Firebase Authentication</p>
            </div>
          </div>
          <button
            onClick={() => {
              clearAuthError();
              onClose();
            }}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {authError && (
            <div className="rounded-2xl bg-rose-500/15 border border-rose-500/30 p-3.5 text-xs text-rose-200 leading-relaxed">
              <span className="font-bold block text-rose-300 mb-1 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                Erro ao Conectar:
              </span>
              {authError}
            </div>
          )}

          <div className="rounded-2xl bg-slate-950/80 p-4 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-4 h-4" />
              Seu Domínio Atual da Vercel:
            </h3>

            <div className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5">
              <span className="font-mono text-xs font-bold text-slate-200 truncate select-all">
                {currentDomain || 'seu-site.vercel.app'}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-600 transition shrink-0 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Copie o domínio acima para colar no Firebase.
            </p>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="space-y-2.5 text-xs text-slate-300">
            <h4 className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Como liberar em 1 minuto:
            </h4>

            <ol className="space-y-2 list-decimal list-inside bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 text-[12px] leading-relaxed">
              <li className="pl-1">
                Clique no botão verde abaixo para abrir a página de{' '}
                <strong className="text-white">Configurações do Firebase</strong>.
              </li>
              <li className="pl-1">
                Role até a seção{' '}
                <strong className="text-emerald-300">"Domínios autorizados"</strong> (Authorized domains).
              </li>
              <li className="pl-1">
                Clique em <strong className="text-white">"Adicionar domínio"</strong> e cole:{' '}
                <span className="font-mono text-emerald-400 font-bold bg-slate-900 px-1 py-0.5 rounded">
                  {currentDomain || 'seu-site.vercel.app'}
                </span>{' '}
                <span className="text-slate-400">(adicione também <code className="text-emerald-300">vercel.app</code> se desejar).</span>
              </li>
              <li className="pl-1">
                Clique em <strong className="text-white">Salvar</strong>. Pronto!
              </li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <a
              href={firebaseConsoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold py-3 px-4 text-xs shadow-lg transition cursor-pointer"
            >
              <span>Abrir Firebase Console</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Try Login Again Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={isLoggingIn}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold py-2.5 px-3 text-xs border border-slate-700 transition cursor-pointer disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                ) : (
                  <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>Tentar Login</span>
              </button>

              <button
                type="button"
                onClick={signInWithGoogleRedirect}
                disabled={isLoggingIn}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-2.5 px-3 text-xs border border-slate-700 transition cursor-pointer disabled:opacity-50"
                title="Use se pop-up estiver bloqueado no celular"
              >
                <span>Via Redirecionar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { MONTH_NAMES_PT, formatDateFull, getTodayDateString } from '../utils/formatters';
import { ChevronLeft, ChevronRight, TrendingUp, Calendar, WifiOff, Cloud, CloudCheck, LogIn, LogOut, User, Calculator, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  businessName: string;
  selectedYear: number;
  selectedMonth: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onOpenNewSale: () => void;
  onOpenCalculator: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  businessName,
  selectedYear,
  selectedMonth,
  onPrevMonth,
  onNextMonth,
  onOpenCalculator,
}) => {
  const isOnline = useOnlineStatus();
  const { user, isLoggingIn, signInWithGoogle, signOutUser } = useAuth();
  const todayStr = getTodayDateString();

  return (
    <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 pt-3 pb-2.5">
      <div className="flex items-center justify-between gap-2">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 shadow-md shadow-emerald-950/50">
            <TrendingUp className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-extrabold tracking-tight text-white leading-tight truncate">
              {businessName || 'Controle de Vendas'}
            </h1>
            <p className="text-[11px] font-medium text-emerald-400 flex items-center gap-1.5 truncate">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {formatDateFull(todayStr)}
            </p>
          </div>
        </div>

        {/* Right Status Actions: Offline / Cloud Sync & User Profile */}
        <div className="flex items-center gap-1.5 shrink-0">
          {!isOnline && (
            <div className="flex items-center gap-1 bg-amber-500/20 text-amber-300 text-[10px] font-semibold px-2 py-1 rounded-lg border border-amber-500/30">
              <WifiOff className="w-3 h-3" />
              <span>Offline</span>
            </div>
          )}

          {user ? (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Usuário'}
                  className="w-5 h-5 rounded-full border border-emerald-500/50"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <span className="text-[10px] text-emerald-400 font-bold hidden sm:inline truncate max-w-[80px]">
                Nuvem Ativa
              </span>
              <button
                onClick={signOutUser}
                title="Sair da conta"
                className="text-slate-400 hover:text-rose-400 transition ml-0.5 p-0.5"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              disabled={isLoggingIn}
              className="flex items-center gap-1 bg-emerald-950/70 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-600/40 text-[11px] font-bold px-2.5 py-1 rounded-xl transition cursor-pointer shadow-sm disabled:opacity-50"
              title="Salvar dados na nuvem com o Google"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Conectando...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Conectar Nuvem</span>
                </>
              )}
            </button>
          )}

          {/* Quick Calculator Tool */}
          <button
            onClick={onOpenCalculator}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-slate-700 text-[11px] font-bold px-2.5 py-1 rounded-xl transition cursor-pointer shadow-sm active:scale-95"
            title="Abrir calculadora de vendas"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span className="hidden xs:inline text-white">Calc</span>
          </button>
        </div>
      </div>

      {/* Month Navigation Strip */}
      <div className="mt-2.5 flex items-center justify-between rounded-xl bg-slate-900/90 border border-slate-800 px-2 py-1">
        <button
          onClick={onPrevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <span>{MONTH_NAMES_PT[selectedMonth - 1]}</span>
          <span className="text-slate-400 font-mono text-[11px]">{selectedYear}</span>
        </div>

        <button
          onClick={onNextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition"
          aria-label="Próximo mês"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

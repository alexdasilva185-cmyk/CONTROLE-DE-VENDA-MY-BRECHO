import React from 'react';
import { MONTH_NAMES_PT, formatDateFull, getTodayDateString } from '../utils/formatters';
import { ChevronLeft, ChevronRight, TrendingUp, Calendar, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface HeaderProps {
  businessName: string;
  selectedYear: number;
  selectedMonth: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onOpenNewSale: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  businessName,
  selectedYear,
  selectedMonth,
  onPrevMonth,
  onNextMonth,
}) => {
  const isOnline = useOnlineStatus();
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

        {/* Offline indicator if disconnected */}
        {!isOnline && (
          <div className="flex items-center gap-1 bg-amber-500/20 text-amber-300 text-[11px] font-semibold px-2 py-1 rounded-lg border border-amber-500/30">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Offline</span>
          </div>
        )}
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

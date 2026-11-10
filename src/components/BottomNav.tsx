import React from 'react';
import { CalendarDays, BarChart3, Plus, Target, SlidersHorizontal, Gift } from 'lucide-react';

export type NavTab = 'today' | 'month' | 'credits' | 'goals' | 'settings';

interface BottomNavProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenNewSale: () => void;
  activeCreditsCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  onOpenNewSale,
  activeCreditsCount = 0,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/80 px-1 pb-safe pt-1.5 max-w-md mx-auto">
      <div className="flex items-center justify-between">
        {/* Tab: Hoje */}
        <button
          onClick={() => onTabChange('today')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition cursor-pointer flex-1 ${
            currentTab === 'today'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CalendarDays className="w-4.5 h-4.5 mb-0.5" />
          <span className="text-[9px]">Hoje</span>
        </button>

        {/* Tab: Mês & Médias */}
        <button
          onClick={() => onTabChange('month')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition cursor-pointer flex-1 ${
            currentTab === 'month'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4.5 h-4.5 mb-0.5" />
          <span className="text-[9px]">Mês</span>
        </button>

        {/* Tab: Vale-Crédito */}
        <button
          onClick={() => onTabChange('credits')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition cursor-pointer relative flex-1 ${
            currentTab === 'credits'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Gift className="w-4.5 h-4.5 mb-0.5" />
            {activeCreditsCount > 0 && (
              <span className="absolute -top-1 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-slate-950 text-[8px] font-black">
                {activeCreditsCount}
              </span>
            )}
          </div>
          <span className="text-[9px]">Créditos</span>
        </button>

        {/* Center Primary Action: Lançar Venda */}
        <div className="relative -top-3.5 px-0.5 shrink-0">
          <button
            onClick={onOpenNewSale}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            aria-label="Lançar vendas do dia"
          >
            <Plus className="w-6 h-6 stroke-[2.8]" />
          </button>
        </div>

        {/* Tab: Metas */}
        <button
          onClick={() => onTabChange('goals')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition cursor-pointer flex-1 ${
            currentTab === 'goals'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Target className="w-4.5 h-4.5 mb-0.5" />
          <span className="text-[9px]">Metas</span>
        </button>

        {/* Tab: Ajustes */}
        <button
          onClick={() => onTabChange('settings')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition cursor-pointer flex-1 ${
            currentTab === 'settings'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <SlidersHorizontal className="w-4.5 h-4.5 mb-0.5" />
          <span className="text-[9px]">Ajustes</span>
        </button>
      </div>
    </nav>
  );
};

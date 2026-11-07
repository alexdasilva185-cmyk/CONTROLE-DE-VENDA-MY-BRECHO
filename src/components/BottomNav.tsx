import React from 'react';
import { CalendarDays, BarChart3, Plus, Target, SlidersHorizontal } from 'lucide-react';

export type NavTab = 'today' | 'month' | 'goals' | 'settings';

interface BottomNavProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenNewSale: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  onOpenNewSale,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/80 px-2 pb-safe pt-1.5 max-w-md mx-auto">
      <div className="flex items-center justify-around">
        {/* Tab: Hoje */}
        <button
          onClick={() => onTabChange('today')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            currentTab === 'today'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CalendarDays className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Hoje</span>
        </button>

        {/* Tab: Mês & Médias */}
        <button
          onClick={() => onTabChange('month')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            currentTab === 'month'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Médias</span>
        </button>

        {/* Center Primary Action: Lançar Venda */}
        <div className="relative -top-4 px-1">
          <button
            onClick={onOpenNewSale}
            className="flex h-13 w-13 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            aria-label="Lançar vendas do dia"
          >
            <Plus className="w-7 h-7 stroke-[2.8]" />
          </button>
        </div>

        {/* Tab: Metas */}
        <button
          onClick={() => onTabChange('goals')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            currentTab === 'goals'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Target className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Metas</span>
        </button>

        {/* Tab: Ajustes */}
        <button
          onClick={() => onTabChange('settings')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            currentTab === 'settings'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <SlidersHorizontal className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Ajustes</span>
        </button>
      </div>
    </nav>
  );
};

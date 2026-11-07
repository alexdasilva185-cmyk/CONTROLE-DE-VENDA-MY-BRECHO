import React, { useState } from 'react';
import { MonthSummary, AppSettings } from '../types/sales';
import { formatCurrency, formatPercent, parseBRInputToNumber } from '../utils/formatters';
import { calculateGoalProgress } from '../utils/calculations';
import { Target, CheckCircle2, TrendingUp, Calendar, Flame, Edit3, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GoalsTabProps {
  summary: MonthSummary;
  settings: AppSettings;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
}

export const GoalsTab: React.FC<GoalsTabProps> = ({
  summary,
  settings,
  onUpdateSettings,
}) => {
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(settings.monthlyGoal || 15000));

  const goalProgress = calculateGoalProgress(
    summary.totalRevenue,
    settings.monthlyGoal,
    summary.year,
    summary.month
  );

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseBRInputToNumber(goalInput);
    if (val > 0) {
      onUpdateSettings({ monthlyGoal: val });
      setIsEditingGoal(false);
    }
  };

  const handleCelebrate = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#f59e0b', '#3b82f6'],
      });
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            <span>Metas & Ritmo de Vendas</span>
          </h2>
          <p className="text-xs text-slate-400">
            Acompanhe o faturamento para bater sua meta mensal
          </p>
        </div>

        <button
          onClick={() => {
            setGoalInput(String(settings.monthlyGoal));
            setIsEditingGoal(!isEditingGoal);
          }}
          className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 transition"
        >
          <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
          <span>{isEditingGoal ? 'Cancelar' : 'Mudar Meta'}</span>
        </button>
      </div>

      {/* Goal Edit Form if open */}
      {isEditingGoal && (
        <form
          onSubmit={handleSaveGoal}
          className="rounded-3xl bg-slate-900 border border-emerald-500/50 p-4 shadow-xl space-y-3 animate-in fade-in"
        >
          <label className="block text-xs font-bold text-emerald-300 uppercase tracking-wider">
            Definir Meta de Faturamento do Mês
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-base font-bold text-slate-400">R$</span>
            <input
              type="text"
              inputMode="decimal"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-500 py-2.5 pl-11 pr-4 text-xl font-bold text-white font-mono focus:outline-none"
              placeholder="15000,00"
            />
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Sugestões:</span>
            {[5000, 10000, 15000, 20000, 30000].map((val) => (
              <button
                type="button"
                key={val}
                onClick={() => setGoalInput(String(val))}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700 font-mono transition"
              >
                {val / 1000}k
              </button>
            ))}
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition cursor-pointer"
          >
            Salvar Nova Meta
          </button>
        </form>
      )}

      {/* Main Goal Progress Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <Flame className="w-4 h-4 fill-emerald-400 text-emerald-400" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Meta do Mês
              </span>
              <p className="text-sm font-extrabold text-white font-mono">
                {formatCurrency(settings.monthlyGoal)}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Progresso
            </span>
            <p className="text-sm font-black text-emerald-400 font-mono">
              {formatPercent(goalProgress.actualPercent)}
            </p>
          </div>
        </div>

        {/* Big Progress Bar */}
        <div className="mt-4">
          <div className="h-4 w-full rounded-full bg-slate-800 overflow-hidden p-0.5 border border-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 transition-all duration-700 shadow-md"
              style={{ width: `${goalProgress.percent}%` }}
            />
          </div>
        </div>

        {/* Faturado vs Restante */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-800/60 p-3 border border-slate-750">
            <span className="text-[10px] uppercase font-bold text-slate-400">Já Faturado</span>
            <p className="text-base font-extrabold text-white font-mono mt-0.5">
              {formatCurrency(summary.totalRevenue)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-800/60 p-3 border border-slate-750">
            <span className="text-[10px] uppercase font-bold text-slate-400">Falta Vender</span>
            <p className="text-base font-extrabold text-amber-400 font-mono mt-0.5">
              {formatCurrency(goalProgress.remainingAmount)}
            </p>
          </div>
        </div>

        {/* Daily Target Needed for Remaining Days */}
        {goalProgress.isCompleted ? (
          <div className="mt-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 p-4 text-center">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mb-1">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-extrabold text-white">Parabéns! Meta Atingida! 🎉</h4>
            <p className="text-xs text-emerald-300 mt-1">
              Você já superou o objetivo de {formatCurrency(settings.monthlyGoal)} este mês!
            </p>
            <button
              onClick={handleCelebrate}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold shadow hover:bg-emerald-400 transition cursor-pointer"
            >
              Comemorar de novo! 🚀
            </button>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-slate-850 p-4 border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-1">
              <Calendar className="w-4 h-4" />
              <span>Ritmo Necessário para Bater a Meta:</span>
            </div>
            <p className="text-xs text-slate-300">
              Restam <strong>{goalProgress.remainingDays} dias</strong> no calendário deste mês.
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {formatCurrency(goalProgress.neededPerRemainingDay)}
              </span>
              <span className="text-xs text-slate-300">/ dia necessário</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Vendendo essa média diária até o final do mês, você baterá a sua meta de{' '}
              {formatCurrency(settings.monthlyGoal)}!
            </p>
          </div>
        )}
      </div>

      {/* Helpful Tips Card */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4 space-y-2">
        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          Dica para Aumentar seu Faturamento
        </h4>
        <p className="text-xs text-slate-300 leading-relaxed">
          Seu ticket médio atual é de <strong>{formatCurrency(summary.averageTicket)}</strong> por cliente. Se você oferecer um produto complementar ou incentivar um combo para aumentar seu ticket em apenas R$ 10, seu faturamento pode crescer mais de 15% sem precisar de novos clientes!
        </p>
      </div>
    </div>
  );
};

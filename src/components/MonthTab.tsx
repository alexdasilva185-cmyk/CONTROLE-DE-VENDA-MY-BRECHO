import React, { useState } from 'react';
import { DailySale, MonthSummary, AppSettings } from '../types/sales';
import {
  formatCurrency,
  formatPercent,
  formatDateBR,
  formatMonthYear,
} from '../utils/formatters';
import { generateMonthlyWhatsAppText, exportSalesToCSV } from '../utils/storage';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Award,
  Share2,
  FileSpreadsheet,
  Zap,
  BarChart2,
  ArrowUpRight,
  Info,
  Clock,
  Sparkles,
  Edit2,
  Receipt,
  ShoppingBag,
} from 'lucide-react';

interface MonthTabProps {
  summary: MonthSummary;
  monthSales: DailySale[];
  settings: AppSettings;
  onOpenNewSale: (saleToEdit?: DailySale) => void;
}

export const MonthTab: React.FC<MonthTabProps> = ({
  summary,
  monthSales,
  settings,
  onOpenNewSale,
}) => {
  const [selectedDayHover, setSelectedDayHover] = useState<DailySale | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  const handleShareWhatsApp = () => {
    const text = generateMonthlyWhatsAppText(summary, settings.businessName);
    const encoded = encodeURIComponent(text);
    const url = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');

    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const handleExportCSV = () => {
    exportSalesToCSV(monthSales);
  };

  // Find max sales for chart scaling
  const maxSaleInMonth = Math.max(
    ...monthSales.map((s) => s.totalSales),
    summary.dailyAverageRevenue,
    1
  );

  return (
    <div className="space-y-4 pb-20">
      {/* Month Header Banner */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-emerald-400" />
            <span>Médias & Faturamento do Mês</span>
          </h2>
          <p className="text-xs text-slate-400">
            {formatMonthYear(summary.year, summary.month)}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleShareWhatsApp}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-200 bg-emerald-600/80 hover:bg-emerald-600 px-3 py-1.5 rounded-xl transition cursor-pointer shadow-sm"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copiedShare ? 'Enviado!' : 'WhatsApp'}</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 px-2.5 py-1.5 rounded-xl transition cursor-pointer border border-slate-700"
            title="Exportar para Excel / CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* Main Focus: Média Diária de Faturamento (The exact question from user!) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950/80 border-2 border-emerald-500/40 p-5 shadow-2xl">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <Zap className="w-4 h-4 fill-emerald-400 text-emerald-400" />
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
            Média Diária de Faturamento
          </span>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
            {formatCurrency(summary.dailyAverageRevenue)}
          </span>
          <span className="text-xs font-semibold text-emerald-300">/ dia com venda</span>
        </div>

        <p className="mt-1 text-xs text-slate-300">
          Você faturou um total de <strong className="text-white font-mono">{formatCurrency(summary.totalRevenue)}</strong> em{' '}
          <strong className="text-white">{summary.daysWithSales} dias trabalhados</strong> no mês.
        </p>

        {/* Secondary averages breakdown */}
        <div className="mt-4 pt-3 border-t border-emerald-800/40 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-slate-900/60 p-2.5 border border-emerald-900/40">
            <span className="text-[10px] uppercase font-bold text-slate-400">Lucro Médio por Dia</span>
            <p className="text-sm font-extrabold text-emerald-400 font-mono mt-0.5">
              {formatCurrency(summary.dailyAverageProfit)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-900/60 p-2.5 border border-emerald-900/40">
            <span className="text-[10px] uppercase font-bold text-slate-400">Ticket Médio por Venda</span>
            <p className="text-sm font-extrabold text-teal-300 font-mono mt-0.5">
              {formatCurrency(summary.averageTicket)}
            </p>
          </div>
        </div>
      </div>

      {/* Key Totals Grid (Total Faturado, Lucro Líquido, Custos, Margem) */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
            <DollarSign className="w-3.5 h-3.5 text-blue-400" />
            <span>Faturamento Total</span>
          </div>
          <p className="mt-1 text-xl font-black text-white font-mono">
            {formatCurrency(summary.totalRevenue)}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {summary.daysWithSales} de {summary.totalDaysInMonth} dias com vendas
          </span>
        </div>

        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Lucro Líquido Total</span>
          </div>
          <p className="mt-1 text-xl font-black text-emerald-400 font-mono">
            {formatCurrency(summary.totalProfit)}
          </p>
          <span className="text-[11px] text-emerald-300/80 mt-0.5 block">
            Margem média: <strong className="font-mono">{formatPercent(summary.averageProfitMargin)}</strong>
          </span>
        </div>

        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
            <Receipt className="w-3.5 h-3.5 text-amber-400" />
            <span>Custo Total do Mês</span>
          </div>
          <p className="mt-1 text-lg font-bold text-slate-300 font-mono">
            {formatCurrency(summary.totalCost)}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Mercadorias e despesas</span>
        </div>

        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
            <ShoppingBag className="w-3.5 h-3.5 text-purple-400" />
            <span>Volume de Vendas</span>
          </div>
          <p className="mt-1 text-lg font-bold text-white font-mono">
            {summary.totalSalesCount} {summary.totalSalesCount === 1 ? 'venda' : 'vendas'}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Média de {(summary.totalSalesCount / Math.max(1, summary.daysWithSales)).toFixed(1)} / dia
          </span>
        </div>
      </div>

      {/* Projection Card */}
      {summary.projectedRevenue > summary.totalRevenue && (
        <div className="rounded-2xl bg-gradient-to-r from-blue-950/60 to-slate-900 border border-blue-800/40 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-400 mb-1">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>Projeção de Fechamento do Mês</span>
          </div>
          <p className="text-xs text-slate-300">
            Mantendo o ritmo atual de <strong className="text-white font-mono">{formatCurrency(summary.dailyAverageRevenue)}/dia</strong>,
            a previsão é fechar o mês com:
          </p>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-2xl font-black text-white font-mono">
              {formatCurrency(summary.projectedRevenue)}
            </span>
            <span className="text-xs text-emerald-400 font-bold font-mono">
              (Lucro estimado: {formatCurrency(summary.projectedProfit)})
            </span>
          </div>
        </div>
      )}

      {/* Best Day Highlight */}
      {summary.bestDay && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Award className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Melhor Dia de Vendas
            </span>
            <p className="text-sm font-bold text-white truncate">
              {formatDateBR(summary.bestDay.date)} —{' '}
              <span className="text-emerald-400 font-mono">{formatCurrency(summary.bestDay.revenue)}</span>
            </p>
            <p className="text-[11px] text-slate-400">
              Lucro: {formatCurrency(summary.bestDay.profit)} • {summary.bestDay.salesCount} vendas
            </p>
          </div>
        </div>
      )}

      {/* Daily Interactive Bar Chart */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Vendas Dia a Dia
            </h3>
            <p className="text-[11px] text-slate-400">Toque em qualquer dia para ver os detalhes</p>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Lucro
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-700"></span> Custo
            </span>
          </div>
        </div>

        {/* Selected Day Tooltip Card */}
        {selectedDayHover && (
          <div className="mb-3 rounded-xl bg-slate-850 p-2.5 border border-emerald-500/40 flex items-center justify-between animate-in fade-in">
            <div>
              <span className="text-xs font-bold text-white">
                {formatDateBR(selectedDayHover.date)}
              </span>
              <p className="text-[11px] text-slate-400">
                {selectedDayHover.salesCount} vendas • Ticket: {formatCurrency(selectedDayHover.averageTicket)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-white font-mono">
                {formatCurrency(selectedDayHover.totalSales)}
              </p>
              <p className="text-[11px] font-bold text-emerald-400 font-mono">
                Lucro: {formatCurrency(selectedDayHover.profit)}
              </p>
            </div>
          </div>
        )}

        {/* Chart Bars */}
        {monthSales.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Nenhuma venda registrada neste mês ainda.
          </div>
        ) : (
          <div className="flex items-end gap-1.5 h-40 pt-4 pb-1 overflow-x-auto">
            {monthSales
              .slice()
              .reverse()
              .map((sale) => {
                const heightPercent = Math.max(12, (sale.totalSales / maxSaleInMonth) * 100);
                const profitPercent = sale.totalSales > 0 ? (sale.profit / sale.totalSales) * 100 : 0;
                const dayNum = parseInt(sale.date.split('-')[2]);
                const isSelected = selectedDayHover?.id === sale.id;

                return (
                  <div
                    key={sale.id}
                    onClick={() => setSelectedDayHover(sale)}
                    className="flex flex-col items-center flex-1 min-w-[28px] max-w-[40px] group cursor-pointer"
                  >
                    {/* Bar Stack */}
                    <div
                      className={`w-full rounded-t-lg overflow-hidden flex flex-col justify-end transition-all ${
                        isSelected ? 'ring-2 ring-emerald-400 shadow-lg scale-105' : 'hover:opacity-90'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    >
                      {/* Cost portion */}
                      <div
                        className="w-full bg-slate-700 transition-all"
                        style={{ height: `${100 - profitPercent}%` }}
                      />
                      {/* Profit portion */}
                      <div
                        className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all"
                        style={{ height: `${profitPercent}%` }}
                      />
                    </div>
                    {/* Day label */}
                    <span
                      className={`text-[10px] font-mono mt-1 ${
                        isSelected ? 'text-emerald-400 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {dayNum}
                    </span>
                  </div>
                );
              })}
          </div>
        )}

        {/* Average line indicator text */}
        {summary.dailyAverageRevenue > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Média do mês:</span>
            <span className="font-bold text-emerald-400 font-mono">
              {formatCurrency(summary.dailyAverageRevenue)} / dia trabalhado
            </span>
          </div>
        )}
      </div>

      {/* Days Table List */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Detalhamento de Cada Dia
          </h3>
          <span className="text-[11px] text-slate-400">
            {monthSales.length} {monthSales.length === 1 ? 'dia' : 'dias'}
          </span>
        </div>

        {monthSales.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            Nenhum lançamento neste mês.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {monthSales.map((sale) => (
              <div
                key={sale.id}
                className="py-2.5 flex items-center justify-between hover:bg-slate-850/50 px-1 rounded-xl transition"
              >
                <div>
                  <span className="text-xs font-bold text-white">{formatDateBR(sale.date)}</span>
                  <p className="text-[11px] text-slate-400">
                    {sale.salesCount} vendas • Custo: {formatCurrency(sale.cost)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-bold text-white font-mono">
                      {formatCurrency(sale.totalSales)}
                    </p>
                    <p className="text-[11px] font-bold text-emerald-400 font-mono">
                      Lucro: {formatCurrency(sale.profit)} ({formatPercent(sale.profitMargin)})
                    </p>
                  </div>
                  <button
                    onClick={() => onOpenNewSale(sale)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Editar"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

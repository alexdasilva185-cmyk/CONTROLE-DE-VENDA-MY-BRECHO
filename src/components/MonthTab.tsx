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
  Edit2,
  Receipt,
  ShoppingBag,
  PlusCircle,
  Trophy,
  TrendingDown,
} from 'lucide-react';
import { AddCostModal } from './AddCostModal';

interface MonthTabProps {
  summary: MonthSummary;
  monthSales: DailySale[];
  settings: AppSettings;
  onOpenNewSale: (saleToEdit?: DailySale) => void;
  onAddCost?: (costInput: {
    date: string;
    amount: number;
    description: string;
    category?: string;
  }) => Promise<void> | void;
}

export const MonthTab: React.FC<MonthTabProps> = ({
  summary,
  monthSales,
  settings,
  onOpenNewSale,
  onAddCost,
}) => {
  const [selectedDayHover, setSelectedDayHover] = useState<DailySale | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const [isCostModalOpen, setIsCostModalOpen] = useState(false);
  const [chartMode, setChartMode] = useState<'chronological' | 'ranking'>('chronological');

  // Active sales with totalSales > 0
  const activeDays = monthSales.filter((s) => s.totalSales > 0);

  // Highest and lowest selling days in the month
  const highestSaleDay =
    activeDays.length > 0
      ? activeDays.reduce((max, s) => (s.totalSales > max.totalSales ? s : max), activeDays[0])
      : null;

  const lowestSaleDay =
    activeDays.length > 1
      ? activeDays.reduce((min, s) => (s.totalSales < min.totalSales ? s : min), activeDays[0])
      : null;

  // Sorted list for chart display (by date or by ranking)
  const sortedChartSales = [...activeDays].sort((a, b) => {
    if (chartMode === 'ranking') {
      return b.totalSales - a.totalSales; // Highest to lowest
    }
    return a.date.localeCompare(b.date); // Chronological by date
  });

  const maxSaleAmount = highestSaleDay ? Math.max(highestSaleDay.totalSales, 1) : 1;

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

  return (
    <div className="space-y-4 pb-20">
      {/* Month Header Banner */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-emerald-400" />
            <span>Faturamento do Mês</span>
          </h2>
          <p className="text-xs text-slate-400">
            {formatMonthYear(summary.year, summary.month)}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsCostModalOpen(true)}
            className="flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-2.5 py-1.5 rounded-xl transition cursor-pointer shadow-sm active:scale-95 touch-manipulation"
            title="Adicionar Custo / Despesa do Mês"
          >
            <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Custo</span>
          </button>
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

      {/* Main Focus: Faturamento do Mês em Destaque */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950/80 border-2 border-emerald-500/40 p-5 shadow-2xl">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
            Faturamento do Mês
          </span>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
            {formatCurrency(summary.totalRevenue)}
          </span>
          <span className="text-xs font-semibold text-emerald-300">
            {summary.totalCost === 0 ? '• 100% limpo' : `• Lucro: ${formatCurrency(summary.totalProfit)}`}
          </span>
        </div>

        <p className="mt-1 text-xs text-slate-300">
          Total de <strong className="text-white font-mono">{summary.totalSalesCount} {summary.totalSalesCount === 1 ? 'venda realizada' : 'vendas realizadas'}</strong> em{' '}
          <strong className="text-white">{summary.daysWithSales} {summary.daysWithSales === 1 ? 'dia' : 'dias com vendas'}</strong> neste mês.
        </p>
      </div>

      {/* Key Totals Grid (Lucro Líquido, Custos, Volume, Dias Ativos) */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Lucro Líquido Total</span>
          </div>
          <p className="mt-1 text-xl font-black text-emerald-400 font-mono">
            {formatCurrency(summary.totalProfit)}
          </p>
          <span className="text-[11px] text-emerald-300/80 mt-0.5 block">
            {summary.totalCost === 0 ? (
              <strong className="text-emerald-300">100% limpo (sem custos)</strong>
            ) : (
              <>Margem: <strong className="font-mono">{formatPercent(summary.averageProfitMargin)}</strong></>
            )}
          </span>
        </div>

        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>Dias com Vendas</span>
          </div>
          <p className="mt-1 text-xl font-black text-white font-mono">
            {summary.daysWithSales} <span className="text-xs font-normal text-slate-400">de {summary.totalDaysInMonth} dias</span>
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {summary.daysWithSales === 0 ? 'Nenhuma venda lançada' : `${summary.totalSalesCount} vendas registradas`}
          </span>
        </div>

        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
              <Receipt className="w-3.5 h-3.5 text-amber-400" />
              <span>Custo Total do Mês</span>
            </div>
            <button
              type="button"
              onClick={() => setIsCostModalOpen(true)}
              className="flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-2 py-0.5 rounded-lg transition cursor-pointer active:scale-95 touch-manipulation"
              title="Adicionar custo ou despesa do mês"
            >
              <PlusCircle className="w-3 h-3 text-amber-400" />
              <span>+ Custo</span>
            </button>
          </div>
          <p className="mt-1 text-lg font-bold text-slate-300 font-mono">
            {formatCurrency(summary.totalCost)}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {summary.totalCost > 0 ? 'Despesas e mercadorias adicionadas' : 'Nenhum custo adicionado (R$ 0,00)'}
          </span>
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
            Transações registradas no mês
          </span>
        </div>
      </div>

      {/* Formas de Recebimento do Mês (Pix, Cartão, Dinheiro) */}
      {(() => {
        const totalPix = monthSales.reduce((acc, s) => acc + (s.paymentMethods?.pix || 0), 0);
        const totalCard = monthSales.reduce(
          (acc, s) => acc + (s.paymentMethods?.credit || 0) + (s.paymentMethods?.debit || 0),
          0
        );
        const totalCash = monthSales.reduce((acc, s) => acc + (s.paymentMethods?.cash || 0), 0);

        return (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3.5 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Recebimentos do Mês por Forma de Pagamento
            </span>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-slate-800/80 p-2.5 border border-emerald-900/50">
                <span className="text-[10px] font-bold text-emerald-400">PIX</span>
                <p className="text-xs font-bold text-white font-mono mt-0.5">
                  {formatCurrency(totalPix)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-800/80 p-2.5 border border-blue-900/50">
                <span className="text-[10px] font-bold text-blue-400">CARTÃO</span>
                <p className="text-xs font-bold text-white font-mono mt-0.5">
                  {formatCurrency(totalCard)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-800/80 p-2.5 border border-amber-900/50">
                <span className="text-[10px] font-bold text-amber-400">DINHEIRO</span>
                <p className="text-xs font-bold text-white font-mono mt-0.5">
                  {formatCurrency(totalCash)}
                </p>
              </div>
            </div>
          </div>
        );
      })()}


      {/* Comparative Ranking Cards: Dia que Mais Vendeu vs Dia que Menos Vendeu */}
      {highestSaleDay && (
        <div className="grid grid-cols-2 gap-2.5">
          {/* Card: Mais Vendeu */}
          <div
            onClick={() => setSelectedDayHover(highestSaleDay)}
            className="rounded-2xl bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-900 border-2 border-amber-500/50 p-3.5 shadow-lg cursor-pointer hover:border-amber-400 transition active:scale-[0.98]"
          >
            <div className="flex items-center gap-1.5 text-amber-400 mb-1">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-wider">
                Mais Vendeu 🏆
              </span>
            </div>
            <p className="text-lg font-black text-white font-mono">
              {formatCurrency(highestSaleDay.totalSales)}
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-300">
              <span className="font-semibold text-amber-300">{formatDateBR(highestSaleDay.date)}</span>
              <span className="text-slate-400 font-mono">
                {highestSaleDay.salesCount} {highestSaleDay.salesCount === 1 ? 'venda' : 'vendas'}
              </span>
            </div>
          </div>

          {/* Card: Menos Vendeu */}
          {lowestSaleDay ? (
            <div
              onClick={() => setSelectedDayHover(lowestSaleDay)}
              className="rounded-2xl bg-slate-900 border border-slate-700/80 p-3.5 shadow-lg cursor-pointer hover:border-slate-500 transition active:scale-[0.98]"
            >
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <TrendingDown className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] font-black uppercase tracking-wider">
                  Menos Vendeu 📉
                </span>
              </div>
              <p className="text-lg font-black text-slate-200 font-mono">
                {formatCurrency(lowestSaleDay.totalSales)}
              </p>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-300">
                <span className="font-semibold text-slate-300">{formatDateBR(lowestSaleDay.date)}</span>
                <span className="text-slate-400 font-mono">
                  {lowestSaleDay.salesCount} {lowestSaleDay.salesCount === 1 ? 'venda' : 'vendas'}
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-3.5 flex flex-col justify-center text-xs text-slate-400">
              <span className="text-[10px] uppercase font-bold text-slate-500">Próximos dias</span>
              <p className="text-[11px] text-slate-400 mt-1">
                Lance novas vendas para comparar os dias.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Daily Comparative Interactive Chart */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4">
        {/* Header with Title and Mode Switcher */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-emerald-400" />
              <span>Comparativo Dia a Dia</span>
            </h3>
            <p className="text-[11px] text-slate-400">Acompanhe qual dia vendeu mais e qual vendeu menos</p>
          </div>

          {/* Toggle between "Por Data" and "Ranking" */}
          {activeDays.length > 1 && (
            <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setChartMode('chronological')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  chartMode === 'chronological'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Ordem cronológica das datas"
              >
                Por Data
              </button>
              <button
                type="button"
                onClick={() => setChartMode('ranking')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  chartMode === 'ranking'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Do dia que mais vendeu para o que menos vendeu"
              >
                Ranking 🏆
              </button>
            </div>
          )}
        </div>

        {/* Selected Day Tooltip / Detail Card */}
        {selectedDayHover && (
          <div className="mb-3 rounded-2xl bg-slate-850 p-3 border border-emerald-500/50 flex items-center justify-between animate-in fade-in">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">
                  Dia {formatDateBR(selectedDayHover.date)}
                </span>
                {highestSaleDay && selectedDayHover.id === highestSaleDay.id && (
                  <span className="text-[9px] font-black text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded-full border border-amber-500/30">
                    🏆 Maior Venda
                  </span>
                )}
                {lowestSaleDay && selectedDayHover.id === lowestSaleDay.id && (
                  <span className="text-[9px] font-black text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded-full border border-slate-700">
                    📉 Menor Venda
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {selectedDayHover.salesCount} {selectedDayHover.salesCount === 1 ? 'venda realizada' : 'vendas realizadas'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-white font-mono">
                {formatCurrency(selectedDayHover.totalSales)}
              </p>
              <p className="text-[11px] font-bold text-emerald-400 font-mono">
                Lucro: {formatCurrency(selectedDayHover.profit)}
              </p>
            </div>
          </div>
        )}

        {/* Visual Columns with Values on Top */}
        {activeDays.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Nenhuma venda registrada neste mês ainda.
          </div>
        ) : (
          <div className="flex items-end justify-around gap-2 h-56 pt-6 pb-2 overflow-x-auto">
            {sortedChartSales.map((sale) => {
              const isHighest = highestSaleDay && sale.id === highestSaleDay.id;
              const isLowest = lowestSaleDay && sale.id === lowestSaleDay.id;
              const isSelected = selectedDayHover?.id === sale.id;

              // Proportional height with minimum 26% and maximum 90%
              const ratio = sale.totalSales / maxSaleAmount;
              const heightPercent = Math.max(26, Math.round(ratio * 90));

              const [y, m, d] = sale.date.split('-').map(Number);
              const dateObj = new Date(y, m - 1, d);
              const weekday = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dateObj.getDay()] || '';

              return (
                <div
                  key={sale.id}
                  onClick={() => setSelectedDayHover(sale)}
                  className="flex flex-col items-center flex-1 min-w-[58px] max-w-[80px] h-full justify-end group cursor-pointer"
                >
                  {/* Badge & Value displayed on top of the bar */}
                  <div className="flex flex-col items-center mb-1.5 transition group-hover:scale-105">
                    {isHighest && (
                      <span className="text-[9px] font-black text-amber-300 bg-amber-500/25 border border-amber-500/40 px-1.5 py-0.5 rounded-md mb-0.5 shadow-sm">
                        🏆 1º
                      </span>
                    )}
                    {isLowest && (
                      <span className="text-[9px] font-black text-slate-300 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded-md mb-0.5">
                        📉 Menor
                      </span>
                    )}
                    <span className="text-[11px] font-black text-white font-mono tracking-tight text-center">
                      {formatCurrency(sale.totalSales)}
                    </span>
                  </div>

                  {/* Vertical Bar */}
                  <div
                    className={`w-full rounded-2xl transition-all duration-300 flex flex-col justify-end overflow-hidden ${
                      isHighest
                        ? 'bg-gradient-to-t from-emerald-600 via-emerald-500 to-amber-400 ring-2 ring-amber-400/80 shadow-lg shadow-emerald-950/60'
                        : isLowest
                        ? 'bg-gradient-to-t from-slate-700 to-emerald-800/90 border border-slate-600'
                        : 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                    } ${isSelected ? 'ring-2 ring-white scale-105 shadow-xl' : 'hover:opacity-95'}`}
                    style={{ height: `${heightPercent}%` }}
                  />

                  {/* Bottom Day & Weekday Label */}
                  <div className="flex flex-col items-center mt-2">
                    <span
                      className={`text-xs font-black font-mono ${
                        isHighest ? 'text-amber-400 font-extrabold' : isSelected ? 'text-white' : 'text-slate-200'
                      }`}
                    >
                      Dia {String(d).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {weekday}
                    </span>
                  </div>
                </div>
              );
            })}
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
            {monthSales.map((sale) => {
              const isOnlyCost = (sale.totalSales === 0 || !sale.totalSales) && (sale.cost > 0 || (sale.costEntries && sale.costEntries.length > 0));
              const isOnlySales = sale.totalSales > 0 && (!sale.cost || sale.cost === 0);
              const hasBoth = sale.totalSales > 0 && sale.cost > 0;

              return (
                <div
                  key={sale.id}
                  className={`py-2.5 px-2 flex items-center justify-between rounded-xl transition ${
                    isOnlyCost ? 'hover:bg-amber-950/20' : 'hover:bg-slate-850/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{formatDateBR(sale.date)}</span>
                      {isOnlyCost && (
                        <span className="text-[9px] font-black uppercase text-amber-300 bg-amber-950/80 border border-amber-800/60 px-1.5 py-0.5 rounded-md">
                          Custo
                        </span>
                      )}
                      {isOnlySales && (
                        <span className="text-[9px] font-black uppercase text-emerald-300 bg-emerald-950/80 border border-emerald-800/60 px-1.5 py-0.5 rounded-md">
                          Venda
                        </span>
                      )}
                      {hasBoth && (
                        <span className="text-[9px] font-black uppercase text-teal-300 bg-teal-950/80 border border-teal-800/60 px-1.5 py-0.5 rounded-md">
                          Venda + Custo
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {isOnlyCost && `Sem vendas • Custo: ${formatCurrency(sale.cost)}`}
                      {isOnlySales && `${sale.salesCount} ${sale.salesCount === 1 ? 'venda' : 'vendas'} • Sem custos`}
                      {hasBoth && `${sale.salesCount} ${sale.salesCount === 1 ? 'venda' : 'vendas'} • Custo: ${formatCurrency(sale.cost)}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {isOnlyCost ? (
                        <>
                          <p className="text-xs font-bold text-amber-400 font-mono">
                            - {formatCurrency(sale.cost)}
                          </p>
                          <p className="text-[11px] font-bold text-amber-300/90 font-mono">
                            Saída do Negócio
                          </p>
                        </>
                      ) : isOnlySales ? (
                        <>
                          <p className="text-xs font-bold text-white font-mono">
                            {formatCurrency(sale.totalSales)}
                          </p>
                          <p className="text-[11px] font-bold text-emerald-400 font-mono">
                            Lucro: {formatCurrency(sale.profit)} (100% limpo)
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-xs font-bold text-white font-mono">
                            {formatCurrency(sale.totalSales)}
                          </p>
                          <p
                            className={`text-[11px] font-bold font-mono ${
                              sale.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {sale.profit >= 0
                              ? `Lucro: ${formatCurrency(sale.profit)} (${formatPercent(sale.profitMargin)})`
                              : `Prejuízo: ${formatCurrency(sale.profit)}`}
                          </p>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => onOpenNewSale(sale)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal for adding monthly costs / expenses */}
      {onAddCost && (
        <AddCostModal
          isOpen={isCostModalOpen}
          onClose={() => setIsCostModalOpen(false)}
          onSaveCost={onAddCost}
        />
      )}
    </div>
  );
};

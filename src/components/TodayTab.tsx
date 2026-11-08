import React, { useState, useMemo } from 'react';
import { DailySale, MonthSummary } from '../types/sales';
import {
  formatCurrency,
  formatPercent,
  formatDateBR,
  formatDateFull,
  getTodayDateString,
} from '../utils/formatters';
import { generateDailyWhatsAppText } from '../utils/storage';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Share2,
  Edit2,
  Trash2,
  Clock,
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  QrCode,
  Banknote,
  CreditCard,
  Zap,
  ListFilter,
  Layers,
  Cloud,
  CloudCheck,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface TodayTabProps {
  todaySale?: DailySale;
  allSales: DailySale[];
  allRecentTransactions: Array<{
    id: string;
    amount: number;
    paymentMethod: 'pix' | 'cash' | 'card';
    time: string;
    date: string;
    createdAt: string;
  }>;
  monthSummary: MonthSummary;
  onOpenNewSale: (saleToEdit?: DailySale) => void;
  onDeleteSale: (id: string) => void;
  onDeleteSaleEntry: (date: string, entryId: string) => void;
}

export const TodayTab: React.FC<TodayTabProps> = ({
  todaySale,
  allSales,
  allRecentTransactions,
  monthSummary,
  onOpenNewSale,
  onDeleteSale,
  onDeleteSaleEntry,
}) => {
  const { user, signInWithGoogle } = useAuth();
  const todayStr = getTodayDateString();
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [viewMode, setViewMode] = useState<'individual' | 'daily'>('individual');
  const [periodOption, setPeriodOption] = useState<'today' | '7d' | '15d' | '30d'>('today');

  const periodStats = useMemo(() => {
    const isToday = periodOption === 'today';
    const daysCount = isToday ? 1 : periodOption === '7d' ? 7 : periodOption === '15d' ? 15 : 30;
    const label = isToday ? 'Hoje' : periodOption === '7d' ? '7 Dias' : periodOption === '15d' ? '15 Dias' : '30 Dias';

    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - (daysCount - 1));
    startDate.setHours(0, 0, 0, 0);

    const startYear = startDate.getFullYear();
    const startMonth = String(startDate.getMonth() + 1).padStart(2, '0');
    const startDay = String(startDate.getDate()).padStart(2, '0');
    const startStr = `${startYear}-${startMonth}-${startDay}`;

    const endYear = now.getFullYear();
    const endMonth = String(now.getMonth() + 1).padStart(2, '0');
    const endDay = String(now.getDate()).padStart(2, '0');
    const endStr = `${endYear}-${endMonth}-${endDay}`;

    // Filter sales in this window
    const periodSales = allSales.filter(
      (s) => s.date >= startStr && s.date <= endStr && s.totalSales > 0
    );

    const totalRevenue = periodSales.reduce((acc, s) => acc + s.totalSales, 0);
    const totalCost = periodSales.reduce((acc, s) => acc + s.cost, 0);
    const totalProfit = periodSales.reduce((acc, s) => acc + s.profit, 0);
    const totalSalesCount = periodSales.reduce((acc, s) => acc + (s.salesCount || 1), 0);
    const daysWithSales = periodSales.length;

    // Daily average based on days that had sales
    const dailyAverageRevenue = isToday ? totalRevenue : daysWithSales > 0 ? totalRevenue / daysWithSales : 0;
    const dailyAverageProfit = isToday ? totalProfit : daysWithSales > 0 ? totalProfit / daysWithSales : 0;
    const averageTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      isToday,
      daysCount,
      label,
      startStr,
      endStr,
      totalRevenue,
      totalCost,
      totalProfit,
      totalSalesCount,
      daysWithSales,
      dailyAverageRevenue,
      dailyAverageProfit,
      averageTicket,
      profitMargin,
    };
  }, [allSales, periodOption]);

  const handleShareWhatsApp = (sale: DailySale) => {
    const text = generateDailyWhatsAppText(sale);
    const encoded = encodeURIComponent(text);
    const url = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');

    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 2500);
  };

  // Compare today with month's daily average
  const revenueDiff = todaySale ? todaySale.totalSales - monthSummary.dailyAverageRevenue : 0;
  const isAboveAverage = revenueDiff >= 0;

  return (
    <div className="space-y-4 pb-20">
      {/* Cloud Sync Status Indicator */}
      {user ? (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/80 border border-emerald-500/30 text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <CloudCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Nuvem Ativa: Celular e Site sincronizados</span>
          </div>
          <span className="text-[10px] text-slate-400 truncate max-w-[140px]">{user.email}</span>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-[11px] font-medium leading-tight">
              Para sincronizar celular e computador, conecte sua conta Google.
            </span>
          </div>
          <button
            onClick={signInWithGoogle}
            className="shrink-0 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[10px] px-2.5 py-1 rounded-lg transition cursor-pointer"
          >
            Conectar
          </button>
        </div>
      )}

      {/* 1. LIVE SALES & AVERAGE HERO CARD with Hoje, 7, 15, and 30 Days Options */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 border-2 border-emerald-500/50 p-4 shadow-xl">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
              {periodStats.isToday ? 'Resultado de Hoje (Tempo Real)' : 'Média de Vendas (Tempo Real)'}
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-300 font-mono bg-slate-900/90 px-2 py-0.5 rounded-lg border border-slate-800">
            {periodStats.isToday
              ? `${periodStats.totalSalesCount} ${periodStats.totalSalesCount === 1 ? 'venda' : 'vendas'} hoje`
              : `${periodStats.totalSalesCount} ${periodStats.totalSalesCount === 1 ? 'venda' : 'vendas'} em ${periodStats.label}`}
          </span>
        </div>

        {/* Hoje / 7 Dias / 15 Dias / 30 Dias Selector Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-slate-950/80 border border-slate-800/90 mb-3">
          <button
            type="button"
            onClick={() => setPeriodOption('today')}
            className={`py-2 px-1 text-[11px] sm:text-xs font-black rounded-xl transition cursor-pointer flex items-center justify-center ${
              periodOption === 'today'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            <span>Hoje</span>
          </button>
          <button
            type="button"
            onClick={() => setPeriodOption('7d')}
            className={`py-2 px-1 text-[11px] sm:text-xs font-black rounded-xl transition cursor-pointer flex items-center justify-center ${
              periodOption === '7d'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            <span>7 Dias</span>
          </button>
          <button
            type="button"
            onClick={() => setPeriodOption('15d')}
            className={`py-2 px-1 text-[11px] sm:text-xs font-black rounded-xl transition cursor-pointer flex items-center justify-center ${
              periodOption === '15d'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            <span>15 Dias</span>
          </button>
          <button
            type="button"
            onClick={() => setPeriodOption('30d')}
            className={`py-2 px-1 text-[11px] sm:text-xs font-black rounded-xl transition cursor-pointer flex items-center justify-center ${
              periodOption === '30d'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            <span>30 Dias</span>
          </button>
        </div>

        {/* Main Big Value */}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
            {formatCurrency(periodStats.isToday ? periodStats.totalRevenue : periodStats.dailyAverageRevenue)}
          </span>
          {!periodStats.isToday && (
            <span className="text-xs font-bold text-emerald-400">/ dia</span>
          )}
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
          {periodStats.isToday
            ? 'Total faturado no dia de hoje'
            : `Média por dia trabalhado nos últimos ${periodStats.label}`}
        </p>

        {/* Live stats summary row */}
        <div className="mt-3 pt-2.5 border-t border-emerald-900/40 grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-900/80 rounded-xl p-2.5 border border-emerald-950">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              {periodStats.isToday ? 'Vendido Hoje' : `Faturamento (${periodStats.label})`}
            </span>
            <p className="text-xs font-extrabold text-white font-mono mt-0.5">
              {formatCurrency(periodStats.totalRevenue)}
            </p>
          </div>
          <div className="bg-slate-900/80 rounded-xl p-2.5 border border-emerald-950">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              {periodStats.isToday ? 'Lucro Líquido Hoje' : 'Lucro Médio por Dia'}
            </span>
            <p className="text-xs font-extrabold text-emerald-400 font-mono mt-0.5">
              {formatCurrency(periodStats.isToday ? periodStats.totalProfit : periodStats.dailyAverageProfit)}
            </p>
          </div>
        </div>
      </div>

      {/* 2. TODAY'S STATUS CARD */}
      {todaySale ? (
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-2xl">
          {/* Top Status Badge */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Resultado de Hoje
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleShareWhatsApp(todaySale)}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 px-2.5 py-1 rounded-xl transition cursor-pointer"
                title="Compartilhar no WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{copiedWhatsApp ? 'Enviado!' : 'WhatsApp'}</span>
              </button>
              <button
                onClick={() => onOpenNewSale(todaySale)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition cursor-pointer"
                title="Editar lançamento de hoje"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Main Profit Card */}
          <div className="mt-4 text-center rounded-2xl bg-gradient-to-tr from-emerald-950/60 via-slate-900 to-emerald-950/40 border border-emerald-500/30 p-4 shadow-inner">
            <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-300">
              Seu Lucro Líquido Hoje
            </p>
            <p className="mt-1 text-3xl sm:text-4xl font-black text-emerald-400 font-mono tracking-tight">
              {formatCurrency(todaySale.profit)}
            </p>
            <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <span>Margem de Lucro:</span>
              <span className="font-mono">{formatPercent(todaySale.profitMargin)}</span>
            </div>
          </div>

          {/* Stats Grid: Faturamento, Volume, Ticket Médio */}
          <div className="mt-3.5 grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-slate-800/70 p-3.5 border border-slate-750">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
                <DollarSign className="w-3.5 h-3.5 text-blue-400" />
                <span>Total Vendido Hoje</span>
              </div>
              <p className="mt-1 text-lg font-bold text-white font-mono">
                {formatCurrency(todaySale.totalSales)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-800/70 p-3.5 border border-slate-750">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
                <ShoppingBag className="w-3.5 h-3.5 text-purple-400" />
                <span>Volume de Vendas</span>
              </div>
              <p className="mt-1 text-lg font-bold text-white font-mono">
                {todaySale.salesCount} {todaySale.salesCount === 1 ? 'venda' : 'vendas'}
              </p>
            </div>
          </div>

          {/* Today's Payment Methods Breakdown */}
          {(todaySale.paymentMethods?.pix ||
            todaySale.paymentMethods?.credit ||
            todaySale.paymentMethods?.cash) && (
            <div className="mt-3.5 pt-3 border-t border-slate-800">
              <p className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                Recebimentos de Hoje:
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-800/80 p-2 border border-slate-750">
                  <span className="text-[10px] text-emerald-400 font-bold">PIX</span>
                  <p className="text-xs font-bold text-white font-mono mt-0.5">
                    {formatCurrency(todaySale.paymentMethods?.pix || 0)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-800/80 p-2 border border-slate-750">
                  <span className="text-[10px] text-blue-400 font-bold">CARTÃO</span>
                  <p className="text-xs font-bold text-white font-mono mt-0.5">
                    {formatCurrency(
                      (todaySale.paymentMethods?.credit || 0) + (todaySale.paymentMethods?.debit || 0)
                    )}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-800/80 p-2 border border-slate-750">
                  <span className="text-[10px] text-amber-400 font-bold">DINHEIRO</span>
                  <p className="text-xs font-bold text-white font-mono mt-0.5">
                    {formatCurrency(todaySale.paymentMethods?.cash || 0)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty State: Invitation */
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 text-center shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 mb-3 border border-emerald-500/30">
            <Clock className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white">Nenhuma venda lançada hoje</h3>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            Toque no botão abaixo para lançar sua primeira venda e atualizar suas médias!
          </p>

          <button
            onClick={() => onOpenNewSale()}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 py-3.5 px-6 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-500/25 hover:from-emerald-500 hover:to-teal-300 active:scale-95 transition cursor-pointer"
          >
            <PlusCircle className="w-5 h-5 stroke-[2.5]" />
            Lançar Venda Agora
          </button>
        </div>
      )}

      {/* 3. ÚLTIMOS LANÇAMENTOS (ATUALIZAÇÃO AUTOMÁTICA EM TEMPO REAL) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
              Últimos Lançamentos
            </h3>
            <p className="text-[10px] text-slate-400">Atualiza automaticamente a cada venda</p>
          </div>

          {/* Toggle between Individual Transactions vs Day Groups */}
          <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800 text-[11px] font-bold">
            <button
              onClick={() => setViewMode('individual')}
              className={`px-2.5 py-1 rounded-lg transition ${
                viewMode === 'individual'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Vendas
            </button>
            <button
              onClick={() => setViewMode('daily')}
              className={`px-2.5 py-1 rounded-lg transition ${
                viewMode === 'daily'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Dias
            </button>
          </div>
        </div>

        {/* View Mode A: Individual Sales Transactions List */}
        {viewMode === 'individual' && (
          <div className="space-y-2">
            {allRecentTransactions.length === 0 ? (
              <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 text-center text-slate-400 text-xs">
                Nenhuma venda registrada ainda.
              </div>
            ) : (
              allRecentTransactions.slice(0, 15).map((tx) => {
                const isToday = tx.date === todayStr;
                return (
                  <div
                    key={tx.id}
                    className="rounded-2xl p-3 bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-between transition animate-in fade-in"
                  >
                    <div className="flex items-center gap-3">
                      {/* Method Icon Badge */}
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          tx.paymentMethod === 'pix'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : tx.paymentMethod === 'card'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {tx.paymentMethod === 'pix' && <QrCode className="w-5 h-5 stroke-[2.2]" />}
                        {tx.paymentMethod === 'card' && <CreditCard className="w-5 h-5 stroke-[2.2]" />}
                        {tx.paymentMethod === 'cash' && <Banknote className="w-5 h-5 stroke-[2.2]" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-white font-mono">
                            {formatCurrency(tx.amount)}
                          </span>
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                              tx.paymentMethod === 'pix'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                                : tx.paymentMethod === 'card'
                                ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                                : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                            }`}
                          >
                            {tx.paymentMethod === 'pix' ? 'Pix' : tx.paymentMethod === 'card' ? 'Cartão' : 'Dinheiro'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {isToday ? 'Hoje' : formatDateBR(tx.date)} {tx.time ? `às ${tx.time}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Delete single transaction */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSaleEntry(tx.date, tx.id);
                      }}
                      className="p-2.5 text-slate-400 hover:text-rose-400 active:text-rose-500 hover:bg-rose-950/40 rounded-xl transition cursor-pointer active:scale-95 touch-manipulation"
                      title="Excluir este lançamento"
                      aria-label="Excluir este lançamento"
                    >
                      <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-400 transition" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* View Mode B: Daily Groups */}
        {viewMode === 'daily' && (
          <div className="space-y-2">
            {allSales.slice(0, 10).map((sale) => {
              const isToday = sale.date === todayStr;
              return (
                <div
                  key={sale.id}
                  className={`rounded-2xl p-3.5 border transition ${
                    isToday
                      ? 'bg-slate-900 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-white">
                          {formatDateBR(sale.date)}
                        </span>
                        {isToday && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                            Hoje
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {sale.salesCount} {sale.salesCount === 1 ? 'venda' : 'vendas'}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-white font-mono">
                        {formatCurrency(sale.totalSales)}
                      </p>
                      <span className="text-[11px] text-emerald-400 font-bold font-mono">
                        Lucro: {formatCurrency(sale.profit)}
                      </span>
                    </div>
                  </div>

                  {/* Payment methods badges & Actions footer */}
                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {sale.paymentMethods?.pix ? (
                        <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-md font-mono">
                          Pix {formatCurrency(sale.paymentMethods.pix)}
                        </span>
                      ) : null}
                      {sale.paymentMethods?.credit ? (
                        <span className="text-[10px] font-bold text-blue-300 bg-blue-950/60 border border-blue-800/50 px-2 py-0.5 rounded-md font-mono">
                          Cartão {formatCurrency(sale.paymentMethods.credit)}
                        </span>
                      ) : null}
                      {sale.paymentMethods?.cash ? (
                        <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-800/50 px-2 py-0.5 rounded-md font-mono">
                          Dinheiro {formatCurrency(sale.paymentMethods.cash)}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleShareWhatsApp(sale)}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                        title="Enviar no WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onOpenNewSale(sale)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                        title="Editar dia"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSale(sale.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-400 active:text-rose-500 hover:bg-rose-950/40 rounded-lg transition cursor-pointer active:scale-95 touch-manipulation"
                        title="Excluir dia"
                        aria-label="Excluir dia"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-rose-400 transition" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

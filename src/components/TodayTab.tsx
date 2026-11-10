import React, { useState, useMemo } from 'react';
import { DailySale, MonthSummary, TransactionItem } from '../types/sales';
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
  ArrowRightLeft,
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
  Gift,
  X,
  Check,
  Tag,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface TodayTabProps {
  todaySale?: DailySale;
  allSales: DailySale[];
  allRecentTransactions: TransactionItem[];
  monthSummary: MonthSummary;
  onOpenNewSale: (saleToEdit?: DailySale) => void;
  onOpenNewCost?: () => void;
  onDeleteSale: (id: string) => void;
  onDeleteSaleEntry: (date: string, entryId: string) => void;
  onDeleteCostEntry?: (date: string, costId: string) => void;
  onUpdateSaleEntry?: (date: string, entryId: string, updates: { paymentMethod?: 'pix' | 'cash' | 'card'; amount?: number }) => Promise<void> | void;
  onNavigateToCredits?: () => void;
  activeCreditsCount?: number;
  totalActiveCreditsBalance?: number;
}

export const TodayTab: React.FC<TodayTabProps> = ({
  todaySale,
  allSales,
  allRecentTransactions,
  monthSummary,
  onOpenNewSale,
  onOpenNewCost,
  onDeleteSale,
  onDeleteSaleEntry,
  onDeleteCostEntry,
  onUpdateSaleEntry,
  onNavigateToCredits,
  activeCreditsCount = 0,
  totalActiveCreditsBalance = 0,
}) => {
  const { user, signInWithGoogle } = useAuth();
  const todayStr = getTodayDateString();
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'individual' | 'daily'>('individual');
  const [periodOption, setPeriodOption] = useState<'today' | '7d' | '15d' | '30d'>('today');
  const [txFilter, setTxFilter] = useState<'all' | 'sales' | 'costs'>('all');

  // Edit Sale Entry payment method state
  const [editingSaleEntry, setEditingSaleEntry] = useState<TransactionItem | null>(null);
  const [editPaymentMethod, setEditPaymentMethod] = useState<'pix' | 'cash' | 'card'>('pix');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleDeleteEntryWithFeedback = (date: string, id: string) => {
    onDeleteSaleEntry(date, id);
    setFeedbackToast('Lançamento excluído com sucesso');
    setTimeout(() => setFeedbackToast(null), 2500);
  };

  const handleDeleteCostWithFeedback = (date: string, id: string) => {
    if (onDeleteCostEntry) {
      onDeleteCostEntry(date, id);
      setFeedbackToast('Custo excluído com sucesso');
      setTimeout(() => setFeedbackToast(null), 2500);
    }
  };

  const handleDeleteSaleWithFeedback = (id: string) => {
    onDeleteSale(id);
    setFeedbackToast('Venda do dia excluída');
    setTimeout(() => setFeedbackToast(null), 2500);
  };

  const handleOpenEditSaleEntry = (tx: TransactionItem) => {
    setEditingSaleEntry(tx);
    setEditPaymentMethod(tx.paymentMethod || 'pix');
  };

  const handleSaveEditSaleEntry = async () => {
    if (!editingSaleEntry || !onUpdateSaleEntry) return;
    setIsSavingEdit(true);
    try {
      await onUpdateSaleEntry(editingSaleEntry.date, editingSaleEntry.id, {
        paymentMethod: editPaymentMethod,
      });
      setFeedbackToast('Forma de pagamento atualizada com sucesso');
      setTimeout(() => setFeedbackToast(null), 2500);
      setEditingSaleEntry(null);
    } catch (err) {
      console.error('Erro ao editar forma de pagamento:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

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
    const totalCost = periodSales.reduce(
      (acc, s) =>
        acc +
        (Array.isArray(s.costEntries) && s.costEntries.length > 0
          ? s.costEntries.reduce((sub, c) => sub + (Number(c.amount) || 0), 0)
          : (Array.isArray(s.entries) && s.entries.length > 0 && (!s.costEntries || s.costEntries.length === 0)
              ? 0
              : (Number(s.cost) || 0))),
      0
    );
    const totalProfit = totalRevenue - totalCost;
    const totalSalesCount = periodSales.reduce((acc, s) => acc + (s.salesCount || 1), 0);
    const daysWithSales = periodSales.length;

    // Daily average based on days that had sales
    const dailyAverageRevenue = isToday ? totalRevenue : daysWithSales > 0 ? totalRevenue / daysWithSales : 0;
    const dailyAverageProfit = isToday ? totalProfit : daysWithSales > 0 ? totalProfit / daysWithSales : 0;
    const averageTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : (totalCost > 0 ? 0 : 100);

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

      {/* Active Credits Notice Banner */}
      {activeCreditsCount > 0 && onNavigateToCredits && (
        <div
          onClick={onNavigateToCredits}
          className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/40 hover:border-emerald-400/70 transition shadow-lg cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              <Gift className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-white">
                {activeCreditsCount} {activeCreditsCount === 1 ? 'cliente possui' : 'clientes possuem'} vale-crédito
              </p>
              <p className="text-[11px] text-emerald-400 font-mono font-bold">
                Total a abater: {formatCurrency(totalActiveCreditsBalance)}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-extrabold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-xl border border-emerald-800/60 shrink-0">
            Ver &rarr;
          </span>
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

        {/* Quick actions row */}
        <div className="mt-3 pt-2.5 border-t border-emerald-900/30 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onOpenNewSale()}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>+ Nova Venda</span>
          </button>
          <button
            type="button"
            onClick={() => (onOpenNewCost ? onOpenNewCost() : onOpenNewSale())}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-900 border border-amber-500/50 hover:bg-amber-500/10 text-amber-300 font-black text-xs shadow-md shadow-amber-500/10 active:scale-95 transition cursor-pointer"
          >
            <Receipt className="w-4 h-4 stroke-[2.2] text-amber-400" />
            <span>+ Lançar Custo</span>
          </button>
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
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => (onOpenNewCost ? onOpenNewCost() : onOpenNewSale())}
                className="flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-white bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-2.5 py-1 rounded-xl transition cursor-pointer"
                title="Lançar custo ou despesa de hoje"
              >
                <Receipt className="w-3.5 h-3.5 text-amber-400" />
                <span>+ Custo</span>
              </button>
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

          {/* Stats Grid: Faturamento, Custos (se houver), Volume */}
          {todaySale.cost > 0 ? (
            <div className="mt-3.5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-slate-800/70 p-2.5 border border-slate-750">
                <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] font-semibold">
                  <DollarSign className="w-3 h-3 text-blue-400" />
                  <span>Vendido</span>
                </div>
                <p className="mt-0.5 text-sm font-bold text-white font-mono">
                  {formatCurrency(todaySale.totalSales)}
                </p>
              </div>

              <div className="rounded-2xl bg-amber-500/10 p-2.5 border border-amber-500/30">
                <div className="flex items-center justify-center gap-1 text-amber-400 text-[10px] font-semibold">
                  <Receipt className="w-3 h-3 text-amber-400" />
                  <span>Custos</span>
                </div>
                <p className="mt-0.5 text-sm font-bold text-amber-300 font-mono">
                  {formatCurrency(todaySale.cost)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-800/70 p-2.5 border border-slate-750">
                <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] font-semibold">
                  <ShoppingBag className="w-3 h-3 text-purple-400" />
                  <span>Volume</span>
                </div>
                <p className="mt-0.5 text-sm font-bold text-white font-mono">
                  {todaySale.salesCount} {todaySale.salesCount === 1 ? 'venda' : 'vendas'}
                </p>
              </div>
            </div>
          ) : (
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
          )}

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
          <h3 className="text-lg font-bold text-white">Nenhum lançamento hoje</h3>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            Lance suas vendas ou custos do dia para acompanhar seu lucro real em tempo real!
          </p>

          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2">
            <button
              onClick={() => onOpenNewSale()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 py-3.5 px-6 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-500/25 hover:from-emerald-500 hover:to-teal-300 active:scale-95 transition cursor-pointer"
            >
              <PlusCircle className="w-5 h-5 stroke-[2.5]" />
              Lançar Venda
            </button>
            <button
              onClick={() => (onOpenNewCost ? onOpenNewCost() : onOpenNewSale())}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-800 border border-amber-500/40 hover:bg-slate-750 py-3.5 px-6 text-sm font-extrabold text-amber-300 active:scale-95 transition cursor-pointer"
            >
              <Receipt className="w-5 h-5 stroke-[2.2] text-amber-400" />
              Lançar Custo
            </button>
          </div>
        </div>
      )}

      {/* 3. ÚLTIMOS LANÇAMENTOS (ATUALIZAÇÃO AUTOMÁTICA EM TEMPO REAL) */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
              Últimos Lançamentos
            </h3>
            <p className="text-[10px] text-slate-400">Vendas e custos atualizados automaticamente</p>
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
              Lançamentos
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

        {/* Filter chips: Todos, Vendas, Custos */}
        {viewMode === 'individual' && (
          <div className="flex items-center gap-1.5 mb-2.5 px-1">
            <button
              type="button"
              onClick={() => setTxFilter('all')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer border ${
                txFilter === 'all'
                  ? 'bg-slate-800 text-white border-slate-700'
                  : 'bg-slate-950 text-slate-400 border-slate-850 hover:text-slate-300'
              }`}
            >
              Todos ({allRecentTransactions.length})
            </button>
            <button
              type="button"
              onClick={() => setTxFilter('sales')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer border flex items-center gap-1 ${
                txFilter === 'sales'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-950 text-slate-400 border-slate-850 hover:text-slate-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Vendas ({allRecentTransactions.filter((t) => t.type === 'sale').length})
            </button>
            <button
              type="button"
              onClick={() => setTxFilter('costs')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer border flex items-center gap-1 ${
                txFilter === 'costs'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-slate-950 text-slate-400 border-slate-850 hover:text-slate-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              Custos ({allRecentTransactions.filter((t) => t.type === 'cost').length})
            </button>
          </div>
        )}

        {/* View Mode A: Individual Transactions List (Sales + Costs) */}
        {viewMode === 'individual' && (
          <div className="space-y-2">
            {allRecentTransactions.length === 0 ? (
              <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 text-center text-slate-400 text-xs">
                Nenhum lançamento registrado ainda.
              </div>
            ) : (
              allRecentTransactions
                .filter((tx) => {
                  if (txFilter === 'sales') return tx.type === 'sale';
                  if (txFilter === 'costs') return tx.type === 'cost';
                  return true;
                })
                .slice(0, 20)
                .map((tx) => {
                  const isToday = tx.date === todayStr;
                  const isCost = tx.type === 'cost';

                  return (
                    <div
                      key={tx.id}
                      className={`rounded-2xl p-3 border transition animate-in fade-in flex items-center justify-between ${
                        isCost
                          ? 'bg-slate-900 border-amber-500/30 hover:border-amber-500/50'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Method / Cost Icon Badge */}
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            isCost
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : tx.paymentMethod === 'pix'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : tx.paymentMethod === 'card'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {isCost && <Receipt className="w-5 h-5 stroke-[2.2]" />}
                          {!isCost && tx.paymentMethod === 'pix' && <QrCode className="w-5 h-5 stroke-[2.2]" />}
                          {!isCost && tx.paymentMethod === 'card' && <CreditCard className="w-5 h-5 stroke-[2.2]" />}
                          {!isCost && tx.paymentMethod === 'cash' && <Banknote className="w-5 h-5 stroke-[2.2]" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-extrabold font-mono ${
                                isCost ? 'text-amber-400' : 'text-white'
                              }`}
                            >
                              {isCost ? `- ${formatCurrency(tx.amount)}` : formatCurrency(tx.amount)}
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                isCost
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                                  : tx.paymentMethod === 'pix'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                                  : tx.paymentMethod === 'card'
                                  ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                                  : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                              }`}
                            >
                              {isCost
                                ? tx.category || 'Custo'
                                : tx.paymentMethod === 'pix'
                                ? 'Pix'
                                : tx.paymentMethod === 'card'
                                ? 'Cartão'
                                : 'Dinheiro'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {isToday ? 'Hoje' : formatDateBR(tx.date)} {tx.time ? `às ${tx.time}` : ''}
                            {isCost && tx.description && tx.description !== tx.category && (
                              <span className="text-slate-300 ml-1">• {tx.description}</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Actions: Edit (only for sales) or Delete */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Only on SALES, provide button to edit payment method if shopkeeper made a mistake */}
                        {!isCost && onUpdateSaleEntry && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditSaleEntry(tx);
                            }}
                            className="flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 px-2.5 py-1 rounded-xl transition cursor-pointer active:scale-95"
                            title="Editar forma de pagamento (Pix, Cartão ou Dinheiro)"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Editar</span>
                          </button>
                        )}

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isCost) {
                              handleDeleteCostWithFeedback(tx.date, tx.id);
                            } else {
                              handleDeleteEntryWithFeedback(tx.date, tx.id);
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-rose-400 active:text-rose-500 hover:bg-rose-950/40 rounded-xl transition cursor-pointer active:scale-95 touch-manipulation"
                          title={isCost ? 'Excluir este custo' : 'Excluir este lançamento'}
                          aria-label={isCost ? 'Excluir este custo' : 'Excluir este lançamento'}
                        >
                          <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-400 transition" />
                        </button>
                      </div>
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
              const isOnlyCost = (sale.totalSales === 0 || !sale.totalSales) && (sale.cost > 0 || (sale.costEntries && sale.costEntries.length > 0));

              return (
                <div
                  key={sale.id}
                  className={`rounded-2xl p-3.5 border transition ${
                    isOnlyCost
                      ? 'bg-slate-900/90 border-amber-500/40 shadow-sm'
                      : isToday
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
                        {isOnlyCost && (
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 border border-amber-800/60 px-2 py-0.5 rounded-full">
                            Custo
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isOnlyCost
                          ? `Sem vendas • Custo: ${formatCurrency(sale.cost)}`
                          : `${sale.salesCount} ${sale.salesCount === 1 ? 'venda' : 'vendas'}`}
                      </p>
                    </div>

                    <div className="text-right">
                      {isOnlyCost ? (
                        <>
                          <p className="text-sm font-bold text-amber-400 font-mono">
                            - {formatCurrency(sale.cost)}
                          </p>
                          <span className="text-[11px] text-amber-300 font-bold font-mono">
                            Saída do Negócio
                          </span>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-white font-mono">
                            {formatCurrency(sale.totalSales)}
                          </p>
                          <span className="text-[11px] text-emerald-400 font-bold font-mono">
                            Lucro: {formatCurrency(sale.profit)}
                          </span>
                        </>
                      )}
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
                          handleDeleteSaleWithFeedback(sale.id);
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

      {/* Modal: Editar Forma de Pagamento da Venda (Pix, Cartão, Dinheiro) */}
      {editingSaleEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setEditingSaleEntry(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white">Editar Forma de Pagamento</h4>
                  <p className="text-[11px] text-slate-400">Corrija se foi Pix, Cartão ou Dinheiro</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSaleEntry(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl bg-slate-950 p-3.5 border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">Valor da Venda:</span>
              <p className="text-3xl font-black text-white font-mono mt-0.5">
                {formatCurrency(editingSaleEntry.amount)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {editingSaleEntry.date === todayStr ? 'Hoje' : formatDateBR(editingSaleEntry.date)} às {editingSaleEntry.time}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">
                Selecione a forma de pagamento correta:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setEditPaymentMethod('pix')}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition cursor-pointer ${
                    editPaymentMethod === 'pix'
                      ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-md'
                      : 'bg-slate-850 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-5 h-5 mb-1 text-emerald-400" />
                  <span className="text-xs font-extrabold">Pix</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditPaymentMethod('cash')}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition cursor-pointer ${
                    editPaymentMethod === 'cash'
                      ? 'bg-amber-500/20 border-amber-500 text-white shadow-md'
                      : 'bg-slate-850 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Banknote className="w-5 h-5 mb-1 text-amber-400" />
                  <span className="text-xs font-extrabold">Dinheiro</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditPaymentMethod('card')}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition cursor-pointer ${
                    editPaymentMethod === 'card'
                      ? 'bg-blue-500/20 border-blue-500 text-white shadow-md'
                      : 'bg-slate-850 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-5 h-5 mb-1 text-blue-400" />
                  <span className="text-xs font-extrabold">Cartão</span>
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingSaleEntry(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-750 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEditSaleEntry}
                disabled={isSavingEdit}
                className="flex-2 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{isSavingEdit ? 'Salvando...' : 'Salvar Alteração'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating feedback toast */}
      {feedbackToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-emerald-500/50 text-emerald-300 px-4 py-2 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{feedbackToast}</span>
        </div>
      )}
    </div>
  );
};


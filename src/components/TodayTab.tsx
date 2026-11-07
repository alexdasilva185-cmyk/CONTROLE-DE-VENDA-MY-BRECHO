import React, { useState } from 'react';
import { DailySale, MonthSummary } from '../types/sales';
import { formatCurrency, formatPercent, formatDateBR, formatDateFull, getTodayDateString } from '../utils/formatters';
import { generateDailyWhatsAppText } from '../utils/storage';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Share2,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  PlusCircle,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  FileText,
} from 'lucide-react';

interface TodayTabProps {
  todaySale?: DailySale;
  allSales: DailySale[];
  monthSummary: MonthSummary;
  onOpenNewSale: (saleToEdit?: DailySale) => void;
  onDeleteSale: (id: string) => void;
}

export const TodayTab: React.FC<TodayTabProps> = ({
  todaySale,
  allSales,
  monthSummary,
  onOpenNewSale,
  onDeleteSale,
}) => {
  const todayStr = getTodayDateString();
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  const handleShareWhatsApp = (sale: DailySale) => {
    const text = generateDailyWhatsAppText(sale);
    const encoded = encodeURIComponent(text);
    // WhatsApp web / app link
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
      {/* Hero: Today's Status */}
      {todaySale ? (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-5 shadow-2xl">
          {/* Subtle glowing backdrop */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Top Status Badge */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
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

          {/* Main Profit Card (O Lucro do Dia que o usuário quer ver!) */}
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

          {/* Stats Grid: Faturamento, Custo, Volume, Ticket Médio */}
          <div className="mt-3.5 grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-slate-800/70 p-3.5 border border-slate-750">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
                <DollarSign className="w-3.5 h-3.5 text-blue-400" />
                <span>Total Vendido</span>
              </div>
              <p className="mt-1 text-lg font-bold text-white font-mono">
                {formatCurrency(todaySale.totalSales)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-800/70 p-3.5 border border-slate-750">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
                <Receipt className="w-3.5 h-3.5 text-amber-400" />
                <span>Custo / Despesas</span>
              </div>
              <p className="mt-1 text-lg font-bold text-slate-300 font-mono">
                {formatCurrency(todaySale.cost)}
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

            <div className="rounded-2xl bg-slate-800/70 p-3.5 border border-slate-750">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
                <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
                <span>Ticket Médio</span>
              </div>
              <p className="mt-1 text-lg font-bold text-white font-mono">
                {formatCurrency(todaySale.averageTicket)}
              </p>
            </div>
          </div>

          {/* Comparison with Monthly Average */}
          {monthSummary.dailyAverageRevenue > 0 && (
            <div className="mt-3.5 rounded-2xl bg-slate-850 p-3 border border-slate-800 flex items-center gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  isAboveAverage
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {isAboveAverage ? (
                  <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 stroke-[2.5]" />
                )}
              </div>
              <div className="flex-1 text-xs">
                <p className="font-semibold text-slate-200">
                  {isAboveAverage ? (
                    <>
                      <span className="text-emerald-400 font-bold">
                        +{formatCurrency(revenueDiff)}
                      </span>{' '}
                      acima da sua média do mês!
                    </>
                  ) : (
                    <>
                      <span className="text-amber-400 font-bold">
                        -{formatCurrency(Math.abs(revenueDiff))}
                      </span>{' '}
                      em relação à sua média do mês.
                    </>
                  )}
                </p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Sua média diária atual é de {formatCurrency(monthSummary.dailyAverageRevenue)}
                </p>
              </div>
            </div>
          )}

          {/* Payment Methods breakdown if any */}
          {(todaySale.paymentMethods?.pix ||
            todaySale.paymentMethods?.credit ||
            todaySale.paymentMethods?.cash) && (
            <div className="mt-3.5 pt-3 border-t border-slate-800">
              <p className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                Formas de Pagamento Hoje:
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {todaySale.paymentMethods?.pix ? (
                  <div className="rounded-xl bg-slate-800/80 p-2 border border-slate-750">
                    <span className="text-[10px] text-emerald-400 font-bold">PIX</span>
                    <p className="text-xs font-bold text-white font-mono mt-0.5">
                      {formatCurrency(todaySale.paymentMethods.pix)}
                    </p>
                  </div>
                ) : null}
                {todaySale.paymentMethods?.credit ? (
                  <div className="rounded-xl bg-slate-800/80 p-2 border border-slate-750">
                    <span className="text-[10px] text-blue-400 font-bold">CARTÃO</span>
                    <p className="text-xs font-bold text-white font-mono mt-0.5">
                      {formatCurrency(todaySale.paymentMethods.credit)}
                    </p>
                  </div>
                ) : null}
                {todaySale.paymentMethods?.cash ? (
                  <div className="rounded-xl bg-slate-800/80 p-2 border border-slate-750">
                    <span className="text-[10px] text-amber-400 font-bold">DINHEIRO</span>
                    <p className="text-xs font-bold text-white font-mono mt-0.5">
                      {formatCurrency(todaySale.paymentMethods.cash)}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Notes if any */}
          {todaySale.notes && (
            <div className="mt-3 pt-2 text-xs text-slate-300 flex items-start gap-1.5 bg-slate-850/80 p-2.5 rounded-xl border border-slate-800">
              <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span className="italic">{todaySale.notes}</span>
            </div>
          )}
        </div>
      ) : (
        /* Empty State: Invitation to Register Today */
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-6 text-center shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 mb-3 border border-emerald-500/30">
            <Clock className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white">Vendas de Hoje Pendentes</h3>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            Você ainda não lançou o resultado de hoje ({formatDateBR(todayStr)}). Leva menos de 10 segundos!
          </p>

          <button
            onClick={() => onOpenNewSale()}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 py-3.5 px-6 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-500/25 hover:from-emerald-500 hover:to-teal-300 active:scale-95 transition cursor-pointer"
          >
            <PlusCircle className="w-5 h-5 stroke-[2.5]" />
            Lançar Vendas de Hoje
          </button>
        </div>
      )}

      {/* Recent Days History List */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Últimos Dias Lançados
          </h3>
          <span className="text-[11px] text-slate-400">
            {allSales.length} {allSales.length === 1 ? 'dia registrado' : 'dias registrados'}
          </span>
        </div>

        {allSales.length === 0 ? (
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 text-center text-slate-400 text-xs">
            Nenhuma venda registrada ainda. Toque no botão verde (+) para começar!
          </div>
        ) : (
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
                        {sale.salesCount} {sale.salesCount === 1 ? 'venda' : 'vendas'} • Ticket:{' '}
                        {formatCurrency(sale.averageTicket)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-white font-mono">
                        {formatCurrency(sale.totalSales)}
                      </p>
                      <div className="flex items-center justify-end gap-1 text-[11px] text-emerald-400 font-bold font-mono">
                        <span>Lucro:</span>
                        <span>{formatCurrency(sale.profit)}</span>
                        <span className="text-[10px] text-slate-400">
                          ({formatPercent(sale.profitMargin)})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400 truncate max-w-[190px]">
                      {sale.notes || 'Sem observações'}
                    </span>
                    <div className="flex items-center gap-1">
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
                        onClick={() => {
                          if (confirm(`Deseja excluir as vendas do dia ${formatDateBR(sale.date)}?`)) {
                            onDeleteSale(sale.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                        title="Excluir dia"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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

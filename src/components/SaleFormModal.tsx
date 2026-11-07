import React, { useState, useEffect, useMemo } from 'react';
import { DailySale, AppSettings } from '../types/sales';
import { formatCurrency, formatPercent, getTodayDateString, parseBRInputToNumber } from '../utils/formatters';
import { X, Check, DollarSign, ShoppingBag, Calendar, Sparkles, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SaleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sale: {
    date: string;
    totalSales: number;
    cost: number;
    profit?: number;
    salesCount: number;
    paymentMethods?: DailySale['paymentMethods'];
    notes?: string;
  }) => void;
  initialSale?: DailySale | null;
  settings: AppSettings;
  existingSales: DailySale[];
}

export const SaleFormModal: React.FC<SaleFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSale,
  settings,
}) => {
  const todayStr = getTodayDateString();

  // Date state
  const [date, setDate] = useState<string>(todayStr);

  // Inputs as formatted strings for smooth typing
  const [salesInput, setSalesInput] = useState<string>('');
  const [calcMode, setCalcMode] = useState<'cost' | 'margin' | 'direct'>('cost');
  const [costInput, setCostInput] = useState<string>('');
  const [marginInput, setMarginInput] = useState<string>(String(settings.defaultProfitMargin || 50));
  const [directProfitInput, setDirectProfitInput] = useState<string>('');
  const [salesCount, setSalesCount] = useState<number>(1);

  // Optional details
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [pixInput, setPixInput] = useState<string>('');
  const [creditInput, setCreditInput] = useState<string>('');
  const [cashInput, setCashInput] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Yesterday helper date string
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Sync when initialSale or open changes
  useEffect(() => {
    if (initialSale) {
      setDate(initialSale.date);
      setSalesInput(initialSale.totalSales.toFixed(2).replace('.', ','));
      setCostInput(initialSale.cost.toFixed(2).replace('.', ','));
      setDirectProfitInput(initialSale.profit.toFixed(2).replace('.', ','));
      setMarginInput(initialSale.profitMargin.toFixed(0));
      setSalesCount(initialSale.salesCount || 1);
      setPixInput(initialSale.paymentMethods?.pix ? initialSale.paymentMethods.pix.toFixed(2).replace('.', ',') : '');
      setCreditInput(initialSale.paymentMethods?.credit ? initialSale.paymentMethods.credit.toFixed(2).replace('.', ',') : '');
      setCashInput(initialSale.paymentMethods?.cash ? initialSale.paymentMethods.cash.toFixed(2).replace('.', ',') : '');
      setNotes(initialSale.notes || '');
      setCalcMode('cost');
      if (initialSale.notes || initialSale.paymentMethods) {
        setShowDetails(true);
      }
    } else {
      setDate(todayStr);
      setSalesInput('');
      setCostInput('');
      setDirectProfitInput('');
      setMarginInput(String(settings.defaultProfitMargin || 50));
      setSalesCount(1);
      setPixInput('');
      setCreditInput('');
      setCashInput('');
      setNotes('');
      setCalcMode(settings.defaultCalculationMode || 'cost');
      setShowDetails(false);
    }
  }, [initialSale, isOpen, settings, todayStr]);

  if (!isOpen) return null;

  // Numerical values
  const totalSalesVal = parseBRInputToNumber(salesInput);

  let calculatedProfit = 0;
  let calculatedCost = 0;

  if (calcMode === 'cost') {
    calculatedCost = parseBRInputToNumber(costInput);
    calculatedProfit = Math.max(0, totalSalesVal - calculatedCost);
  } else if (calcMode === 'margin') {
    const marginPct = parseBRInputToNumber(marginInput);
    calculatedProfit = (totalSalesVal * marginPct) / 100;
    calculatedCost = Math.max(0, totalSalesVal - calculatedProfit);
  } else {
    // direct
    calculatedProfit = parseBRInputToNumber(directProfitInput);
    calculatedCost = Math.max(0, totalSalesVal - calculatedProfit);
  }

  const profitMargin = totalSalesVal > 0 ? (calculatedProfit / totalSalesVal) * 100 : 0;
  const averageTicket = salesCount > 0 ? totalSalesVal / salesCount : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalSalesVal <= 0) {
      return;
    }

    const pix = parseBRInputToNumber(pixInput);
    const credit = parseBRInputToNumber(creditInput);
    const cash = parseBRInputToNumber(cashInput);

    onSave({
      date,
      totalSales: totalSalesVal,
      cost: calculatedCost,
      profit: calculatedProfit,
      salesCount: Math.max(1, salesCount),
      paymentMethods: {
        pix: pix > 0 ? pix : undefined,
        credit: credit > 0 ? credit : undefined,
        cash: cash > 0 ? cash : undefined,
      },
      notes: notes.trim() || undefined,
    });

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#10b981', '#34d399', '#6ee7b7', '#f59e0b'],
      });
    } catch {
      // ignore
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {initialSale ? 'Editar Lançamento' : 'Lançar Resultados do Dia'}
              </h2>
              <p className="text-xs text-slate-400">Informe suas vendas e o lucro do dia</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Quick Date Pills */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              Data das Vendas
            </label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <button
                type="button"
                onClick={() => setDate(todayStr)}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                  date === todayStr
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setDate(yesterdayStr)}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                  date === yesterdayStr
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Ontem
              </button>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-full py-2 px-2.5 text-xs font-semibold rounded-xl bg-slate-800/60 border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Valor Total Vendido (Hero Input) */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-800/90 to-slate-850 p-4 border border-slate-750 shadow-inner">
            <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />
              Quanto você vendeu no dia? (Total Bruto)
            </label>
            <div className="relative mt-2 flex items-center">
              <span className="absolute left-3 text-lg font-bold text-slate-400">R$</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={salesInput}
                onChange={(e) => setSalesInput(e.target.value)}
                autoFocus={!initialSale}
                required
                className="w-full rounded-xl bg-slate-950/80 border-2 border-emerald-500/50 focus:border-emerald-400 py-3 pl-11 pr-4 text-2xl font-extrabold text-white placeholder-slate-600 focus:outline-none font-mono transition"
              />
            </div>
            {/* Quick addition chips */}
            <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Atalhos:</span>
              {[50, 100, 250, 500, 1000].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => {
                    const current = parseBRInputToNumber(salesInput);
                    setSalesInput((current + val).toFixed(2).replace('.', ','));
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-800 text-emerald-300 hover:bg-slate-700 border border-slate-700 font-mono transition cursor-pointer"
                >
                  +{val}
                </button>
              ))}
            </div>
          </div>

          {/* Profit Calculation Mode */}
          <div className="rounded-2xl bg-slate-850 p-3.5 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1">
                Como calcular o Lucro do Dia?
              </label>
              <span className="text-[10px] text-slate-400">Escolha o jeito mais fácil</span>
            </div>

            {/* Mode Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 mb-3">
              <button
                type="button"
                onClick={() => setCalcMode('cost')}
                className={`py-1.5 text-[11px] font-bold rounded-lg transition ${
                  calcMode === 'cost'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Digitar Custo
              </button>
              <button
                type="button"
                onClick={() => setCalcMode('margin')}
                className={`py-1.5 text-[11px] font-bold rounded-lg transition ${
                  calcMode === 'margin'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                % de Margem
              </button>
              <button
                type="button"
                onClick={() => setCalcMode('direct')}
                className={`py-1.5 text-[11px] font-bold rounded-lg transition ${
                  calcMode === 'direct'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Lucro Direto
              </button>
            </div>

            {/* Sub-inputs based on mode */}
            {calcMode === 'cost' && (
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Custo das mercadorias ou gastos do dia:
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-sm font-semibold text-slate-400">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={costInput}
                    onChange={(e) => setCostInput(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 focus:border-emerald-500 py-2.5 pl-10 pr-3 text-base font-bold text-white font-mono focus:outline-none"
                  />
                </div>
              </div>
            )}

            {calcMode === 'margin' && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-slate-300">
                    Sua margem estimada de lucro:
                  </label>
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    {marginInput}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {[30, 40, 50, 60, 70].map((pct) => (
                    <button
                      type="button"
                      key={pct}
                      onClick={() => setMarginInput(String(pct))}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition ${
                        marginInput === String(pct)
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-slate-900 border-slate-750 text-slate-400 hover:text-white'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            {calcMode === 'direct' && (
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Quanto sobrou limpo de lucro hoje?
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-sm font-semibold text-slate-400">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={directProfitInput}
                    onChange={(e) => setDirectProfitInput(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 focus:border-emerald-500 py-2.5 pl-10 pr-3 text-base font-bold text-white font-mono focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Live Profit Preview Box */}
            <div className="mt-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 p-3 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-emerald-300">LUCRO DO DIA</span>
                <p className="text-lg font-black text-emerald-400 font-mono">
                  {formatCurrency(calculatedProfit)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-semibold text-slate-400">Margem Real</span>
                <p className="text-sm font-extrabold text-white font-mono">
                  {formatPercent(profitMargin)}
                </p>
              </div>
            </div>
          </div>

          {/* Volume de Vendas (Quantidade) */}
          <div className="rounded-2xl bg-slate-850 p-3.5 border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                  Volume de Vendas (Qtd. de Clientes / Pedidos)
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Quantas vendas foram feitas no dia
                </p>
              </div>

              {/* Stepper */}
              <div className="flex items-center gap-2 bg-slate-900 rounded-xl p-1 border border-slate-750">
                <button
                  type="button"
                  onClick={() => setSalesCount((prev) => Math.max(1, prev - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-700 active:scale-95 transition"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={salesCount}
                  onChange={(e) => setSalesCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-12 text-center text-sm font-extrabold text-white bg-transparent font-mono focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setSalesCount((prev) => prev + 1)}
                  className="w-8 h-8 rounded-lg bg-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-700 active:scale-95 transition"
                >
                  +
                </button>
              </div>
            </div>

            {totalSalesVal > 0 && (
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Ticket Médio por venda:</span>
                <span className="font-bold text-white font-mono">
                  {formatCurrency(averageTicket)}
                </span>
              </div>
            )}
          </div>

          {/* Optional Details (Payment Methods & Notes) Toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="flex w-full items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200 py-1 transition"
            >
              <span>Detalhes Opcionais (Pix, Cartão, Dinheiro, Obs)</span>
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showDetails && (
              <div className="mt-2 space-y-2.5 rounded-2xl bg-slate-850 p-3.5 border border-slate-800 animate-in fade-in">
                <p className="text-[11px] text-slate-400">
                  Distribua quanto entrou por cada forma de pagamento (opcional):
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-300 font-medium">Pix</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={pixInput}
                      onChange={(e) => setPixInput(e.target.value)}
                      className="w-full mt-1 rounded-xl bg-slate-900 border border-slate-700 py-1.5 px-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-300 font-medium">Cartão</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={creditInput}
                      onChange={(e) => setCreditInput(e.target.value)}
                      className="w-full mt-1 rounded-xl bg-slate-900 border border-slate-700 py-1.5 px-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-300 font-medium">Dinheiro</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={cashInput}
                      onChange={(e) => setCashInput(e.target.value)}
                      className="w-full mt-1 rounded-xl bg-slate-900 border border-slate-700 py-1.5 px-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 font-medium">
                    Observação rápida (ex: Promoção, Chuva, Evento)
                  </label>
                  <input
                    type="text"
                    placeholder="Alguma nota sobre o dia..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full mt-1 rounded-xl bg-slate-900 border border-slate-700 py-1.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={totalSalesVal <= 0}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 py-3.5 px-4 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-500/25 hover:from-emerald-500 hover:to-teal-400 active:scale-[0.98] transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
              {initialSale ? 'Salvar Alterações' : 'Confirmar Lançamento do Dia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

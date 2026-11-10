import React, { useState, useEffect, useMemo } from 'react';
import { DailySale, AppSettings } from '../types/sales';
import {
  formatCurrency,
  getTodayDateString,
  getCurrentBrazilianTimeString,
  parseBRInputToNumber,
} from '../utils/formatters';
import {
  X,
  Check,
  DollarSign,
  Calendar,
  Sparkles,
  QrCode,
  Banknote,
  CreditCard,
  Calculator,
  Clock,
  Receipt,
  ArrowUpCircle,
  ArrowDownCircle,
  Tag,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CalculatorModal } from './CalculatorModal';

type PaymentMethodType = 'pix' | 'cash' | 'card';

const COMMON_COST_CATEGORIES = [
  'Mercadoria / Estoque',
  'Embalagens & Sacolas',
  'Aluguel / Ponto',
  'Frete / Correios',
  'Contas (Luz / Internet)',
  'Outros Gastos',
];

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
    entries?: DailySale['entries'];
    notes?: string;
  }) => void;
  onSaveCost?: (costInput: {
    date: string;
    amount: number;
    description: string;
    category?: string;
  }) => Promise<void> | void;
  initialSale?: DailySale | null;
  initialType?: 'sale' | 'cost';
  settings: AppSettings;
  existingSales: DailySale[];
}

export const SaleFormModal: React.FC<SaleFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveCost,
  initialSale,
  initialType = 'sale',
  settings,
  existingSales,
}) => {
  const todayStr = getTodayDateString();

  // Mode: sale (entrada) vs cost (saída)
  const [entryType, setEntryType] = useState<'sale' | 'cost'>(initialType);
  const [costCategory, setCostCategory] = useState<string>('Mercadoria / Estoque');
  const [costDescription, setCostDescription] = useState<string>('');

  // Date state
  const [date, setDate] = useState<string>(todayStr);
  const [time, setTime] = useState<string>(() => getCurrentBrazilianTimeString());

  // Value input
  const [amountInput, setAmountInput] = useState<string>('');
  const [isCalcOpen, setIsCalcOpen] = useState<boolean>(false);

  // Payment method: 'pix' | 'cash' | 'card'
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('pix');

  // Yesterday helper date string
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Sync state when opened
  useEffect(() => {
    if (initialSale) {
      setDate(initialSale.date);
      setAmountInput(initialSale.totalSales.toFixed(2).replace('.', ','));
      setTime(getCurrentBrazilianTimeString());
      // Detect dominant method if editing
      if (initialSale.paymentMethods?.cash && initialSale.paymentMethods.cash > (initialSale.paymentMethods.pix || 0)) {
        setPaymentMethod('cash');
      } else if (initialSale.paymentMethods?.credit || initialSale.paymentMethods?.debit) {
        setPaymentMethod('card');
      } else {
        setPaymentMethod('pix');
      }
    } else {
      setDate(todayStr);
      setTime(getCurrentBrazilianTimeString());
      setAmountInput('');
      setPaymentMethod('pix');
      setCostCategory('Mercadoria / Estoque');
      setCostDescription('');
      setEntryType(initialType || 'sale');
    }
  }, [initialSale, isOpen, todayStr, initialType]);

  if (!isOpen) return null;

  const currentAmount = parseBRInputToNumber(amountInput);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentAmount <= 0) return;

    // A. Handling COST (Saída)
    if (entryType === 'cost') {
      if (onSaveCost) {
        onSaveCost({
          date,
          amount: currentAmount,
          description: costDescription.trim() || costCategory,
          category: costCategory,
        });
      }
      onClose();
      return;
    }

    // B. Handling SALE (Entrada)
    // Check if there is already an existing record for this date
    const existing = existingSales.find((s) => s.date === date);

    let finalTotalSales = currentAmount;
    let finalSalesCount = 1;
    let finalPix = paymentMethod === 'pix' ? currentAmount : 0;
    let finalCard = paymentMethod === 'card' ? currentAmount : 0;
    let finalCash = paymentMethod === 'cash' ? currentAmount : 0;

    // If editing existing sale directly
    if (initialSale && initialSale.date === date) {
      finalTotalSales = currentAmount;
      finalSalesCount = initialSale.salesCount || 1;
      finalPix = paymentMethod === 'pix' ? currentAmount : 0;
      finalCard = paymentMethod === 'card' ? currentAmount : 0;
      finalCash = paymentMethod === 'cash' ? currentAmount : 0;
    } else if (existing && !initialSale) {
      // Accumulate new sale into this day's total!
      finalTotalSales = existing.totalSales + currentAmount;
      finalSalesCount = (existing.salesCount || 1) + 1;
      finalPix = (existing.paymentMethods?.pix || 0) + (paymentMethod === 'pix' ? currentAmount : 0);
      finalCard =
        (existing.paymentMethods?.credit || 0) +
        (existing.paymentMethods?.debit || 0) +
        (paymentMethod === 'card' ? currentAmount : 0);
      finalCash = (existing.paymentMethods?.cash || 0) + (paymentMethod === 'cash' ? currentAmount : 0);
    }

    const timeStr = time.trim() || getCurrentBrazilianTimeString();
    const newEntry = {
      id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      amount: currentAmount,
      paymentMethod,
      time: timeStr,
      createdAt: new Date().toISOString(),
    };

    let finalEntries = existing?.entries ? [newEntry, ...existing.entries] : [newEntry];
    if (initialSale && initialSale.date === date) {
      finalEntries = initialSale.entries && initialSale.entries.length > 0 ? initialSale.entries : [newEntry];
    }

    // In MY Brechó, costs are strictly manual expenses entered via "+ Custo". If no cost added, cost is 0 and profit is 100% clean!
    const manualCost = Array.isArray(existing?.costEntries) && existing.costEntries.length > 0
      ? existing.costEntries.reduce((acc, c) => acc + (Number(c.amount) || 0), 0)
      : 0;
    const calculatedProfit = finalTotalSales - manualCost;

    onSave({
      date,
      totalSales: finalTotalSales,
      cost: manualCost,
      profit: calculatedProfit,
      salesCount: finalSalesCount,
      paymentMethods: {
        pix: finalPix > 0 ? finalPix : undefined,
        credit: finalCard > 0 ? finalCard : undefined,
        cash: finalCash > 0 ? finalCash : undefined,
      },
      entries: finalEntries,
    });

    // Confetti celebration for sales
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                entryType === 'cost'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {entryType === 'cost' ? <Receipt className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {entryType === 'cost'
                  ? 'Lançar Custo / Despesa'
                  : initialSale
                  ? 'Editar Venda'
                  : 'Lançar Venda'}
              </h2>
              <p className="text-xs text-slate-400">
                {entryType === 'cost'
                  ? 'Registre saídas de mercadorias ou operacionais'
                  : 'Informe o valor e a forma de pagamento'}
              </p>
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

        {/* Toggle between Venda (Entrada) and Custo (Saída) */}
        {!initialSale && (
          <div className="px-5 pt-3">
            <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-black">
              <button
                type="button"
                onClick={() => setEntryType('sale')}
                className={`py-2.5 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
                  entryType === 'sale'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                <ArrowUpCircle className="w-4 h-4 stroke-[2.5]" />
                <span>Venda (Entrada)</span>
              </button>
              <button
                type="button"
                onClick={() => setEntryType('cost')}
                className={`py-2.5 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
                  entryType === 'cost'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                <ArrowDownCircle className="w-4 h-4 stroke-[2.5]" />
                <span>Custo (Saída)</span>
              </button>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* 1. Date selector (Hoje / Ontem / Outra) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Data
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDate(todayStr)}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition cursor-pointer ${
                  date === todayStr
                    ? entryType === 'cost'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setDate(yesterdayStr)}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition cursor-pointer ${
                  date === yesterdayStr
                    ? entryType === 'cost'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Ontem
              </button>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full py-2 px-2 text-xs font-semibold rounded-xl bg-slate-800/60 border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            {/* Time Indicator & Adjuster (Horário de Brasília) */}
            <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Horário (Brasília):
              </span>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                title="Horário do lançamento"
              />
            </div>
          </div>

          {/* 2. Valor Input */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-800/90 to-slate-850 p-4 border border-slate-750 shadow-inner">
            <div className="flex items-center justify-between mb-1">
              <label
                className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${
                  entryType === 'cost' ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                {entryType === 'cost' ? 'Valor do Custo / Despesa' : 'Valor da Venda'}
              </label>
              <button
                type="button"
                onClick={() => setIsCalcOpen(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 px-2.5 py-1 rounded-xl transition cursor-pointer shadow-sm active:scale-95"
              >
                <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                <span>Calculadora</span>
              </button>
            </div>
            <div className="relative mt-2 flex items-center">
              <span className="absolute left-3.5 text-xl font-bold text-slate-400">R$</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                autoFocus
                required
                className={`w-full rounded-xl bg-slate-950/90 border-2 py-3.5 pl-12 pr-4 text-3xl font-extrabold text-white placeholder-slate-600 focus:outline-none font-mono transition ${
                  entryType === 'cost'
                    ? 'border-amber-500/50 focus:border-amber-400'
                    : 'border-emerald-500/50 focus:border-emerald-400'
                }`}
              />
            </div>

            {/* Quick addition shortcut chips */}
            <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Atalhos:</span>
              {[20, 50, 100, 200, 500].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => {
                    const current = parseBRInputToNumber(amountInput);
                    setAmountInput((current + val).toFixed(2).replace('.', ','));
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 font-mono transition cursor-pointer"
                >
                  +{val}
                </button>
              ))}
            </div>
          </div>

          {/* 3A. If COST: Categories & Description */}
          {entryType === 'cost' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  Categoria do Custo
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {COMMON_COST_CATEGORIES.map((cat) => {
                    const isSelected = costCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCostCategory(cat)}
                        className={`py-2 px-2.5 rounded-xl text-[11px] font-bold text-left transition cursor-pointer flex items-center justify-between border ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                            : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        <span className="truncate">{cat}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Descrição (Opcional)
                </label>
                <input
                  type="text"
                  value={costDescription}
                  onChange={(e) => setCostDescription(e.target.value)}
                  placeholder="Ex: Compra de lote, sacolas, fita..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* 3B. If SALE: Payment Methods */}
          {entryType === 'sale' && (
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-2">
                Forma de Recebimento
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {/* PIX */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 transition cursor-pointer ${
                    paymentMethod === 'pix'
                      ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-lg shadow-emerald-950/40'
                      : 'bg-slate-850 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl mb-1.5 ${
                      paymentMethod === 'pix'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-emerald-400'
                    }`}
                  >
                    <QrCode className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <span className="text-xs font-extrabold">Pix</span>
                </button>

                {/* DINHEIRO */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 transition cursor-pointer ${
                    paymentMethod === 'cash'
                      ? 'bg-amber-500/20 border-amber-500 text-white shadow-lg shadow-amber-950/40'
                      : 'bg-slate-850 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl mb-1.5 ${
                      paymentMethod === 'cash'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-amber-400'
                    }`}
                  >
                    <Banknote className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <span className="text-xs font-extrabold">Dinheiro</span>
                </button>

                {/* CARTÃO */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 transition cursor-pointer ${
                    paymentMethod === 'card'
                      ? 'bg-blue-500/20 border-blue-500 text-white shadow-lg shadow-blue-950/40'
                      : 'bg-slate-850 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl mb-1.5 ${
                      paymentMethod === 'card'
                        ? 'bg-blue-500 text-slate-950'
                        : 'bg-slate-800 text-blue-400'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <span className="text-xs font-extrabold">Cartão</span>
                </button>
              </div>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={currentAmount <= 0}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 px-4 text-sm font-extrabold text-slate-950 shadow-lg active:scale-[0.98] transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
                entryType === 'cost'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 shadow-amber-500/20'
                  : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 hover:from-emerald-500 hover:to-teal-300 shadow-emerald-500/25'
              }`}
            >
              <Check className="w-5 h-5 stroke-[2.8]" />
              <span>{entryType === 'cost' ? 'Salvar Custo do Negócio' : 'Salvar Venda'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Embedded In-App Calculator */}
      <CalculatorModal
        isOpen={isCalcOpen}
        onClose={() => setIsCalcOpen(false)}
        onApplyValue={(calculatedVal) => {
          setAmountInput(calculatedVal.toFixed(2).replace('.', ','));
        }}
      />
    </div>
  );
};

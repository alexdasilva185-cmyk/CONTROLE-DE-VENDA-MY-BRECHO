import React, { useState } from 'react';
import { X, DollarSign, Tag, Calendar, Check, Receipt, ShoppingCart } from 'lucide-react';
import { formatCurrency, getTodayDateString } from '../utils/formatters';

interface AddCostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCost: (costInput: {
    date: string;
    amount: number;
    description: string;
    category?: string;
  }) => Promise<void> | void;
  defaultDate?: string;
}

const COMMON_CATEGORIES = [
  { label: 'Mercadoria / Estoque', icon: ShoppingCart },
  { label: 'Embalagens & Sacolas', icon: Tag },
  { label: 'Aluguel / Ponto', icon: Receipt },
  { label: 'Frete / Correios', icon: Tag },
  { label: 'Contas (Luz / Internet)', icon: Receipt },
  { label: 'Outros Gastos', icon: Tag },
];

export const AddCostModal: React.FC<AddCostModalProps> = ({
  isOpen,
  onClose,
  onSaveCost,
  defaultDate,
}) => {
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Mercadoria / Estoque');
  const [date, setDate] = useState(defaultDate || getTodayDateString());
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = parseFloat(amountStr.replace(/\./g, '').replace(',', '.')) || 0;
    if (cleanAmount <= 0) {
      alert('Por favor, informe um valor de custo válido maior que zero.');
      return;
    }

    setIsSaving(true);
    try {
      await onSaveCost({
        date: date || getTodayDateString(),
        amount: cleanAmount,
        description: description.trim() || category,
        category,
      });
      // Reset form
      setAmountStr('');
      setDescription('');
      onClose();
    } catch (err) {
      console.error('Erro ao salvar custo:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Adicionar Custo do Mês</h3>
              <p className="text-[11px] text-slate-400">Lance despesas de mercadoria ou operação</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Valor do Custo */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              Valor do Custo / Despesa (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-base font-bold text-slate-400 font-mono">
                R$
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0,00"
                autoFocus
                required
                className="w-full rounded-2xl bg-slate-950 border border-slate-700 py-3 pl-12 pr-4 text-xl font-black text-amber-400 font-mono focus:outline-none focus:border-amber-500 shadow-inner"
              />
            </div>
          </div>

          {/* Quick Category Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-400" />
              Categoria do Custo
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {COMMON_CATEGORIES.map((cat) => {
                const isSelected = category === cat.label;
                return (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => setCategory(cat.label)}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-bold text-left transition cursor-pointer flex items-center justify-between border ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                        : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span className="truncate">{cat.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Descrição opcional */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Descrição / Observação (Opcional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Compra de lote no atacado, Sacolas plásticas..."
              className="w-full rounded-xl bg-slate-950 border border-slate-700 py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Data do Custo */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Data do Custo
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full rounded-xl bg-slate-950 border border-slate-700 py-2.5 px-3.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-xs font-bold text-slate-300 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 active:scale-95 transition cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{isSaving ? 'Salvando...' : 'Salvar Custo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

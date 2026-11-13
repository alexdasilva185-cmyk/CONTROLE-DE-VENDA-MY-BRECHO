import React, { useState } from 'react';
import { X, DollarSign, Check, MessageSquare, ArrowDownRight, Sparkles } from 'lucide-react';
import { CustomerCredit } from '../types/credits';
import { formatCurrency } from '../utils/formatters';
import {
  openWhatsApp,
  generateCreditDeductionWhatsAppText,
  generateCreditCompletedWhatsAppText,
} from '../utils/creditFormatters';

interface DeductCreditModalProps {
  credit: CustomerCredit | null;
  isOpen: boolean;
  onClose: () => void;
  onDeductCredit: (creditId: string, amountUsed: number, notes?: string) => Promise<CustomerCredit | null | undefined>;
  businessName: string;
}

export const DeductCreditModal: React.FC<DeductCreditModalProps> = ({
  credit,
  isOpen,
  onClose,
  onDeductCredit,
  businessName,
}) => {
  const [deductStr, setDeductStr] = useState('');
  const [notes, setNotes] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !credit) return null;

  const currentBalance = credit.remainingAmount;
  const deductVal = parseFloat(deductStr.replace(/\./g, '').replace(',', '.')) || 0;
  const newBalance = Math.max(0, currentBalance - deductVal);
  const isCompletingAll = newBalance <= 0.01 && deductVal > 0;

  const handleUseAll = () => {
    setDeductStr(currentBalance.toFixed(2).replace('.', ','));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (deductVal <= 0) {
      setErrorMessage('Por favor, informe um valor válido maior que zero para abater.');
      return;
    }
    if (deductVal > currentBalance) {
      setErrorMessage(`O valor a abater (${formatCurrency(deductVal)}) não pode ser maior que o saldo atual (${formatCurrency(currentBalance)}).`);
      return;
    }

    setIsSaving(true);
    try {
      const updated = await onDeductCredit(credit.id, deductVal, notes.trim() || 'Compras no brechó');

      if (sendWhatsApp && updated && (credit.customerPhone || '').trim()) {
        if (updated.remainingAmount <= 0.01) {
          const text = generateCreditCompletedWhatsAppText(updated, businessName);
          openWhatsApp(credit.customerPhone, text);
        } else {
          const text = generateCreditDeductionWhatsAppText(updated, deductVal, businessName);
          openWhatsApp(credit.customerPhone, text);
        }
      }

      setDeductStr('');
      setNotes('');
      setErrorMessage(null);
      onClose();
    } catch (err) {
      console.error('Erro ao abater crédito:', err);
      setErrorMessage('Ocorreu um erro ao abater o crédito. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ArrowDownRight className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Utilizar / Abater Crédito</h3>
              <p className="text-[11px] text-slate-400">Cliente: <strong className="text-white">{credit.customerName}</strong></p>
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

        {/* Current Balance Display Card */}
        <div className="rounded-2xl bg-slate-950 p-3.5 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Saldo Atual Disponível
            </span>
            <p className="text-xl font-black text-emerald-400 font-mono mt-0.5">
              {formatCurrency(currentBalance)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleUseAll}
            className="text-[11px] font-bold text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-3 py-1.5 rounded-xl transition cursor-pointer active:scale-95"
          >
            Usar Saldo Total
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Valor a Abater */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              Valor a Abater Hoje (R$) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-base font-bold text-slate-400 font-mono">
                R$
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={deductStr}
                onChange={(e) => setDeductStr(e.target.value)}
                placeholder="0,00"
                required
                autoFocus
                className="w-full rounded-2xl bg-slate-950 border border-slate-700 py-2.5 pl-12 pr-4 text-xl font-black text-amber-400 font-mono focus:outline-none focus:border-amber-500 shadow-inner"
              />
            </div>
          </div>

          {/* New Resulting Balance Preview */}
          {deductVal > 0 && (
            <div
              className={`rounded-xl p-3 border text-xs font-medium flex items-center justify-between ${
                isCompletingAll
                  ? 'bg-blue-950/40 border-blue-500/40 text-blue-200'
                  : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>
                  {isCompletingAll
                    ? 'Todo o crédito será utilizado!'
                    : 'Novo saldo restante do cliente:'}
                </span>
              </div>
              <strong className="text-sm font-mono font-black text-white">
                {formatCurrency(newBalance)}
              </strong>
            </div>
          )}

          {/* Observação / O que o cliente comprou */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              O que o cliente levou / Observação
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: 2 blusinhas, 1 calça..."
              className="w-full rounded-xl bg-slate-950 border border-slate-700 py-2 px-3 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* WhatsApp send toggle checkbox */}
          <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={sendWhatsApp}
              onChange={(e) => setSendWhatsApp(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-500 accent-emerald-500 cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-bold text-emerald-300 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                {isCompletingAll
                  ? 'Enviar mensagem de Crédito 100% Utilizado no WhatsApp'
                  : 'Enviar comprovante do novo saldo no WhatsApp'}
              </span>
              <p className="text-[10px] text-slate-400">
                Abre o WhatsApp da cliente com a confirmação atualizada
              </p>
            </div>
          </label>

          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold text-center">
              {errorMessage}
            </div>
          )}

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
              <span>{isSaving ? 'Salvando...' : 'Confirmar Abatimento'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

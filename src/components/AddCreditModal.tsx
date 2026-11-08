import React, { useState } from 'react';
import { X, DollarSign, User, Phone, FileText, Check, MessageSquare, Gift } from 'lucide-react';
import { openWhatsApp, generateNewCreditWhatsAppText } from '../utils/creditFormatters';
import { CustomerCredit } from '../types/credits';

interface AddCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCredit: (input: {
    customerName: string;
    customerPhone: string;
    amount: number;
    description: string;
  }) => Promise<CustomerCredit | null | undefined>;
  businessName: string;
}

export const AddCreditModal: React.FC<AddCreditModalProps> = ({
  isOpen,
  onClose,
  onSaveCredit,
  businessName,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [sendWhatsAppAfter, setSendWhatsAppAfter] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handlePhoneChange = (val: string) => {
    // Keep numbers and format as (XX) XXXXX-XXXX
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) {
      setCustomerPhone(digits);
    } else if (digits.length <= 7) {
      setCustomerPhone(`(${digits.slice(0, 2)}) ${digits.slice(2)}`);
    } else {
      setCustomerPhone(`(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`);
    }
  };

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const cleanAmount = parseFloat(amountStr.replace(/\./g, '').replace(',', '.')) || 0;
    if (cleanAmount <= 0) {
      setErrorMessage('Por favor, informe um valor de crédito válido maior que zero.');
      return;
    }
    if (!customerName.trim()) {
      setErrorMessage('Por favor, informe o nome do cliente.');
      return;
    }

    setIsSaving(true);
    try {
      const created = await onSaveCredit({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        amount: cleanAmount,
        description: description.trim() || 'Troca de peças no brechó',
      });

      if (sendWhatsAppAfter && created && customerPhone.trim()) {
        const text = generateNewCreditWhatsAppText(created, businessName);
        openWhatsApp(created.customerPhone, text);
      }

      // Reset
      setCustomerName('');
      setCustomerPhone('');
      setAmountStr('');
      setDescription('');
      onClose();
    } catch (err) {
      console.error('Erro ao salvar crédito:', err);
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Gift className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Novo Vale-Crédito / Troca</h3>
              <p className="text-[11px] text-slate-400">Registre o crédito do cliente para compras futuras</p>
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

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Nome do Cliente */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              Nome do Cliente *
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ex: Maria Clara, Ana Souza..."
              required
              autoFocus
              className="w-full rounded-xl bg-slate-950 border border-slate-700 py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              WhatsApp do Cliente
            </label>
            <input
              type="tel"
              inputMode="tel"
              value={customerPhone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="(00) 00000-0000"
              className="w-full rounded-xl bg-slate-950 border border-slate-700 py-2.5 px-3.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">
              Usado para enviar o comprovante do crédito diretamente no WhatsApp
            </p>
          </div>

          {/* Valor do Crédito */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Valor do Crédito (R$) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-base font-bold text-slate-400 font-mono">
                R$
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0,00"
                required
                className="w-full rounded-2xl bg-slate-950 border border-slate-700 py-2.5 pl-12 pr-4 text-xl font-black text-emerald-400 font-mono focus:outline-none focus:border-emerald-500 shadow-inner"
              />
            </div>
          </div>

          {/* Motivo / Peças */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Motivo / Peças Deixadas (Opcional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Troca de vestido jeans, Devolução de jaqueta..."
              className="w-full rounded-xl bg-slate-950 border border-slate-700 py-2 px-3 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* WhatsApp send toggle checkbox */}
          <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950/70 border border-emerald-500/20 cursor-pointer">
            <input
              type="checkbox"
              checked={sendWhatsAppAfter}
              onChange={(e) => setSendWhatsAppAfter(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-500 accent-emerald-500 cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-bold text-emerald-300 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                Enviar comprovante no WhatsApp ao salvar
              </span>
              <p className="text-[10px] text-slate-400">
                Abre o WhatsApp com a mensagem pronta de vale-crédito
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
              className="flex-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/25 active:scale-95 transition cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{isSaving ? 'Salvando...' : 'Salvar Vale-Crédito'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

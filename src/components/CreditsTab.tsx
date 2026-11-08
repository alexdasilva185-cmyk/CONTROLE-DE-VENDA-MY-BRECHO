import React, { useState, useMemo } from 'react';
import { CustomerCredit } from '../types/credits';
import { formatCurrency, formatDateBR } from '../utils/formatters';
import {
  formatPhoneVisual,
  openWhatsApp,
  generateNewCreditWhatsAppText,
  generateCreditCompletedWhatsAppText,
} from '../utils/creditFormatters';
import {
  Gift,
  PlusCircle,
  Search,
  MessageCircle,
  Trash2,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  History,
  Phone,
  User,
  ArrowDownRight,
  Filter,
} from 'lucide-react';
import { AddCreditModal } from './AddCreditModal';
import { DeductCreditModal } from './DeductCreditModal';

interface CreditsTabProps {
  credits: CustomerCredit[];
  onAddCredit: (input: {
    customerName: string;
    customerPhone: string;
    amount: number;
    description: string;
  }) => Promise<CustomerCredit | null | undefined>;
  onDeductCredit: (
    creditId: string,
    amountUsed: number,
    notes?: string
  ) => Promise<CustomerCredit | null | undefined>;
  onDeleteCredit: (creditId: string) => Promise<void> | void;
  businessName: string;
}

export const CreditsTab: React.FC<CreditsTabProps> = ({
  credits,
  onAddCredit,
  onDeductCredit,
  onDeleteCredit,
  businessName,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'used' | 'all'>('active');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [creditToDeduct, setCreditToDeduct] = useState<CustomerCredit | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // Metrics
  const activeCredits = useMemo(
    () => credits.filter((c) => c.status === 'active' && c.remainingAmount > 0),
    [credits]
  );

  const totalActiveBalance = useMemo(
    () => activeCredits.reduce((acc, c) => acc + c.remainingAmount, 0),
    [activeCredits]
  );

  const finishedCredits = useMemo(
    () => credits.filter((c) => c.status === 'used' || c.remainingAmount <= 0.01),
    [credits]
  );

  // Filtered list
  const filteredList = useMemo(() => {
    return credits.filter((item) => {
      // Status filter
      if (statusFilter === 'active' && (item.status !== 'active' || item.remainingAmount <= 0.01)) {
        return false;
      }
      if (statusFilter === 'used' && item.status !== 'used' && item.remainingAmount > 0.01) {
        return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesName = item.customerName.toLowerCase().includes(query);
        const matchesPhone = item.customerPhone.replace(/\D/g, '').includes(query.replace(/\D/g, ''));
        const matchesDesc = (item.description || '').toLowerCase().includes(query);
        return matchesName || matchesPhone || matchesDesc;
      }

      return true;
    });
  }, [credits, statusFilter, searchTerm]);

  const handleShareWhatsApp = (credit: CustomerCredit) => {
    if (credit.remainingAmount <= 0.01) {
      const text = generateCreditCompletedWhatsAppText(credit, businessName);
      openWhatsApp(credit.customerPhone, text);
    } else {
      const text = generateNewCreditWhatsAppText(credit, businessName);
      openWhatsApp(credit.customerPhone, text);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-emerald-400" />
            <span>Vale-Crédito & Trocas</span>
          </h2>
          <p className="text-xs text-slate-400">
            Controle de saldo das clientes e avisos no WhatsApp
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black text-xs px-3 py-2 shadow-md shadow-emerald-500/20 active:scale-95 transition cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          <span>+ Novo Crédito</span>
        </button>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 p-4 shadow-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
            Total em Créditos Ativos
          </span>
          <p className="mt-1 text-2xl font-black text-white font-mono">
            {formatCurrency(totalActiveBalance)}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Saldo pendente para troca
          </span>
        </div>

        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 shadow-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Clientes com Crédito
          </span>
          <p className="mt-1 text-2xl font-black text-emerald-400 font-mono">
            {activeCredits.length} {activeCredits.length === 1 ? 'cliente' : 'clientes'}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {finishedCredits.length} créditos finalizados
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-2">
        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou WhatsApp..."
            className="w-full rounded-2xl bg-slate-900 border border-slate-800 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filter Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`py-1.5 rounded-xl transition cursor-pointer text-center ${
              statusFilter === 'active'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ativos ({activeCredits.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('used')}
            className={`py-1.5 rounded-xl transition cursor-pointer text-center ${
              statusFilter === 'used'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Finalizados ({finishedCredits.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`py-1.5 rounded-xl transition cursor-pointer text-center ${
              statusFilter === 'all'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todos ({credits.length})
          </button>
        </div>
      </div>

      {/* Credits List */}
      <div className="space-y-2.5">
        {filteredList.length === 0 ? (
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 text-center space-y-2 shadow-xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Gift className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-white">Nenhum vale-crédito encontrado</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {statusFilter === 'active'
                ? 'Nenhuma cliente possui crédito ativo no momento.'
                : 'Nenhum crédito cadastrado nesta lista.'}
            </p>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black hover:bg-emerald-400 transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Cadastrar Vale-Crédito</span>
            </button>
          </div>
        ) : (
          filteredList.map((credit) => {
            const isFinished = credit.remainingAmount <= 0.01 || credit.status === 'used';
            const isExpanded = expandedHistoryId === credit.id;
            const hasUsages = Array.isArray(credit.usages) && credit.usages.length > 0;

            return (
              <div
                key={credit.id}
                className={`rounded-2xl p-4 border transition shadow-lg ${
                  isFinished
                    ? 'bg-slate-900/70 border-slate-800'
                    : 'bg-slate-900 border-emerald-500/40 hover:border-emerald-500/60'
                }`}
              >
                {/* Top: Customer & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-white truncate">
                        {credit.customerName}
                      </h3>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                          isFinished
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-800/60'
                        }`}
                      >
                        {isFinished ? 'Zerado / Concluído' : 'Crédito Ativo'}
                      </span>
                    </div>

                    {credit.customerPhone && (
                      <p className="text-[11px] text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{formatPhoneVisual(credit.customerPhone)}</span>
                      </p>
                    )}
                  </div>

                  {/* Saldo Restante Big Display */}
                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Saldo Disponível
                    </span>
                    <p
                      className={`text-lg font-black font-mono leading-tight ${
                        isFinished ? 'text-slate-500 line-through' : 'text-emerald-400'
                      }`}
                    >
                      {formatCurrency(credit.remainingAmount)}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      de {formatCurrency(credit.initialAmount)}
                    </span>
                  </div>
                </div>

                {/* Description / Motivo */}
                {credit.description && (
                  <p className="text-xs text-slate-300 mt-2 bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80 leading-relaxed">
                    📝 <strong>Referente a:</strong> {credit.description}
                  </p>
                )}

                {/* Action Buttons Row */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    {/* Abater Crédito Button (only if active) */}
                    {!isFinished && (
                      <button
                        type="button"
                        onClick={() => setCreditToDeduct(credit)}
                        className="flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition cursor-pointer active:scale-95"
                        title="Abater valor quando o cliente usar o crédito"
                      >
                        <ArrowDownRight className="w-3.5 h-3.5 text-amber-400" />
                        <span>Abater Crédito</span>
                      </button>
                    )}

                    {/* WhatsApp Button */}
                    <button
                      type="button"
                      onClick={() => handleShareWhatsApp(credit)}
                      className="flex items-center gap-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition cursor-pointer active:scale-95"
                      title="Enviar comprovante pelo WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>WhatsApp</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* View History Toggle Button */}
                    {hasUsages && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedHistoryId(isExpanded ? null : credit.id)
                        }
                        className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white bg-slate-800 px-2 py-1.5 rounded-lg transition cursor-pointer"
                        title="Ver histórico de utilizações"
                      >
                        <History className="w-3 h-3 text-slate-400" />
                        <span>Histórico ({credit.usages.length})</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    )}

                    {/* Delete button (immediate tap without blocking confirm) */}
                    <button
                      type="button"
                      onClick={() => onDeleteCredit(credit.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition cursor-pointer active:scale-95"
                      title="Excluir este vale-crédito"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded Usage History List */}
                {isExpanded && hasUsages && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800 space-y-1.5 animate-in fade-in">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Utilizações Anteriores:
                    </span>
                    <div className="space-y-1">
                      {credit.usages.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-slate-950/80 border border-slate-800"
                        >
                          <div>
                            <span className="font-bold text-white">{u.notes || 'Compras no brechó'}</span>
                            <p className="text-[10px] text-slate-400">
                              {formatDateBR(u.date)} {u.time ? `às ${u.time}` : ''}
                            </p>
                          </div>
                          <span className="font-mono font-bold text-amber-400">
                            - {formatCurrency(u.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal to Add New Credit */}
      <AddCreditModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSaveCredit={onAddCredit}
        businessName={businessName}
      />

      {/* Modal to Deduct / Use Credit */}
      <DeductCreditModal
        credit={creditToDeduct}
        isOpen={Boolean(creditToDeduct)}
        onClose={() => setCreditToDeduct(null)}
        onDeductCredit={onDeductCredit}
        businessName={businessName}
      />
    </div>
  );
};

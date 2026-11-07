import React, { useState } from 'react';
import { X, Check, Delete, ArrowRight, PlusCircle, RotateCcw } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyValue?: (value: number) => void;
  onLaunchAsSale?: (value: number) => void;
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({
  isOpen,
  onClose,
  onApplyValue,
  onLaunchAsSale,
}) => {
  const [expression, setExpression] = useState<string>('');
  const [currentNumber, setCurrentNumber] = useState<string>('0');
  const [historyItems, setHistoryItems] = useState<string[]>([]);
  const [justEvaluated, setJustEvaluated] = useState<boolean>(false);

  if (!isOpen) return null;

  // Handle number input
  const handleDigit = (digit: string) => {
    if (justEvaluated) {
      setCurrentNumber(digit);
      setExpression('');
      setJustEvaluated(false);
      return;
    }

    if (currentNumber === '0' && digit !== ',') {
      setCurrentNumber(digit);
    } else {
      if (digit === ',' && currentNumber.includes(',')) return;
      setCurrentNumber((prev) => prev + digit);
    }
  };

  // Handle operation (+, -, *, /)
  const handleOperator = (op: string) => {
    const num = currentNumber;
    if (justEvaluated) {
      setExpression(`${num} ${op} `);
      setCurrentNumber('0');
      setJustEvaluated(false);
      return;
    }

    if (num !== '0' || expression === '') {
      setExpression((prev) => `${prev}${num} ${op} `);
      setCurrentNumber('0');
    }
  };

  // Safe evaluation
  const handleEquals = () => {
    if (!expression && currentNumber === '0') return;

    const fullExpr = `${expression}${currentNumber}`;
    // Replace comma with dot and operator symbols with JS operators
    const sanitized = fullExpr
      .replace(/,/g, '.')
      .replace(/×/g, '*')
      .replace(/÷/g, '/');

    try {
      // Evaluate only numbers and basic math operators
      if (!/^[0-9+\-*/. ()]+$/.test(sanitized)) {
        throw new Error('Invalid');
      }

      // eslint-disable-next-line no-new-func
      const result = Function(`'use strict'; return (${sanitized})`)();
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        const rounded = Math.round(result * 100) / 100;
        const formatted = rounded.toFixed(2).replace('.', ',');
        setHistoryItems((prev) => [`${fullExpr} = ${formatted}`, ...prev.slice(0, 4)]);
        setCurrentNumber(formatted);
        setExpression('');
        setJustEvaluated(true);
      }
    } catch {
      setCurrentNumber('Erro');
      setJustEvaluated(true);
    }
  };

  // Clear all
  const handleClear = () => {
    setExpression('');
    setCurrentNumber('0');
    setJustEvaluated(false);
  };

  // Backspace
  const handleBackspace = () => {
    if (justEvaluated) {
      handleClear();
      return;
    }
    if (currentNumber.length > 1) {
      setCurrentNumber((prev) => prev.slice(0, -1));
    } else {
      setCurrentNumber('0');
    }
  };

  // Percentage
  const handlePercent = () => {
    const val = parseFloat(currentNumber.replace(',', '.'));
    if (!isNaN(val)) {
      const res = (val / 100).toFixed(2).replace('.', ',');
      setCurrentNumber(res);
    }
  };

  // Get current numeric float value
  const numericResult = parseFloat(currentNumber.replace(',', '.')) || 0;

  const handleUseValue = () => {
    if (onApplyValue) {
      onApplyValue(numericResult);
      onClose();
    } else if (onLaunchAsSale) {
      onLaunchAsSale(numericResult);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-sm">
              ∑
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Calculadora de Vendas</h3>
              <p className="text-[10px] text-slate-400">Some produtos sem sair do app</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Display screen */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800/80 flex flex-col justify-end items-end min-h-[90px]">
          {/* Ongoing expression */}
          <div className="text-xs font-mono text-slate-400 h-5 overflow-hidden text-right w-full truncate">
            {expression || (historyItems.length > 0 ? historyItems[0] : '')}
          </div>
          {/* Main big display */}
          <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white mt-1 truncate max-w-full">
            <span className="text-base text-slate-500 mr-1 font-sans">R$</span>
            {currentNumber}
          </div>
        </div>

        {/* Keypad Grid */}
        <div className="p-4 grid grid-cols-4 gap-2">
          {/* Row 1 */}
          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-2xl bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 font-extrabold text-sm border border-rose-800/40 transition active:scale-95"
          >
            C
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-sm border border-slate-700/60 flex items-center justify-center transition active:scale-95"
          >
            <Delete className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handlePercent}
            className="h-12 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-sm border border-slate-700/60 transition active:scale-95"
          >
            %
          </button>
          <button
            type="button"
            onClick={() => handleOperator('÷')}
            className="h-12 rounded-2xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-black text-lg border border-emerald-500/40 transition active:scale-95"
          >
            ÷
          </button>

          {/* Row 2 */}
          {['7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDigit(d)}
              className="h-12 rounded-2xl bg-slate-800/90 hover:bg-slate-750 text-white font-bold text-lg font-mono border border-slate-700/50 transition active:scale-95"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleOperator('×')}
            className="h-12 rounded-2xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-black text-lg border border-emerald-500/40 transition active:scale-95"
          >
            ×
          </button>

          {/* Row 3 */}
          {['4', '5', '6'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDigit(d)}
              className="h-12 rounded-2xl bg-slate-800/90 hover:bg-slate-750 text-white font-bold text-lg font-mono border border-slate-700/50 transition active:scale-95"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleOperator('-')}
            className="h-12 rounded-2xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-black text-xl border border-emerald-500/40 transition active:scale-95"
          >
            -
          </button>

          {/* Row 4 */}
          {['1', '2', '3'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDigit(d)}
              className="h-12 rounded-2xl bg-slate-800/90 hover:bg-slate-750 text-white font-bold text-lg font-mono border border-slate-700/50 transition active:scale-95"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleOperator('+')}
            className="h-12 rounded-2xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-black text-xl border border-emerald-500/40 transition active:scale-95"
          >
            +
          </button>

          {/* Row 5 */}
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-12 col-span-2 rounded-2xl bg-slate-800/90 hover:bg-slate-750 text-white font-bold text-lg font-mono border border-slate-700/50 transition active:scale-95"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => handleDigit(',')}
            className="h-12 rounded-2xl bg-slate-800/90 hover:bg-slate-750 text-white font-black text-xl border border-slate-700/50 transition active:scale-95"
          >
            ,
          </button>
          <button
            type="button"
            onClick={handleEquals}
            className="h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xl shadow-md transition active:scale-95"
          >
            =
          </button>
        </div>

        {/* Action: Use calculated value */}
        <div className="p-4 pt-1 border-t border-slate-800">
          <button
            type="button"
            onClick={handleUseValue}
            disabled={numericResult <= 0}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 py-3 text-xs font-extrabold text-slate-950 shadow-lg shadow-emerald-500/25 hover:from-emerald-500 hover:to-teal-300 active:scale-[0.98] transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>
              {onApplyValue ? 'Inserir no Valor da Venda' : 'Lançar como Venda Agora'} (
              {formatCurrency(numericResult)})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

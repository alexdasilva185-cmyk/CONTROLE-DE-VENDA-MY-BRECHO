export interface CreditUsage {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  notes?: string;
  createdAt: string;
}

export interface CustomerCredit {
  id: string;
  customerName: string;
  customerPhone: string; // WhatsApp number
  initialAmount: number; // Valor original do crédito
  remainingAmount: number; // Saldo restante atual
  status: 'active' | 'used' | 'cancelled';
  description: string; // Motivo da troca / peças deixadas
  usages: CreditUsage[];
  createdAt: string;
  updatedAt: string;
}

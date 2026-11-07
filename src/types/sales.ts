export interface SaleEntry {
  id: string;
  amount: number;
  paymentMethod: 'pix' | 'cash' | 'card';
  time: string; // HH:mm
  createdAt: string;
}

export interface DailySale {
  id: string;
  date: string; // YYYY-MM-DD
  totalSales: number; // Faturamento total bruto do dia
  cost: number; // Custo das mercadorias ou gastos operacionais
  profit: number; // Lucro líquido do dia (totalSales - cost)
  profitMargin: number; // % de margem (profit / totalSales * 100)
  salesCount: number; // Volume de vendas (qtd de transações / clientes)
  averageTicket: number; // Ticket médio do dia (totalSales / salesCount)
  paymentMethods?: {
    pix?: number;
    credit?: number;
    debit?: number;
    cash?: number;
    other?: number;
  };
  entries?: SaleEntry[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonthSummary {
  year: number;
  month: number; // 1 to 12
  monthName: string;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  averageProfitMargin: number;
  totalSalesCount: number;
  daysWithSales: number;
  totalDaysInMonth: number;
  dailyAverageRevenue: number; // Média por dia trabalhado (com vendas)
  calendarDailyAverageRevenue: number; // Média por dia corrido do mês
  dailyAverageProfit: number;
  averageTicket: number;
  bestDay: {
    date: string;
    revenue: number;
    profit: number;
    salesCount: number;
  } | null;
  projectedRevenue: number;
  projectedProfit: number;
}

export interface AppSettings {
  monthlyGoal: number; // Meta de faturamento para o mês
  defaultProfitMargin: number; // % padrão de lucro se preferir margem (ex: 45%)
  defaultCalculationMode: 'cost' | 'margin' | 'direct'; // Como prefere lançar o lucro
  businessName: string;
}

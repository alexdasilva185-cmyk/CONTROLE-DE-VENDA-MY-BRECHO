import { DailySale, AppSettings, MonthSummary } from '../types/sales';
import { formatCurrency, formatPercent, formatDateBR } from './formatters';

const STORAGE_KEY_SALES = 'minhas_vendas_records_v1';
const STORAGE_KEY_SETTINGS = 'minhas_vendas_settings_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  monthlyGoal: 15000,
  defaultProfitMargin: 45,
  defaultCalculationMode: 'cost',
  businessName: 'Meu Negócio',
};

// Generates friendly realistic sample data for the current month up to today
export function generateInitialSampleSales(): DailySale[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const currentDay = now.getDate();

  const samples: DailySale[] = [];

  // Seed previous days of current month (e.g. days 1 through current day)
  const daysToSeed = Math.max(1, currentDay);

  const sampleProfiles = [
    { sales: 780, cost: 390, count: 11, note: 'Vendas de balcão e WhatsApp' },
    { sales: 1150, cost: 520, count: 16, note: 'Dia bem movimentado' },
    { sales: 640, cost: 290, count: 8, note: 'Tarde mais calma' },
    { sales: 1420, cost: 630, count: 21, note: 'Pico de pedidos no almoço' },
    { sales: 980, cost: 440, count: 14, note: 'Clientes fiéis' },
    { sales: 1850, cost: 790, count: 28, note: 'Promoção de fim de semana' },
    { sales: 1290, cost: 580, count: 19, note: 'Muitos pagamentos no Pix' },
  ];

  for (let d = 1; d <= daysToSeed; d++) {
    const profile = sampleProfiles[(d - 1) % sampleProfiles.length];
    const dayStr = String(d).padStart(2, '0');
    const monthStr = String(month).padStart(2, '0');
    const date = `${year}-${monthStr}-${dayStr}`;

    const totalSales = profile.sales;
    const cost = profile.cost;
    const profit = totalSales - cost;
    const profitMargin = (profit / totalSales) * 100;
    const salesCount = profile.count;
    const averageTicket = totalSales / salesCount;

    // Distribute payment methods
    const pix = Math.round(totalSales * 0.55);
    const credit = Math.round(totalSales * 0.3);
    const cash = totalSales - pix - credit;

    const entries = [
      {
        id: `entry-${date}-1`,
        amount: Math.round(pix * 0.6),
        paymentMethod: 'pix' as const,
        time: '10:30',
        createdAt: new Date(year, month - 1, d, 10, 30).toISOString(),
      },
      {
        id: `entry-${date}-2`,
        amount: Math.round(credit),
        paymentMethod: 'card' as const,
        time: '14:15',
        createdAt: new Date(year, month - 1, d, 14, 15).toISOString(),
      },
      {
        id: `entry-${date}-3`,
        amount: Math.round(pix * 0.4) + cash,
        paymentMethod: cash > (pix * 0.4) ? ('cash' as const) : ('pix' as const),
        time: '18:45',
        createdAt: new Date(year, month - 1, d, 18, 45).toISOString(),
      },
    ];

    samples.push({
      id: `sale-${date}`,
      date,
      totalSales,
      cost,
      profit,
      profitMargin,
      salesCount,
      averageTicket,
      paymentMethods: {
        pix,
        credit,
        cash,
      },
      entries,
      notes: profile.note,
      createdAt: new Date(year, month - 1, d, 19, 0).toISOString(),
      updatedAt: new Date(year, month - 1, d, 19, 0).toISOString(),
    });
  }

  return samples;
}

export function loadSalesFromStorage(): DailySale[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SALES);
    if (!raw) {
      const initial = generateInitialSampleSales();
      saveSalesToStorage(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Erro ao carregar vendas do localStorage', err);
    return [];
  }
}

export function saveSalesToStorage(sales: DailySale[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(sales));
  } catch (err) {
    console.error('Erro ao salvar vendas no localStorage', err);
  }
}

export function loadSettingsFromStorage(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) {
      saveSettingsToStorage(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Erro ao carregar configurações', err);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettingsToStorage(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Erro ao salvar configurações', err);
  }
}

// Export CSV for Excel / Sheets
export function exportSalesToCSV(sales: DailySale[]): void {
  const headers = [
    'Data',
    'Total Vendido (R$)',
    'Custo (R$)',
    'Lucro do Dia (R$)',
    'Margem de Lucro (%)',
    'Qtd Vendas',
    'Ticket Medio (R$)',
    'Pix (R$)',
    'Cartao (R$)',
    'Dinheiro (R$)',
    'Observacoes',
  ];

  const rows = sales.map((s) => [
    formatDateBR(s.date),
    s.totalSales.toFixed(2).replace('.', ','),
    s.cost.toFixed(2).replace('.', ','),
    s.profit.toFixed(2).replace('.', ','),
    s.profitMargin.toFixed(1).replace('.', ','),
    s.salesCount,
    s.averageTicket.toFixed(2).replace('.', ','),
    (s.paymentMethods?.pix || 0).toFixed(2).replace('.', ','),
    ((s.paymentMethods?.credit || 0) + (s.paymentMethods?.debit || 0)).toFixed(2).replace('.', ','),
    (s.paymentMethods?.cash || 0).toFixed(2).replace('.', ','),
    `"${(s.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `relatorio_vendas_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Generate WhatsApp text report for the day
export function generateDailyWhatsAppText(sale: DailySale): string {
  const lines = [
    `📊 *FECHAMENTO DE VENDAS DO DIA*`,
    `📅 Data: ${formatDateBR(sale.date)}`,
    ``,
    `💰 *Total Vendido:* ${formatCurrency(sale.totalSales)}`,
    `📉 *Custo/Gastos:* ${formatCurrency(sale.cost)}`,
    `✨ *LUCRO LÍQUIDO:* ${formatCurrency(sale.profit)} (${formatPercent(sale.profitMargin)})`,
    `🛒 *Volume de Vendas:* ${sale.salesCount} vendas`,
    `🎯 *Ticket Médio:* ${formatCurrency(sale.averageTicket)} / venda`,
  ];

  if (sale.paymentMethods?.pix || sale.paymentMethods?.credit || sale.paymentMethods?.cash) {
    lines.push(``);
    lines.push(`💳 *Formas de Pagamento:*`);
    if (sale.paymentMethods.pix) lines.push(`• Pix: ${formatCurrency(sale.paymentMethods.pix)}`);
    if (sale.paymentMethods.credit || sale.paymentMethods.debit) {
      lines.push(`• Cartão: ${formatCurrency((sale.paymentMethods.credit || 0) + (sale.paymentMethods.debit || 0))}`);
    }
    if (sale.paymentMethods.cash) lines.push(`• Dinheiro: ${formatCurrency(sale.paymentMethods.cash)}`);
  }

  if (sale.notes) {
    lines.push(``);
    lines.push(`📝 Obs: ${sale.notes}`);
  }

  lines.push(``);
  lines.push(`_Gerado pelo App Controle de Vendas_`);

  return lines.join('\n');
}

// Generate WhatsApp text report for the month
export function generateMonthlyWhatsAppText(summary: MonthSummary, businessName: string): string {
  return [
    `📈 *RESUMO MENSAL DE VENDAS - ${summary.monthName.toUpperCase()} / ${summary.year}*`,
    `🏢 ${businessName}`,
    ``,
    `💵 *Faturamento Total:* ${formatCurrency(summary.totalRevenue)}`,
    `📉 *Custo Total:* ${formatCurrency(summary.totalCost)}`,
    `🟢 *LUCRO LÍQUIDO TOTAL:* ${formatCurrency(summary.totalProfit)} (${formatPercent(summary.averageProfitMargin)})`,
    ``,
    `⭐ *MÉDIAS DE FATURAMENTO:*`,
    `• Média por dia trabalhado: *${formatCurrency(summary.dailyAverageRevenue)}* / dia`,
    `• Média por dia corrido: *${formatCurrency(summary.calendarDailyAverageRevenue)}* / dia`,
    `• Média de Lucro diário: *${formatCurrency(summary.dailyAverageProfit)}* / dia`,
    `• Ticket Médio: *${formatCurrency(summary.averageTicket)}* por venda`,
    ``,
    `📦 *Volume Total:* ${summary.totalSalesCount} vendas em ${summary.daysWithSales} dias trabalhados`,
    summary.bestDay ? `🏆 *Melhor Dia:* ${formatDateBR(summary.bestDay.date)} (${formatCurrency(summary.bestDay.revenue)})` : '',
    ``,
    `_Gerado pelo App Controle de Vendas_`,
  ].filter(Boolean).join('\n');
}

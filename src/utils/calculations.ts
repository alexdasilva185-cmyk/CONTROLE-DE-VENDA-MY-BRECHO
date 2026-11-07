import { DailySale, MonthSummary } from '../types/sales';
import { MONTH_NAMES_PT } from './formatters';

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function calculateMonthSummary(
  sales: DailySale[],
  year: number,
  month: number
): MonthSummary {
  const totalDaysInMonth = getDaysInMonth(year, month);
  const targetPrefix = `${year}-${String(month).padStart(2, '0')}`;

  // Filter sales for this month
  const monthSales = sales.filter((s) => s.date.startsWith(targetPrefix));

  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;
  let totalSalesCount = 0;
  let bestDay: MonthSummary['bestDay'] = null;

  // Track unique days with sales
  const daysWithSalesSet = new Set<string>();

  for (const sale of monthSales) {
    totalRevenue += sale.totalSales;
    totalCost += sale.cost;
    totalProfit += sale.profit;
    totalSalesCount += sale.salesCount;
    daysWithSalesSet.add(sale.date);

    if (!bestDay || sale.totalSales > bestDay.revenue) {
      bestDay = {
        date: sale.date,
        revenue: sale.totalSales,
        profit: sale.profit,
        salesCount: sale.salesCount,
      };
    }
  }

  const daysWithSales = daysWithSalesSet.size;
  const averageProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const dailyAverageRevenue = daysWithSales > 0 ? totalRevenue / daysWithSales : 0;
  const calendarDailyAverageRevenue = totalDaysInMonth > 0 ? totalRevenue / totalDaysInMonth : 0;
  const dailyAverageProfit = daysWithSales > 0 ? totalProfit / daysWithSales : 0;
  const averageTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

  // Projection logic
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  let projectedRevenue = totalRevenue;
  let projectedProfit = totalProfit;

  if (isCurrentMonth) {
    const currentDay = now.getDate();
    const remainingDays = Math.max(0, totalDaysInMonth - currentDay);
    if (daysWithSales > 0 && currentDay > 0) {
      // Estimated based on current pace
      const estimatedPacePerDay = totalRevenue / Math.max(1, currentDay);
      projectedRevenue = totalRevenue + estimatedPacePerDay * remainingDays;
      const profitPacePerDay = totalProfit / Math.max(1, currentDay);
      projectedProfit = totalProfit + profitPacePerDay * remainingDays;
    }
  }

  return {
    year,
    month,
    monthName: MONTH_NAMES_PT[month - 1],
    totalRevenue,
    totalCost,
    totalProfit,
    averageProfitMargin,
    totalSalesCount,
    daysWithSales,
    totalDaysInMonth,
    dailyAverageRevenue,
    calendarDailyAverageRevenue,
    dailyAverageProfit,
    averageTicket,
    bestDay,
    projectedRevenue,
    projectedProfit,
  };
}

export function calculateGoalProgress(
  totalRevenue: number,
  monthlyGoal: number,
  year: number,
  month: number
) {
  const percent = monthlyGoal > 0 ? (totalRevenue / monthlyGoal) * 100 : 0;
  const remainingAmount = Math.max(0, monthlyGoal - totalRevenue);
  const isCompleted = totalRevenue >= monthlyGoal;

  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const totalDays = getDaysInMonth(year, month);
  const currentDay = now.getDate();
  const remainingDays = isCurrentMonth ? Math.max(1, totalDays - currentDay + 1) : 0;
  const neededPerRemainingDay = remainingDays > 0 ? remainingAmount / remainingDays : 0;

  return {
    percent: Math.min(100, percent),
    actualPercent: percent,
    remainingAmount,
    isCompleted,
    remainingDays,
    neededPerRemainingDay,
  };
}

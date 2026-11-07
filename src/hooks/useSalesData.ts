import { useState, useEffect, useMemo, useCallback } from 'react';
import { DailySale, AppSettings } from '../types/sales';
import {
  loadSalesFromStorage,
  saveSalesToStorage,
  loadSettingsFromStorage,
  saveSettingsToStorage,
  generateInitialSampleSales,
  DEFAULT_SETTINGS,
} from '../utils/storage';
import { calculateMonthSummary } from '../utils/calculations';
import { getTodayDateString } from '../utils/formatters';

export function useSalesData() {
  const [sales, setSales] = useState<DailySale[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initial load
  useEffect(() => {
    const loadedSales = loadSalesFromStorage();
    const loadedSettings = loadSettingsFromStorage();
    setSales(loadedSales);
    setSettings(loadedSettings);
    setIsLoaded(true);
  }, []);

  // Sync to storage on updates
  const updateSalesState = useCallback((newSales: DailySale[]) => {
    // Sort descending by date (newest first)
    const sorted = [...newSales].sort((a, b) => b.date.localeCompare(a.date));
    setSales(sorted);
    saveSalesToStorage(sorted);
  }, []);

  const addOrUpdateSale = useCallback(
    (saleInput: {
      date: string;
      totalSales: number;
      cost: number;
      profit?: number;
      salesCount: number;
      paymentMethods?: DailySale['paymentMethods'];
      notes?: string;
    }) => {
      const profit =
        saleInput.profit !== undefined
          ? saleInput.profit
          : saleInput.totalSales - saleInput.cost;
      const profitMargin =
        saleInput.totalSales > 0 ? (profit / saleInput.totalSales) * 100 : 0;
      const salesCount = Math.max(1, saleInput.salesCount || 1);
      const averageTicket = saleInput.totalSales / salesCount;

      const now = new Date().toISOString();

      setSales((prev) => {
        // Check if there is already a sale record for this exact date
        const existingIndex = prev.findIndex((s) => s.date === saleInput.date);

        let nextSales: DailySale[];
        if (existingIndex >= 0) {
          const existing = prev[existingIndex];
          const updated: DailySale = {
            ...existing,
            date: saleInput.date,
            totalSales: saleInput.totalSales,
            cost: saleInput.cost,
            profit,
            profitMargin,
            salesCount,
            averageTicket,
            paymentMethods: saleInput.paymentMethods,
            notes: saleInput.notes,
            updatedAt: now,
          };
          nextSales = [...prev];
          nextSales[existingIndex] = updated;
        } else {
          const newRecord: DailySale = {
            id: `sale-${saleInput.date}-${Date.now()}`,
            date: saleInput.date,
            totalSales: saleInput.totalSales,
            cost: saleInput.cost,
            profit,
            profitMargin,
            salesCount,
            averageTicket,
            paymentMethods: saleInput.paymentMethods,
            notes: saleInput.notes,
            createdAt: now,
            updatedAt: now,
          };
          nextSales = [newRecord, ...prev];
        }

        const sorted = nextSales.sort((a, b) => b.date.localeCompare(a.date));
        saveSalesToStorage(sorted);
        return sorted;
      });
    },
    []
  );

  const deleteSale = useCallback((id: string) => {
    setSales((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      saveSalesToStorage(filtered);
      return filtered;
    });
  }, []);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...partial };
      saveSettingsToStorage(updated);
      return updated;
    });
  }, []);

  const clearAllData = useCallback(() => {
    updateSalesState([]);
  }, [updateSalesState]);

  const resetToSampleData = useCallback(() => {
    const samples = generateInitialSampleSales();
    updateSalesState(samples);
  }, [updateSalesState]);

  const importData = useCallback(
    (importedSales: DailySale[]) => {
      updateSalesState(importedSales);
    },
    [updateSalesState]
  );

  // Month summary for selected month & year
  const monthSummary = useMemo(() => {
    return calculateMonthSummary(sales, selectedYear, selectedMonth);
  }, [sales, selectedYear, selectedMonth]);

  // Today's sale record
  const todayDateStr = getTodayDateString();
  const todaySale = useMemo(() => {
    return sales.find((s) => s.date === todayDateStr);
  }, [sales, todayDateStr]);

  // All sales for currently selected month
  const currentMonthSales = useMemo(() => {
    const targetPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    return sales.filter((s) => s.date.startsWith(targetPrefix));
  }, [sales, selectedYear, selectedMonth]);

  return {
    sales,
    currentMonthSales,
    settings,
    selectedYear,
    selectedMonth,
    setSelectedYear,
    setSelectedMonth,
    monthSummary,
    todaySale,
    isLoaded,
    addOrUpdateSale,
    deleteSale,
    updateSettings,
    clearAllData,
    resetToSampleData,
    importData,
  };
}

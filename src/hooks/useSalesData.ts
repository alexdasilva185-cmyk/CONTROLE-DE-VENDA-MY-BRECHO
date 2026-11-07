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
import {
  subscribeToUserSales,
  subscribeToUserSettings,
  saveSaleToCloud,
  deleteSaleFromCloud,
  saveSettingsToCloud,
  syncLocalSalesToCloud,
} from '../lib/firestoreService';
import { useAuth } from '../context/AuthContext';
import { calculateMonthSummary } from '../utils/calculations';
import { getTodayDateString } from '../utils/formatters';

export function useSalesData() {
  const { user } = useAuth();
  const [sales, setSales] = useState<DailySale[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cloudSynced, setCloudSynced] = useState(false);

  // Initial load from local storage
  useEffect(() => {
    const loadedSales = loadSalesFromStorage();
    const loadedSettings = loadSettingsFromStorage();
    setSales(loadedSales);
    setSettings(loadedSettings);
    setIsLoaded(true);
  }, []);

  // Sync with Firestore when user is authenticated
  useEffect(() => {
    if (!user) {
      setCloudSynced(false);
      return;
    }

    setIsSyncing(true);

    // Subscribe to cloud sales
    const unsubSales = subscribeToUserSales(
      user.uid,
      (cloudSales) => {
        if (cloudSales.length > 0) {
          setSales(cloudSales);
          saveSalesToStorage(cloudSales);
        } else {
          // If cloud is empty but local has data, upload local data to cloud
          const localData = loadSalesFromStorage();
          if (localData.length > 0) {
            syncLocalSalesToCloud(user.uid, localData).then(() => {
              setSales(localData);
            });
          }
        }
        setIsSyncing(false);
        setCloudSynced(true);
      },
      (err) => {
        console.warn('Erro ao carregar vendas da nuvem:', err);
        setIsSyncing(false);
      }
    );

    // Subscribe to cloud settings
    const unsubSettings = subscribeToUserSettings(
      user.uid,
      (cloudSettings) => {
        setSettings(cloudSettings);
        saveSettingsToStorage(cloudSettings);
      },
      (err) => {
        console.warn('Erro ao carregar configurações da nuvem:', err);
      }
    );

    return () => {
      unsubSales();
      unsubSettings();
    };
  }, [user]);

  // Sync to storage & cloud
  const addOrUpdateSale = useCallback(
    async (saleInput: {
      date: string;
      totalSales: number;
      cost: number;
      profit?: number;
      salesCount: number;
      paymentMethods?: DailySale['paymentMethods'];
      entries?: DailySale['entries'];
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

      let targetRecord: DailySale;

      setSales((prev) => {
        const existingIndex = prev.findIndex((s) => s.date === saleInput.date);
        let nextSales: DailySale[];

        if (existingIndex >= 0) {
          const existing = prev[existingIndex];
          targetRecord = {
            ...existing,
            id: existing.id || `sale-${saleInput.date}`,
            date: saleInput.date,
            totalSales: saleInput.totalSales,
            cost: saleInput.cost,
            profit,
            profitMargin,
            salesCount,
            averageTicket,
            paymentMethods: saleInput.paymentMethods,
            entries: saleInput.entries || existing.entries || [],
            notes: saleInput.notes || existing.notes || '',
            updatedAt: now,
          };
          nextSales = [...prev];
          nextSales[existingIndex] = targetRecord;
        } else {
          targetRecord = {
            id: `sale-${saleInput.date}-${Date.now()}`,
            date: saleInput.date,
            totalSales: saleInput.totalSales,
            cost: saleInput.cost,
            profit,
            profitMargin,
            salesCount,
            averageTicket,
            paymentMethods: saleInput.paymentMethods,
            entries: saleInput.entries || [],
            notes: saleInput.notes || '',
            createdAt: now,
            updatedAt: now,
          };
          nextSales = [targetRecord, ...prev];
        }

        const sorted = nextSales.sort((a, b) => b.date.localeCompare(a.date));
        saveSalesToStorage(sorted);
        return sorted;
      });

      // Save to cloud if user is logged in
      if (user) {
        try {
          await saveSaleToCloud(user.uid, targetRecord!);
        } catch (err) {
          console.error('Erro ao salvar no Firestore:', err);
        }
      }
    },
    [user]
  );

  const deleteSale = useCallback(
    async (id: string) => {
      setSales((prev) => {
        const filtered = prev.filter((s) => s.id !== id);
        saveSalesToStorage(filtered);
        return filtered;
      });

      if (user) {
        try {
          await deleteSaleFromCloud(user.uid, id);
        } catch (err) {
          console.error('Erro ao deletar no Firestore:', err);
        }
      }
    },
    [user]
  );

  const updateSettings = useCallback(
    async (partial: Partial<AppSettings>) => {
      const updated = { ...settings, ...partial };
      setSettings(updated);
      saveSettingsToStorage(updated);

      if (user) {
        try {
          await saveSettingsToCloud(user.uid, updated);
        } catch (err) {
          console.error('Erro ao salvar ajustes no Firestore:', err);
        }
      }
      return updated;
    },
    [settings, user]
  );

  const clearAllData = useCallback(() => {
    setSales([]);
    saveSalesToStorage([]);
  }, []);

  const resetToSampleData = useCallback(() => {
    const samples = generateInitialSampleSales();
    setSales(samples);
    saveSalesToStorage(samples);
  }, []);

  const importData = useCallback(
    async (importedSales: DailySale[]) => {
      const sorted = [...importedSales].sort((a, b) => b.date.localeCompare(a.date));
      setSales(sorted);
      saveSalesToStorage(sorted);

      if (user) {
        await syncLocalSalesToCloud(user.uid, sorted);
      }
    },
    [user]
  );

  const monthSummary = useMemo(() => {
    return calculateMonthSummary(sales, selectedYear, selectedMonth);
  }, [sales, selectedYear, selectedMonth]);

  const todayDateStr = getTodayDateString();
  const todaySale = useMemo(() => {
    return sales.find((s) => s.date === todayDateStr);
  }, [sales, todayDateStr]);

  const currentMonthSales = useMemo(() => {
    const targetPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    return sales.filter((s) => s.date.startsWith(targetPrefix));
  }, [sales, selectedYear, selectedMonth]);

  const deleteSaleEntry = useCallback(
    async (date: string, entryId: string) => {
      let updatedDayRecord: DailySale | null = null;
      setSales((prev) => {
        const dayIdx = prev.findIndex((s) => s.date === date);
        if (dayIdx < 0) return prev;

        const day = prev[dayIdx];
        const updatedEntries = (day.entries || []).filter((e) => e.id !== entryId);

        if (updatedEntries.length === 0) {
          // If no entries left, remove day or keep 0
          const filtered = prev.filter((s) => s.date !== date);
          saveSalesToStorage(filtered);
          return filtered;
        }

        // Recalculate totals
        const newTotal = updatedEntries.reduce((acc, e) => acc + e.amount, 0);
        const newPix = updatedEntries.filter((e) => e.paymentMethod === 'pix').reduce((acc, e) => acc + e.amount, 0);
        const newCard = updatedEntries.filter((e) => e.paymentMethod === 'card').reduce((acc, e) => acc + e.amount, 0);
        const newCash = updatedEntries.filter((e) => e.paymentMethod === 'cash').reduce((acc, e) => acc + e.amount, 0);
        const marginPct = day.profitMargin || 50;
        const newProfit = (newTotal * marginPct) / 100;
        const newCost = newTotal - newProfit;

        updatedDayRecord = {
          ...day,
          id: day.id || `sale-${date}`,
          totalSales: newTotal,
          cost: newCost,
          profit: newProfit,
          salesCount: updatedEntries.length,
          averageTicket: newTotal / updatedEntries.length,
          paymentMethods: {
            pix: newPix > 0 ? newPix : undefined,
            credit: newCard > 0 ? newCard : undefined,
            cash: newCash > 0 ? newCash : undefined,
          },
          entries: updatedEntries,
          notes: day.notes || '',
          updatedAt: new Date().toISOString(),
        };

        const next = [...prev];
        next[dayIdx] = updatedDayRecord;
        saveSalesToStorage(next);
        return next;
      });

      if (user && updatedDayRecord) {
        try {
          await saveSaleToCloud(user.uid, updatedDayRecord);
        } catch (err) {
          console.error('Erro ao atualizar no Firestore:', err);
        }
      }
    },
    [user]
  );

  const allRecentTransactions = useMemo(() => {
    const list: Array<{
      id: string;
      amount: number;
      paymentMethod: 'pix' | 'cash' | 'card';
      time: string;
      date: string;
      createdAt: string;
    }> = [];

    for (const day of sales) {
      if (day.entries && day.entries.length > 0) {
        for (const entry of day.entries) {
          list.push({ ...entry, date: day.date });
        }
      } else if (day.totalSales > 0) {
        list.push({
          id: `legacy-${day.id}`,
          amount: day.totalSales,
          paymentMethod: (day.paymentMethods?.pix || 0) >= (day.paymentMethods?.cash || 0) ? 'pix' : 'cash',
          time: '18:00',
          createdAt: day.createdAt,
          date: day.date,
        });
      }
    }

    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [sales]);

  return {
    sales,
    currentMonthSales,
    allRecentTransactions,
    settings,
    selectedYear,
    selectedMonth,
    setSelectedYear,
    setSelectedMonth,
    monthSummary,
    todaySale,
    isLoaded,
    isSyncing,
    cloudSynced,
    addOrUpdateSale,
    deleteSale,
    deleteSaleEntry,
    updateSettings,
    clearAllData,
    resetToSampleData,
    importData,
  };
}

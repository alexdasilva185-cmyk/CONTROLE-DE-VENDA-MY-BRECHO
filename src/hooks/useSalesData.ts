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
            notes: saleInput.notes,
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
    isSyncing,
    cloudSynced,
    addOrUpdateSale,
    deleteSale,
    updateSettings,
    clearAllData,
    resetToSampleData,
    importData,
  };
}

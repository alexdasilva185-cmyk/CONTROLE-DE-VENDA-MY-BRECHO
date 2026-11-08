import { useState, useEffect, useMemo, useCallback } from 'react';
import { DailySale, AppSettings, CostEntry } from '../types/sales';
import {
  loadSalesFromStorage,
  saveSalesToStorage,
  loadSettingsFromStorage,
  saveSettingsToStorage,
  generateInitialSampleSales,
  isMockSale,
  DEFAULT_SETTINGS,
} from '../utils/storage';
import {
  subscribeToUserSales,
  subscribeToUserSettings,
  saveSaleToCloud,
  deleteSaleFromCloud,
  saveSettingsToCloud,
  syncLocalSalesToCloud,
  clearAllUserSalesFromCloud,
  purgeMockSalesFromCloud,
} from '../lib/firestoreService';
import { useAuth } from '../context/AuthContext';
import { calculateMonthSummary } from '../utils/calculations';
import { getTodayDateString } from '../utils/formatters';

function applyMarginToSales(salesList: DailySale[], marginPct: number): DailySale[] {
  if (isNaN(marginPct) || marginPct <= 0 || marginPct > 100) return salesList;
  return salesList.map((s) => {
    // If the sale has manual cost entries (from + Custo), keep those explicit actual costs
    const hasManualCosts = Array.isArray(s.costEntries) && s.costEntries.length > 0;
    if (hasManualCosts) {
      const manualCost = s.costEntries!.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
      const profit = s.totalSales - manualCost;
      const profitMargin = s.totalSales > 0 ? (profit / s.totalSales) * 100 : 0;
      return {
        ...s,
        cost: manualCost,
        profit,
        profitMargin,
      };
    }

    // Recalculate profit and cost based on the configured profit margin percentage
    const profit = Math.round(((s.totalSales * marginPct) / 100 + Number.EPSILON) * 100) / 100;
    const cost = Math.round((s.totalSales - profit + Number.EPSILON) * 100) / 100;
    return {
      ...s,
      profit,
      cost,
      profitMargin: marginPct,
      updatedAt: new Date().toISOString(),
    };
  });
}

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
    const activeMargin = loadedSettings.defaultProfitMargin || 80;

    // Harmonize loaded sales with active profit margin
    const aligned = applyMarginToSales(loadedSales, activeMargin);
    setSales(aligned);
    saveSalesToStorage(aligned);

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

    // Automatically purge any old mock/sample sales from the database
    purgeMockSalesFromCloud(user.uid).catch((err) => {
      console.warn('Verificação de mock na nuvem:', err);
    });

    // Subscribe to cloud sales (with real-time updates and console compatibility)
    const unsubSales = subscribeToUserSales(
      user.uid,
      (cloudSales) => {
        // If cloud account is empty on first login, check if user had legitimate local sales to migrate
        if (cloudSales.length === 0) {
          const currentLocal = loadSalesFromStorage();
          const legitimateLocal = currentLocal.filter((s) => !isMockSale(s) && s.totalSales > 0);
          if (legitimateLocal.length > 0) {
            console.log('Migrando vendas locais do celular para a nuvem:', legitimateLocal.length);
            syncLocalSalesToCloud(user.uid, legitimateLocal).catch((e) =>
              console.warn('Erro ao migrar vendas locais:', e)
            );
            return;
          }
        }

        // Cloud is authoritative: sync cloud sales
        setSales(cloudSales);
        saveSalesToStorage(cloudSales);
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

        // When cloud settings arrive, harmonize existing sales with active profit margin
        if (cloudSettings.defaultProfitMargin) {
          setSales((prev) => {
            const aligned = applyMarginToSales(prev, cloudSettings.defaultProfitMargin);
            saveSalesToStorage(aligned);
            return aligned;
          });
        }
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

        const deterministicId = `sale-${saleInput.date}`;

        if (existingIndex >= 0) {
          const existing = prev[existingIndex];
          targetRecord = {
            ...existing,
            id: deterministicId,
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
            id: deterministicId,
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
      let saleToDelete: DailySale | undefined;
      setSales((prev) => {
        saleToDelete = prev.find((s) => s.id === id);
        const filtered = prev.filter((s) => s.id !== id);
        saveSalesToStorage(filtered);
        return filtered;
      });

      if (user) {
        try {
          await deleteSaleFromCloud(user.uid, id);
          if (saleToDelete?.date) {
            await deleteSaleFromCloud(user.uid, `sale-${saleToDelete.date}`);
            await deleteSaleFromCloud(user.uid, saleToDelete.date);
          }
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

      // If defaultProfitMargin is altered, automatically recalculate and update all sales!
      const newMargin = partial.defaultProfitMargin;
      if (newMargin !== undefined && !isNaN(newMargin) && newMargin > 0 && newMargin <= 100) {
        setSales((prev) => {
          const recalculated = applyMarginToSales(prev, newMargin);
          saveSalesToStorage(recalculated);

          // Update in Firestore for real-time cloud synchronization
          if (user) {
            syncLocalSalesToCloud(user.uid, recalculated).catch((err) =>
              console.warn('Erro ao atualizar vendas com a nova margem no Firestore:', err)
            );
          }

          return recalculated;
        });
      }

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

  const clearAllData = useCallback(async () => {
    setSales([]);
    saveSalesToStorage([]);
    if (user) {
      try {
        await clearAllUserSalesFromCloud(user.uid);
      } catch (err) {
        console.error('Erro ao limpar vendas na nuvem:', err);
      }
    }
  }, [user]);

  const purgeMockData = useCallback(async (): Promise<number> => {
    setSales((prev) => {
      const cleaned = prev.filter((s) => !isMockSale(s));
      saveSalesToStorage(cleaned);
      return cleaned;
    });
    if (user) {
      try {
        return await purgeMockSalesFromCloud(user.uid);
      } catch (err) {
        console.error('Erro ao purgar dados mock:', err);
      }
    }
    return 0;
  }, [user]);

  const resetToSampleData = useCallback(async () => {
    const samples = generateInitialSampleSales();
    setSales(samples);
    saveSalesToStorage(samples);
    if (user) {
      try {
        await syncLocalSalesToCloud(user.uid, samples);
      } catch (err) {
        console.error('Erro ao salvar dados de exemplo na nuvem:', err);
      }
    }
  }, [user]);

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

  const addCost = useCallback(
    async (costInput: {
      date: string;
      amount: number;
      description: string;
      category?: string;
    }) => {
      const now = new Date().toISOString();
      const amount = Math.max(0, costInput.amount);
      const newCostEntry: CostEntry = {
        id: `cost-${costInput.date}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        amount,
        description: costInput.description.trim() || 'Despesa / Custo',
        category: costInput.category || 'Outros',
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        createdAt: now,
      };

      let targetRecord: DailySale;

      setSales((prev) => {
        const existingIndex = prev.findIndex((s) => s.date === costInput.date);
        let nextSales: DailySale[];

        const deterministicId = `sale-${costInput.date}`;

        if (existingIndex >= 0) {
          const existing = prev[existingIndex];
          const newCost = (existing.cost || 0) + amount;
          const newProfit = (existing.totalSales || 0) - newCost;
          const newMargin = existing.totalSales > 0 ? (newProfit / existing.totalSales) * 100 : 0;
          const updatedCostEntries = [...(existing.costEntries || []), newCostEntry];

          targetRecord = {
            ...existing,
            id: deterministicId,
            cost: newCost,
            profit: newProfit,
            profitMargin: newMargin,
            costEntries: updatedCostEntries,
            updatedAt: now,
          };
          nextSales = [...prev];
          nextSales[existingIndex] = targetRecord;
        } else {
          // Create new day record with cost
          targetRecord = {
            id: deterministicId,
            date: costInput.date,
            totalSales: 0,
            cost: amount,
            profit: -amount,
            profitMargin: 0,
            salesCount: 0,
            averageTicket: 0,
            costEntries: [newCostEntry],
            notes: costInput.description,
            createdAt: now,
            updatedAt: now,
          };
          nextSales = [targetRecord, ...prev];
        }

        const sorted = nextSales.sort((a, b) => b.date.localeCompare(a.date));
        saveSalesToStorage(sorted);
        return sorted;
      });

      if (user) {
        try {
          await saveSaleToCloud(user.uid, targetRecord!);
        } catch (err) {
          console.error('Erro ao salvar custo no Firestore:', err);
        }
      }
    },
    [user]
  );

  const deleteCostEntry = useCallback(
    async (date: string, costId: string) => {
      let updatedDayRecord: DailySale | null = null;
      let dayToDeleteId: string | null = null;

      setSales((prev) => {
        const dayIdx = prev.findIndex((s) => s.date === date);
        if (dayIdx < 0) return prev;

        const day = prev[dayIdx];
        const costToRemove = (day.costEntries || []).find((c) => c.id === costId);
        const amountToRemove = costToRemove ? costToRemove.amount : 0;
        const updatedCostEntries = (day.costEntries || []).filter((c) => c.id !== costId);
        const newCost = Math.max(0, (day.cost || 0) - amountToRemove);
        const newProfit = (day.totalSales || 0) - newCost;
        const newMargin = day.totalSales > 0 ? (newProfit / day.totalSales) * 100 : 0;

        // If no sales AND no costs remain, remove day record
        if ((day.totalSales === 0 || !day.totalSales) && newCost === 0) {
          dayToDeleteId = day.id || `sale-${date}`;
          const filtered = prev.filter((s) => s.date !== date);
          saveSalesToStorage(filtered);
          return filtered;
        }

        updatedDayRecord = {
          ...day,
          cost: newCost,
          profit: newProfit,
          profitMargin: newMargin,
          costEntries: updatedCostEntries,
          updatedAt: new Date().toISOString(),
        };

        const next = [...prev];
        next[dayIdx] = updatedDayRecord;
        saveSalesToStorage(next);
        return next;
      });

      if (user) {
        try {
          if (dayToDeleteId) {
            await deleteSaleFromCloud(user.uid, dayToDeleteId);
            await deleteSaleFromCloud(user.uid, `sale-${date}`);
          } else if (updatedDayRecord) {
            await saveSaleToCloud(user.uid, updatedDayRecord);
          }
        } catch (err) {
          console.error('Erro ao sincronizar exclusão de custo no Firestore:', err);
        }
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
      let dayToDeleteId: string | null = null;

      setSales((prev) => {
        const dayIdx = prev.findIndex((s) => s.date === date);
        if (dayIdx < 0) return prev;

        const day = prev[dayIdx];
        let entries = [...(day.entries || [])];

        // 1. Match entry by exact id
        let entryIndex = entries.findIndex((e) => e.id === entryId);

        // 2. If not found by exact id (e.g. synthesized id), match by suffix or amount
        if (entryIndex < 0 && entryId.startsWith('entry-')) {
          entryIndex = entries.findIndex((e) => {
            if (entryId.endsWith('-pix') && e.paymentMethod === 'pix') return true;
            if (entryId.endsWith('-card') && e.paymentMethod === 'card') return true;
            if (entryId.endsWith('-cash') && e.paymentMethod === 'cash') return true;
            return false;
          });
        }

        if (entryIndex >= 0) {
          entries.splice(entryIndex, 1);
        } else if (entries.length > 0) {
          // If still not matched, remove the first entry
          entries.shift();
        }

        // If no entries remain, or if it was a legacy single record
        if (entries.length === 0 || entryId.startsWith('legacy-')) {
          dayToDeleteId = day.id || `sale-${date}`;
          const filtered = prev.filter((s) => s.date !== date);
          saveSalesToStorage(filtered);
          return filtered;
        }

        // Recalculate totals
        const newTotal = entries.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
        const newPix = entries.filter((e) => e.paymentMethod === 'pix').reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
        const newCard = entries.filter((e) => e.paymentMethod === 'card').reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
        const newCash = entries.filter((e) => e.paymentMethod === 'cash').reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
        const marginPct = day.profitMargin || 50;
        const newProfit = (newTotal * marginPct) / 100;
        const newCost = newTotal - newProfit;

        updatedDayRecord = {
          ...day,
          id: day.id || `sale-${date}`,
          totalSales: newTotal,
          cost: newCost,
          profit: newProfit,
          salesCount: entries.length,
          averageTicket: entries.length > 0 ? newTotal / entries.length : newTotal,
          paymentMethods: {
            pix: newPix > 0 ? newPix : undefined,
            credit: newCard > 0 ? newCard : undefined,
            cash: newCash > 0 ? newCash : undefined,
          },
          entries,
          notes: day.notes || '',
          updatedAt: new Date().toISOString(),
        };

        const next = [...prev];
        next[dayIdx] = updatedDayRecord;
        saveSalesToStorage(next);
        return next;
      });

      if (user) {
        try {
          if (dayToDeleteId) {
            await deleteSaleFromCloud(user.uid, dayToDeleteId);
            await deleteSaleFromCloud(user.uid, `sale-${date}`);
            await deleteSaleFromCloud(user.uid, date);
          } else if (updatedDayRecord) {
            await saveSaleToCloud(user.uid, updatedDayRecord);
          }
        } catch (err) {
          console.error('Erro ao sincronizar exclusão com o Firestore:', err);
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

  const currentMonthCosts = useMemo(() => {
    const targetPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    const list: Array<CostEntry & { date: string }> = [];
    for (const s of sales) {
      if (s.date.startsWith(targetPrefix)) {
        if (Array.isArray(s.costEntries) && s.costEntries.length > 0) {
          for (const c of s.costEntries) {
            list.push({ ...c, date: s.date });
          }
        } else if (s.cost > 0 && (!s.costEntries || s.costEntries.length === 0)) {
          list.push({
            id: `cost-auto-${s.id}`,
            amount: s.cost,
            description: s.notes || 'Custo do dia',
            category: 'Outros',
            time: '12:00',
            createdAt: s.createdAt,
            date: s.date,
          });
        }
      }
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [sales, selectedYear, selectedMonth]);

  return {
    sales,
    currentMonthSales,
    currentMonthCosts,
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
    addCost,
    deleteCostEntry,
    deleteSale,
    deleteSaleEntry,
    updateSettings,
    clearAllData,
    purgeMockData,
    resetToSampleData,
    importData,
  };
}

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { getTodayDateString, getCurrentBrazilianTimeString } from '../utils/formatters';

function applyMarginToSales(salesList: DailySale[], marginPct: number): DailySale[] {
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

    // In MY Brechó, if no costs were added by the user, cost is R$ 0,00 and profit is 100% clean
    return {
      ...s,
      cost: 0,
      profit: s.totalSales,
      profitMargin: 100,
      updatedAt: s.updatedAt || new Date().toISOString(),
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

  // Synchronous reference to current sales to eliminate async state closure bugs
  const salesRef = useRef<DailySale[]>(sales);
  useEffect(() => {
    salesRef.current = sales;
  }, [sales]);

  // Initial load from local storage
  useEffect(() => {
    const loadedSales = loadSalesFromStorage();
    const loadedSettings = loadSettingsFromStorage();
    const activeMargin = loadedSettings.defaultProfitMargin || 80;

    // Harmonize loaded sales with active profit margin
    const aligned = applyMarginToSales(loadedSales, activeMargin);
    setSales(aligned);
    salesRef.current = aligned;
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
        salesRef.current = cloudSales;
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
            salesRef.current = aligned;
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

  // Sync to storage & cloud directly and immediately
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
      // In MY Brechó, costs exist ONLY if manually entered via "+ Custo" (costEntries)
      const existing = salesRef.current.find((s) => s.date === saleInput.date);
      const manualCost = Array.isArray(existing?.costEntries) && existing.costEntries.length > 0
        ? existing.costEntries.reduce((acc, c) => acc + (Number(c.amount) || 0), 0)
        : (saleInput.cost && existing?.costEntries && existing.costEntries.length > 0 ? saleInput.cost : 0);

      const profit = Math.round((saleInput.totalSales - manualCost) * 100) / 100;
      const profitMargin = saleInput.totalSales > 0 ? (profit / saleInput.totalSales) * 100 : 100;
      const salesCount = Math.max(1, saleInput.salesCount || 1);
      const averageTicket = saleInput.totalSales / salesCount;

      const now = new Date().toISOString();
      const deterministicId = `sale-${saleInput.date}`;

      const targetRecord: DailySale = existing
        ? {
            ...existing,
            id: deterministicId,
            date: saleInput.date,
            totalSales: saleInput.totalSales,
            cost: manualCost,
            profit,
            profitMargin,
            salesCount,
            averageTicket,
            paymentMethods: saleInput.paymentMethods,
            entries: saleInput.entries || existing.entries || [],
            notes: saleInput.notes || existing.notes || '',
            updatedAt: now,
          }
        : {
            id: deterministicId,
            date: saleInput.date,
            totalSales: saleInput.totalSales,
            cost: manualCost,
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

      // Optimistic local state update
      setSales((prev) => {
        const existingIndex = prev.findIndex((s) => s.date === saleInput.date);
        let nextSales: DailySale[];
        if (existingIndex >= 0) {
          nextSales = [...prev];
          nextSales[existingIndex] = targetRecord;
        } else {
          nextSales = [targetRecord, ...prev];
        }
        const sorted = nextSales.sort((a, b) => b.date.localeCompare(a.date));
        salesRef.current = sorted;
        saveSalesToStorage(sorted);
        return sorted;
      });

      // Save to cloud immediately if user is authenticated
      if (user) {
        try {
          await saveSaleToCloud(user.uid, targetRecord);
          console.log('[Firestore] Venda gravada na nuvem com sucesso:', deterministicId);
        } catch (err) {
          console.error('[Firestore] Erro ao salvar no Firestore:', err);
        }
      }
    },
    [user]
  );

  const deleteSale = useCallback(
    async (id: string) => {
      const saleToDelete = salesRef.current.find((s) => s.id === id);
      const targetDate = saleToDelete?.date;

      setSales((prev) => {
        const filtered = prev.filter((s) => s.id !== id && (targetDate ? s.date !== targetDate : true));
        salesRef.current = filtered;
        saveSalesToStorage(filtered);
        return filtered;
      });

      if (user) {
        try {
          await deleteSaleFromCloud(user.uid, id);
          if (targetDate) {
            await deleteSaleFromCloud(user.uid, `sale-${targetDate}`);
            await deleteSaleFromCloud(user.uid, targetDate);
          }
          console.log('[Firestore] Venda excluída na nuvem:', id);
        } catch (err) {
          console.error('[Firestore] Erro ao deletar no Firestore:', err);
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
        time: getCurrentBrazilianTimeString(),
        createdAt: now,
      };

      const deterministicId = `sale-${costInput.date}`;
      const existing = salesRef.current.find((s) => s.date === costInput.date);

      let targetRecord: DailySale;
      if (existing) {
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
      } else {
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
      }

      setSales((prev) => {
        const existingIndex = prev.findIndex((s) => s.date === costInput.date);
        let nextSales: DailySale[];
        if (existingIndex >= 0) {
          nextSales = [...prev];
          nextSales[existingIndex] = targetRecord;
        } else {
          nextSales = [targetRecord, ...prev];
        }
        const sorted = nextSales.sort((a, b) => b.date.localeCompare(a.date));
        salesRef.current = sorted;
        saveSalesToStorage(sorted);
        return sorted;
      });

      if (user) {
        try {
          await saveSaleToCloud(user.uid, targetRecord);
          console.log('[Firestore] Custo gravado com sucesso no Firestore:', targetRecord.id);
        } catch (err) {
          console.error('[Firestore] Erro ao salvar custo no Firestore:', err);
        }
      }
    },
    [user]
  );

  const deleteCostEntry = useCallback(
    async (date: string, costId: string) => {
      const day = salesRef.current.find((s) => s.date === date);
      if (!day) return;

      const costToRemove = (day.costEntries || []).find((c) => c.id === costId);
      const amountToRemove = costToRemove ? costToRemove.amount : 0;
      const updatedCostEntries = (day.costEntries || []).filter((c) => c.id !== costId);
      const newCost = Math.max(0, (day.cost || 0) - amountToRemove);
      const newProfit = (day.totalSales || 0) - newCost;
      const newMargin = day.totalSales > 0 ? (newProfit / day.totalSales) * 100 : 0;

      const shouldDeleteDay = (day.totalSales === 0 || !day.totalSales) && newCost === 0;
      const dayId = day.id || `sale-${date}`;

      if (shouldDeleteDay) {
        setSales((prev) => {
          const filtered = prev.filter((s) => s.date !== date);
          salesRef.current = filtered;
          saveSalesToStorage(filtered);
          return filtered;
        });

        if (user) {
          try {
            await deleteSaleFromCloud(user.uid, dayId);
            await deleteSaleFromCloud(user.uid, `sale-${date}`);
            await deleteSaleFromCloud(user.uid, date);
            console.log('[Firestore] Registro de dia sem vendas/custos removido:', date);
          } catch (err) {
            console.error('[Firestore] Erro ao deletar no Firestore:', err);
          }
        }
      } else {
        const updatedDayRecord: DailySale = {
          ...day,
          id: dayId,
          cost: newCost,
          profit: newProfit,
          profitMargin: newMargin,
          costEntries: updatedCostEntries,
          updatedAt: new Date().toISOString(),
        };

        setSales((prev) => {
          const idx = prev.findIndex((s) => s.date === date);
          const next = idx >= 0 ? prev.map((s, i) => (i === idx ? updatedDayRecord : s)) : prev;
          salesRef.current = next;
          saveSalesToStorage(next);
          return next;
        });

        if (user) {
          try {
            await saveSaleToCloud(user.uid, updatedDayRecord);
            console.log('[Firestore] Custo excluído e dia atualizado no Firestore:', date);
          } catch (err) {
            console.error('[Firestore] Erro ao salvar atualização de custo no Firestore:', err);
          }
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
      const day = salesRef.current.find((s) => s.date === date);
      if (!day) return;

      const dayId = day.id || `sale-${date}`;
      let entries = [...(day.entries || [])];

      // 1. Match entry by exact id
      let entryIndex = entries.findIndex((e) => e.id === entryId);

      // 2. If not found by exact id (e.g. synthesized or legacy id), match by suffix
      if (entryIndex < 0 && (entryId.startsWith('entry-') || entryId.includes('-'))) {
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

      const shouldDeleteDay = entries.length === 0 || entryId.startsWith('legacy-');

      if (shouldDeleteDay) {
        setSales((prev) => {
          const filtered = prev.filter((s) => s.date !== date);
          salesRef.current = filtered;
          saveSalesToStorage(filtered);
          return filtered;
        });

        if (user) {
          try {
            await deleteSaleFromCloud(user.uid, dayId);
            await deleteSaleFromCloud(user.uid, `sale-${date}`);
            await deleteSaleFromCloud(user.uid, date);
            console.log('[Firestore] Venda inteira do dia removida com sucesso:', date);
          } catch (err) {
            console.error('[Firestore] Erro ao sincronizar exclusão com o Firestore:', err);
          }
        }
      } else {
        // Recalculate totals
        const newTotal = entries.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
        const newPix = entries.filter((e) => e.paymentMethod === 'pix').reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
        const newCard = entries.filter((e) => e.paymentMethod === 'card').reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
        const newCash = entries.filter((e) => e.paymentMethod === 'cash').reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
        const marginPct = day.profitMargin || 80;
        const newProfit = Math.round(((newTotal * marginPct) / 100) * 100) / 100;
        const newCost = Math.round((newTotal - newProfit) * 100) / 100;

        const updatedDayRecord: DailySale = {
          ...day,
          id: dayId,
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

        setSales((prev) => {
          const idx = prev.findIndex((s) => s.date === date);
          const next = idx >= 0 ? prev.map((s, i) => (i === idx ? updatedDayRecord : s)) : prev;
          salesRef.current = next;
          saveSalesToStorage(next);
          return next;
        });

        if (user) {
          try {
            await saveSaleToCloud(user.uid, updatedDayRecord);
            console.log('[Firestore] Lançamento individual excluído e dia recalculado na nuvem:', date, newTotal);
          } catch (err) {
            console.error('[Firestore] Erro ao sincronizar exclusão com o Firestore:', err);
          }
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

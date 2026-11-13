import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CustomerCredit } from '../types/credits';
import { useAuth } from '../context/AuthContext';
import {
  saveCreditToCloud,
  deleteCreditFromCloud,
  subscribeToUserCredits,
} from '../lib/firestoreCreditsService';
import { getCurrentBrazilianTimeString, getTodayDateString, toIsoStringSafe, toSafeString } from '../utils/formatters';

const STORAGE_KEY_CREDITS = 'minhas_vendas_credits_v1';

function sanitizeCreditRecord(raw: any): CustomerCredit | null {
  if (!raw || typeof raw !== 'object') return null;
  const createdAt = toIsoStringSafe(raw.createdAt);
  const updatedAt = toIsoStringSafe(raw.updatedAt, createdAt);
  const remainingAmount = Number(raw.remainingAmount) || 0;

  return {
    id: toSafeString(raw.id) || `credit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    customerName: toSafeString(raw.customerName, 'Cliente') || 'Cliente',
    customerPhone: toSafeString(raw.customerPhone),
    initialAmount: Number(raw.initialAmount) || 0,
    remainingAmount,
    status: raw.status === 'used' || raw.status === 'cancelled' || raw.status === 'active'
      ? raw.status
      : (remainingAmount <= 0 ? 'used' : 'active'),
    description: toSafeString(raw.description),
    usages: Array.isArray(raw.usages)
      ? raw.usages
          .filter((u: any) => u && typeof u === 'object')
          .map((u: any, idx: number) => ({
            id: toSafeString(u.id) || `usage-${idx}-${Date.now()}`,
            amount: Number(u.amount) || 0,
            date: toSafeString(u.date),
            time: toSafeString(u.time),
            notes: toSafeString(u.notes),
            createdAt: toIsoStringSafe(u.createdAt, createdAt),
          }))
      : [],
    createdAt,
    updatedAt,
  };
}

function loadCreditsFromStorage(): CustomerCredit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CREDITS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(sanitizeCreditRecord)
      .filter((c): c is CustomerCredit => c !== null);
  } catch (err) {
    console.error('Erro ao ler créditos do localStorage:', err);
    return [];
  }
}

function saveCreditsToStorage(credits: CustomerCredit[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CREDITS, JSON.stringify(credits));
  } catch (err) {
    console.error('Erro ao salvar créditos no localStorage:', err);
  }
}

export function useCreditsData() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<CustomerCredit[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const creditsRef = useRef<CustomerCredit[]>(credits);

  useEffect(() => {
    creditsRef.current = credits;
  }, [credits]);

  // Load from localStorage on mount
  useEffect(() => {
    const local = loadCreditsFromStorage();
    setCredits(local);
    creditsRef.current = local;
    setIsLoaded(true);
  }, []);

  // Sync with Firestore in real-time
  useEffect(() => {
    if (!user) return;

    const unsub = subscribeToUserCredits(
      user.uid,
      (cloudCredits) => {
        setCredits(cloudCredits);
        creditsRef.current = cloudCredits;
        saveCreditsToStorage(cloudCredits);
      },
      (err) => {
        console.warn('Erro ao sincronizar créditos com a nuvem:', err);
      }
    );

    return () => unsub();
  }, [user]);

  // Add new customer credit
  const addCredit = useCallback(
    async (input: {
      customerName: string;
      customerPhone: string;
      amount: number;
      description: string;
    }) => {
      const now = new Date().toISOString();
      const amount = Math.max(0, input.amount);

      const newCredit: CustomerCredit = {
        id: `credit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        customerName: input.customerName.trim(),
        customerPhone: input.customerPhone.trim(),
        initialAmount: amount,
        remainingAmount: amount,
        status: 'active',
        description: input.description.trim() || 'Troca de peças no brechó',
        usages: [],
        createdAt: now,
        updatedAt: now,
      };

      setCredits((prev) => {
        const next = [newCredit, ...prev];
        creditsRef.current = next;
        saveCreditsToStorage(next);
        return next;
      });

      if (user) {
        try {
          await saveCreditToCloud(user.uid, newCredit);
        } catch (err) {
          console.error('Erro ao salvar crédito no Firestore:', err);
        }
      }

      return newCredit;
    },
    [user]
  );

  // Deduct / use credit
  const deductCredit = useCallback(
    async (creditId: string, amountUsed: number, notes?: string) => {
      const currentList = creditsRef.current;
      const current = currentList.find((c) => c.id === creditId);
      if (!current) return null;

      const now = new Date();
      const sanitizedUsage = Math.min(current.remainingAmount, Math.max(0, amountUsed));
      const newRemaining = Math.max(0, current.remainingAmount - sanitizedUsage);
      const newStatus: CustomerCredit['status'] = newRemaining <= 0.01 ? 'used' : 'active';

      const newUsage = {
        id: `usage-${Date.now()}`,
        amount: sanitizedUsage,
        date: getTodayDateString(),
        time: getCurrentBrazilianTimeString(),
        notes: notes || 'Uso de crédito em compras',
        createdAt: now.toISOString(),
      };

      const updatedRecord: CustomerCredit = {
        ...current,
        remainingAmount: newRemaining,
        status: newStatus,
        usages: [...(current.usages || []), newUsage],
        updatedAt: now.toISOString(),
      };

      setCredits((prev) => {
        const next = prev.map((c) => (c.id === creditId ? updatedRecord : c));
        creditsRef.current = next;
        saveCreditsToStorage(next);
        return next;
      });

      if (user) {
        try {
          await saveCreditToCloud(user.uid, updatedRecord);
        } catch (err) {
          console.error('Erro ao atualizar crédito no Firestore:', err);
        }
      }

      return updatedRecord;
    },
    [user]
  );


  // Delete credit
  const deleteCredit = useCallback(
    async (creditId: string) => {
      setCredits((prev) => {
        const next = prev.filter((c) => c.id !== creditId);
        saveCreditsToStorage(next);
        return next;
      });

      if (user) {
        try {
          await deleteCreditFromCloud(user.uid, creditId);
        } catch (err) {
          console.error('Erro ao excluir crédito no Firestore:', err);
        }
      }
    },
    [user]
  );

  const activeCreditsCount = useMemo(() => {
    return credits.filter((c) => c.status === 'active' && c.remainingAmount > 0).length;
  }, [credits]);

  const totalActiveBalance = useMemo(() => {
    return credits
      .filter((c) => c.status === 'active' && c.remainingAmount > 0)
      .reduce((acc, c) => acc + c.remainingAmount, 0);
  }, [credits]);

  return {
    credits,
    isLoaded,
    addCredit,
    deductCredit,
    deleteCredit,
    activeCreditsCount,
    totalActiveBalance,
  };
}

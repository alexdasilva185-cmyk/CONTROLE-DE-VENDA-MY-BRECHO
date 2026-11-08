import { useState, useEffect, useCallback, useMemo } from 'react';
import { CustomerCredit } from '../types/credits';
import { useAuth } from '../context/AuthContext';
import {
  saveCreditToCloud,
  deleteCreditFromCloud,
  subscribeToUserCredits,
} from '../lib/firestoreCreditsService';

const STORAGE_KEY_CREDITS = 'minhas_vendas_credits_v1';

function loadCreditsFromStorage(): CustomerCredit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CREDITS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
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

  // Load from localStorage on mount
  useEffect(() => {
    const local = loadCreditsFromStorage();
    setCredits(local);
    setIsLoaded(true);
  }, []);

  // Sync with Firestore in real-time
  useEffect(() => {
    if (!user) return;

    const unsub = subscribeToUserCredits(
      user.uid,
      (cloudCredits) => {
        setCredits(cloudCredits);
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
      let updatedRecord: CustomerCredit | null = null;
      const now = new Date();

      setCredits((prev) => {
        const index = prev.findIndex((c) => c.id === creditId);
        if (index < 0) return prev;

        const current = prev[index];
        const sanitizedUsage = Math.min(current.remainingAmount, Math.max(0, amountUsed));
        const newRemaining = Math.max(0, current.remainingAmount - sanitizedUsage);
        const newStatus: CustomerCredit['status'] = newRemaining <= 0.01 ? 'used' : 'active';

        const newUsage = {
          id: `usage-${Date.now()}`,
          amount: sanitizedUsage,
          date: now.toISOString().split('T')[0],
          time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          notes: notes || 'Uso de crédito em compras',
          createdAt: now.toISOString(),
        };

        updatedRecord = {
          ...current,
          remainingAmount: newRemaining,
          status: newStatus,
          usages: [...(current.usages || []), newUsage],
          updatedAt: now.toISOString(),
        };

        const next = [...prev];
        next[index] = updatedRecord;
        saveCreditsToStorage(next);
        return next;
      });

      if (user && updatedRecord) {
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

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { DailySale, AppSettings } from '../types/sales';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Deeply removes any undefined values to ensure Firestore compatibility
export function cleanForFirestore(obj: unknown): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => cleanForFirestore(item));
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj as Record<string, any>)) {
    if (value !== undefined) {
      cleaned[key] = cleanForFirestore(value);
    }
  }
  return cleaned;
}

// Subscribe to real-time sales for a user
export function subscribeToUserSales(
  userId: string,
  onData: (sales: DailySale[]) => void,
  onError?: (err: Error) => void
): () => void {
  const salesColPath = `users/${userId}/sales`;
  const salesRef = collection(db, 'users', userId, 'sales');

  const unsubscribe = onSnapshot(
    salesRef,
    (snapshot) => {
      const sales: DailySale[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        sales.push({
          id: docSnap.id,
          date: data.date,
          totalSales: Number(data.totalSales) || 0,
          cost: Number(data.cost) || 0,
          profit: Number(data.profit) || 0,
          profitMargin: Number(data.profitMargin) || 0,
          salesCount: Number(data.salesCount) || 1,
          averageTicket: Number(data.averageTicket) || 0,
          paymentMethods: data.paymentMethods ? {
            pix: Number(data.paymentMethods.pix) || 0,
            credit: Number(data.paymentMethods.credit) || 0,
            debit: Number(data.paymentMethods.debit) || 0,
            cash: Number(data.paymentMethods.cash) || 0,
          } : undefined,
          entries: Array.isArray(data.entries) ? data.entries : [],
          notes: data.notes || '',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      });
      // Sort newest first
      sales.sort((a, b) => b.date.localeCompare(a.date));
      onData(sales);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, salesColPath);
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );

  return unsubscribe;
}

// Save or update a single daily sale
export async function saveSaleToCloud(userId: string, sale: DailySale): Promise<void> {
  const saleId = sale.id || `sale-${sale.date || getTodaySafeDate()}`;
  const path = `users/${userId}/sales/${saleId}`;
  try {
    const docRef = doc(db, 'users', userId, 'sales', saleId);

    // Explicitly construct safe object without any undefined values
    const safeData = cleanForFirestore({
      id: saleId,
      date: sale.date || getTodaySafeDate(),
      totalSales: Number(sale.totalSales) || 0,
      cost: Number(sale.cost) || 0,
      profit: Number(sale.profit) || 0,
      profitMargin: Number(sale.profitMargin) || 0,
      salesCount: Math.max(1, Number(sale.salesCount) || 1),
      averageTicket: Number(sale.averageTicket) || (Number(sale.totalSales) || 0),
      paymentMethods: {
        pix: Number(sale.paymentMethods?.pix) || 0,
        credit: Number(sale.paymentMethods?.credit) || 0,
        cash: Number(sale.paymentMethods?.cash) || 0,
      },
      entries: (sale.entries || []).map((e) => ({
        id: e.id || `entry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        amount: Number(e.amount) || 0,
        paymentMethod: e.paymentMethod || 'pix',
        time: e.time || '12:00',
        createdAt: e.createdAt || new Date().toISOString(),
      })),
      notes: typeof sale.notes === 'string' ? sale.notes : '',
      userId,
      createdAt: sale.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await setDoc(docRef, safeData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

function getTodaySafeDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Delete a daily sale
export async function deleteSaleFromCloud(userId: string, saleId: string): Promise<void> {
  const path = `users/${userId}/sales/${saleId}`;
  try {
    const docRef = doc(db, 'users', userId, 'sales', saleId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Save app settings
export async function saveSettingsToCloud(userId: string, settings: AppSettings): Promise<void> {
  const path = `users/${userId}/settings/config`;
  try {
    const docRef = doc(db, 'users', userId, 'settings', 'config');
    const safeData = cleanForFirestore({
      businessName: settings.businessName || 'Meu Negócio',
      monthlyGoal: Number(settings.monthlyGoal) || 15000,
      defaultProfitMargin: Number(settings.defaultProfitMargin) || 50,
      defaultCalculationMode: settings.defaultCalculationMode || 'cost',
      userId,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(docRef, safeData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Subscribe to user settings
export function subscribeToUserSettings(
  userId: string,
  onData: (settings: AppSettings) => void,
  onError?: (err: Error) => void
): () => void {
  const path = `users/${userId}/settings/config`;
  const docRef = doc(db, 'users', userId, 'settings', 'config');

  const unsubscribe = onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        onData({
          monthlyGoal: Number(data.monthlyGoal) || 15000,
          defaultProfitMargin: Number(data.defaultProfitMargin) || 50,
          defaultCalculationMode: data.defaultCalculationMode || 'cost',
          businessName: data.businessName || 'Meu Negócio',
        });
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );

  return unsubscribe;
}

// Batch sync local sales to cloud
export async function syncLocalSalesToCloud(userId: string, localSales: DailySale[]): Promise<number> {
  let count = 0;
  for (const sale of localSales) {
    await saveSaleToCloud(userId, sale);
    count++;
  }
  return count;
}

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
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
          paymentMethods: data.paymentMethods || undefined,
          notes: data.notes || undefined,
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
  const path = `users/${userId}/sales/${sale.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'sales', sale.id);
    await setDoc(docRef, {
      ...sale,
      userId,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
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
    await setDoc(docRef, {
      ...settings,
      userId,
      updatedAt: new Date().toISOString(),
    });
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

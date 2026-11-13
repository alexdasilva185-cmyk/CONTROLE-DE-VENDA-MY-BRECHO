import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { CustomerCredit } from '../types/credits';
import { cleanForFirestore, handleFirestoreError, OperationType } from './firestoreService';
import { toIsoStringSafe, toSafeString } from '../utils/formatters';

// Save or update customer credit
export async function saveCreditToCloud(userId: string, credit: CustomerCredit): Promise<void> {
  const creditId = credit.id || `credit-${Date.now()}`;
  const path = `users/${userId}/credits/${creditId}`;
  try {
    const docRef = doc(db, 'users', userId, 'credits', creditId);

    const safeData = cleanForFirestore({
      id: creditId,
      customerName: toSafeString(credit.customerName, 'Cliente').trim() || 'Cliente',
      customerPhone: toSafeString(credit.customerPhone).trim(),
      initialAmount: Number(credit.initialAmount) || 0,
      remainingAmount: Number(credit.remainingAmount) || 0,
      status: credit.status || 'active',
      description: toSafeString(credit.description),
      usages: (Array.isArray(credit.usages) ? credit.usages : []).map((u) => ({
        id: toSafeString(u.id) || `usage-${Date.now()}`,
        amount: Number(u.amount) || 0,
        date: toSafeString(u.date) || new Date().toISOString().split('T')[0],
        time: toSafeString(u.time) || '12:00',
        notes: toSafeString(u.notes),
        createdAt: toIsoStringSafe(u.createdAt),
      })),
      userId,
      createdAt: toIsoStringSafe(credit.createdAt),
      updatedAt: new Date().toISOString(),
    });

    await setDoc(docRef, safeData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete customer credit
export async function deleteCreditFromCloud(userId: string, creditId: string): Promise<void> {
  const path = `users/${userId}/credits/${creditId}`;
  try {
    const docRef = doc(db, 'users', userId, 'credits', creditId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Subscribe to real-time customer credits for a user
export function subscribeToUserCredits(
  userId: string,
  onData: (credits: CustomerCredit[]) => void,
  onError?: (err: Error) => void
): () => void {
  const creditsColPath = `users/${userId}/credits`;
  const creditsRef = collection(db, 'users', userId, 'credits');

  const unsubscribe = onSnapshot(
    creditsRef,
    (snapshot) => {
      const list: CustomerCredit[] = [];
      snapshot.forEach((docSnap) => {
        try {
          const d = docSnap.data();
          const createdAt = toIsoStringSafe(d.createdAt);
          const updatedAt = toIsoStringSafe(d.updatedAt, createdAt);
          const remainingAmount = Number(d.remainingAmount) || 0;
          list.push({
            id: docSnap.id,
            customerName: toSafeString(d.customerName, 'Cliente') || 'Cliente',
            customerPhone: toSafeString(d.customerPhone),
            initialAmount: Number(d.initialAmount) || 0,
            remainingAmount,
            status: d.status === 'used' || d.status === 'cancelled' || d.status === 'active'
              ? d.status
              : (remainingAmount <= 0 ? 'used' : 'active'),
            description: toSafeString(d.description),
            usages: Array.isArray(d.usages)
              ? d.usages
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
          });
        } catch (docErr) {
          console.warn('Crédito ignorado por erro de leitura:', docSnap.id, docErr);
        }
      });

      // Sort newest first safely
      list.sort((a, b) => toSafeString(b.createdAt).localeCompare(toSafeString(a.createdAt)));
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, creditsColPath);
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );

  return unsubscribe;
}

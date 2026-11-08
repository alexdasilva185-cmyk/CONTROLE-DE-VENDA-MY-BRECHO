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

// Save or update customer credit
export async function saveCreditToCloud(userId: string, credit: CustomerCredit): Promise<void> {
  const creditId = credit.id || `credit-${Date.now()}`;
  const path = `users/${userId}/credits/${creditId}`;
  try {
    const docRef = doc(db, 'users', userId, 'credits', creditId);

    const safeData = cleanForFirestore({
      id: creditId,
      customerName: credit.customerName.trim(),
      customerPhone: credit.customerPhone.trim(),
      initialAmount: Number(credit.initialAmount) || 0,
      remainingAmount: Number(credit.remainingAmount) || 0,
      status: credit.status || 'active',
      description: credit.description || '',
      usages: (credit.usages || []).map((u) => ({
        id: u.id || `usage-${Date.now()}`,
        amount: Number(u.amount) || 0,
        date: u.date || new Date().toISOString().split('T')[0],
        time: u.time || '12:00',
        notes: u.notes || '',
        createdAt: u.createdAt || new Date().toISOString(),
      })),
      userId,
      createdAt: credit.createdAt || new Date().toISOString(),
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
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          customerName: d.customerName || 'Cliente',
          customerPhone: d.customerPhone || '',
          initialAmount: Number(d.initialAmount) || 0,
          remainingAmount: Number(d.remainingAmount) || 0,
          status: d.status || (Number(d.remainingAmount) <= 0 ? 'used' : 'active'),
          description: d.description || '',
          usages: Array.isArray(d.usages)
            ? d.usages.map((u: any) => ({
                id: u.id,
                amount: Number(u.amount) || 0,
                date: u.date || '',
                time: u.time || '',
                notes: u.notes || '',
                createdAt: u.createdAt || '',
              }))
            : [],
          createdAt: d.createdAt || new Date().toISOString(),
          updatedAt: d.updatedAt || new Date().toISOString(),
        });
      });

      // Sort newest first
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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

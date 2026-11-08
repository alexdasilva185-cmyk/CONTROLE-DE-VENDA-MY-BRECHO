import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
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

// Check if a document is an old mock/sample record
export function isMockSaleDoc(data: any, docId?: string): boolean {
  if (!data) return false;
  if (data.isSample === true || data.isMock === true) return true;

  const mockNotes = [
    'vendas de balcão e whatsapp',
    'dia bem movimentado',
    'tarde mais calma',
    'pico de pedidos no almoço',
    'clientes fiéis',
    'promoção de fim de semana',
    'muitos pagamentos no pix',
  ];
  if (typeof data.notes === 'string' && mockNotes.includes(data.notes.toLowerCase().trim())) {
    return true;
  }

  if (Array.isArray(data.entries)) {
    for (const e of data.entries) {
      if (e?.id && (String(e.id).includes('entry-2026-') || String(e.id).includes('entry-sample-'))) {
        return true;
      }
    }
  }

  const samplePairs = [
    { s: 780, c: 390 },
    { s: 1150, c: 520 },
    { s: 640, c: 290 },
    { s: 1420, c: 630 },
    { s: 980, c: 440 },
    { s: 1850, c: 790 },
    { s: 1290, c: 580 },
  ];
  const s = Number(data.totalSales ?? data.total ?? data.valor ?? 0);
  const c = Number(data.cost ?? data.custo ?? 0);
  const dateStr = String(data.date || docId || '');
  if (samplePairs.some((p) => p.s === s && p.c === c) && dateStr.startsWith('2026-11-')) {
    return true;
  }

  // Purge test doc from 2026-11-07 only if it has sample notes or sample identifiers
  if ((dateStr === '2026-11-07' || docId?.includes('2026-11-07')) && (docId?.includes('sample') || typeof data.notes === 'string' && mockNotes.includes(data.notes.toLowerCase().trim()))) {
    return true;
  }

  // Purge test artifact with 72.90 at 22:00 (10 da noite)
  if (Math.abs(s - 72.9) < 0.05 && (dateStr === '2026-11-08' || docId?.includes('2026-11-08') || docId?.includes('test') || docId?.includes('sample') || data.createdAt?.includes('T22:'))) {
    return true;
  }
  if (Array.isArray(data.entries)) {
    for (const e of data.entries) {
      if (Math.abs(Number(e?.amount) - 72.9) < 0.05 && (e?.time === '22:00' || e?.time === '10:00' || e?.createdAt?.includes('T22:'))) {
        return true;
      }
    }
  }

  return false;
}

// Purge all old mock/sample sales from the cloud
export async function purgeMockSalesFromCloud(userId: string): Promise<number> {
  let deletedCount = 0;
  try {
    const salesRef = collection(db, 'users', userId, 'sales');
    const snapshot = await getDocs(salesRef);
    for (const docSnap of snapshot.docs) {
      if (isMockSaleDoc(docSnap.data(), docSnap.id)) {
        await deleteDoc(docSnap.ref);
        deletedCount++;
      }
    }
  } catch (err) {
    console.warn('Erro ao purgar dados mock da nuvem:', err);
  }
  return deletedCount;
}

function normalizeDate(rawDate?: unknown, docId?: string): string {
  if (typeof rawDate === 'string') {
    const trimmed = rawDate.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    // Check DD/MM/YYYY
    const brMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (brMatch) {
      const [, d, m, y] = brMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  if (docId && /^\d{4}-\d{2}-\d{2}$/.test(docId)) {
    return docId;
  }
  return getTodaySafeDate();
}

function formatIsoToBRTime(iso?: string): string {
  if (!iso) return '12:00';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return '12:00';
  }
}

// Parse any document format (including manual entries from Firebase Console) into DailySale
export function parseSaleDocument(docId: string, data: any): DailySale {
  const date = normalizeDate(data.date ?? data.data ?? data.dia, docId);
  const totalSales = Math.max(0, Number(data.totalSales ?? data.total ?? data.valor ?? data.faturamento ?? data.venda ?? 0));

  // In MY Brechó, costs exist ONLY if manually added by the user via "+ Custo" (costEntries)
  let cost = 0;
  if (Array.isArray(data.costEntries) && data.costEntries.length > 0) {
    cost = data.costEntries.reduce((acc: number, c: any) => acc + (Number(c.amount ?? c.valor ?? 0) || 0), 0);
  }

  // Profit is 100% clean if no cost was added
  const profit = totalSales - cost;
  const profitMargin = totalSales > 0 ? (profit / totalSales) * 100 : 100;

  // Normalized sales count
  const rawCount = Number(data.salesCount ?? data.quantidade ?? data.qtd ?? data.vendas);
  const salesCount = Math.max(
    1,
    !isNaN(rawCount) && rawCount > 0
      ? rawCount
      : Array.isArray(data.entries) && data.entries.length > 0
      ? data.entries.length
      : 1
  );

  const averageTicket =
    Number(data.averageTicket ?? data.ticketMedio ?? data.ticket_medio) ||
    (salesCount > 0 ? totalSales / salesCount : totalSales);

  // Parse payment methods supporting Portuguese and English keys
  const pix = Number(data.paymentMethods?.pix ?? data.pix ?? 0);
  const credit = Number(
    data.paymentMethods?.credit ??
      data.paymentMethods?.cartao ??
      data.cartao ??
      data.cartão ??
      data.credito ??
      data.debito ??
      0
  );
  const cash = Number(data.paymentMethods?.cash ?? data.paymentMethods?.dinheiro ?? data.dinheiro ?? 0);

  // Parse or synthesize entries
  let entries: DailySale['entries'] = [];
  if (Array.isArray(data.entries) && data.entries.length > 0) {
    entries = data.entries.map((e: any, idx: number) => ({
      id: e.id || `entry-${date}-${idx + 1}-${Date.now()}`,
      amount: Number(e.amount ?? e.valor ?? 0),
      paymentMethod:
        e.paymentMethod === 'pix' || e.metodo === 'pix' || e.forma === 'pix'
          ? 'pix'
          : e.paymentMethod === 'card' ||
            e.paymentMethod === 'cartao' ||
            e.paymentMethod === 'credit' ||
            e.forma === 'cartao'
          ? 'card'
          : 'cash',
      time: e.time || e.hora || formatIsoToBRTime(e.createdAt || data.createdAt),
      createdAt: e.createdAt || data.createdAt || new Date().toISOString(),
    }));
  } else if (totalSales > 0) {
    const docTime = formatIsoToBRTime(data.createdAt);
    // If entries weren't explicitly entered in Firebase Console, synthesize using document creation time
    if (pix > 0) {
      entries.push({
        id: `entry-${docId}-pix`,
        amount: pix,
        paymentMethod: 'pix',
        time: docTime,
        createdAt: data.createdAt || new Date().toISOString(),
      });
    }
    if (credit > 0) {
      entries.push({
        id: `entry-${docId}-card`,
        amount: credit,
        paymentMethod: 'card',
        time: docTime,
        createdAt: data.createdAt || new Date().toISOString(),
      });
    }
    if (cash > 0) {
      entries.push({
        id: `entry-${docId}-cash`,
        amount: cash,
        paymentMethod: 'cash',
        time: docTime,
        createdAt: data.createdAt || new Date().toISOString(),
      });
    }
    if (entries.length === 0) {
      entries.push({
        id: `entry-${docId}-total`,
        amount: totalSales,
        paymentMethod: 'pix',
        time: docTime,
        createdAt: data.createdAt || new Date().toISOString(),
      });
    }
  }

  return {
    id: docId,
    date,
    totalSales,
    cost,
    profit,
    profitMargin,
    salesCount,
    averageTicket,
    paymentMethods: {
      pix: pix > 0 ? pix : undefined,
      credit: credit > 0 ? credit : undefined,
      cash: cash > 0 ? cash : undefined,
    },
    entries,
    costEntries: Array.isArray(data.costEntries)
      ? data.costEntries.map((c: any, idx: number) => ({
          id: c.id || `cost-${date}-${idx + 1}`,
          amount: Number(c.amount ?? c.valor ?? 0),
          description: c.description ?? c.descricao ?? c.motivo ?? 'Despesa/Custo',
          category: c.category ?? c.categoria ?? 'Outros',
          time: c.time ?? c.hora ?? '12:00',
          createdAt: c.createdAt || new Date().toISOString(),
        }))
      : [],
    notes: typeof data.notes === 'string' ? data.notes : typeof data.observacao === 'string' ? data.observacao : '',
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

// Subscribe to real-time sales for a user (listens to both users/{userId}/sales and auto-syncs)
export function subscribeToUserSales(
  userId: string,
  onData: (sales: DailySale[]) => void,
  onError?: (err: Error) => void
): () => void {
  const salesColPath = `users/${userId}/sales`;
  const salesRef = collection(db, 'users', userId, 'sales');

  let activeSalesMap = new Map<string, DailySale>();

  const emitSorted = () => {
    // Deduplicate by date to guarantee 100% uniqueness per day
    const byDate = new Map<string, DailySale>();
    for (const s of activeSalesMap.values()) {
      const existing = byDate.get(s.date);
      if (!existing || (s.updatedAt || '') >= (existing.updatedAt || '')) {
        byDate.set(s.date, s);
      }
    }
    const list = Array.from(byDate.values());
    list.sort((a, b) => b.date.localeCompare(a.date));
    onData(list);
  };

  const unsubscribePrimary = onSnapshot(
    salesRef,
    (snapshot) => {
      const currentIds = new Set<string>();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();

        // If mock data is found in Firestore, permanently delete it!
        if (isMockSaleDoc(data, docSnap.id)) {
          deleteDoc(docSnap.ref).catch((e) => console.warn('Falha ao excluir mock:', e));
          return;
        }

        const sale = parseSaleDocument(docSnap.id, data);
        activeSalesMap.set(docSnap.id, sale);
        currentIds.add(docSnap.id);
      });

      // Remove any docs that were deleted from primary collection
      for (const key of Array.from(activeSalesMap.keys())) {
        if (!currentIds.has(key) && !key.startsWith('root-')) {
          activeSalesMap.delete(key);
        }
      }

      emitSorted();
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, salesColPath);
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );

  return () => {
    unsubscribePrimary();
  };
}

// Save or update a single daily sale
export async function saveSaleToCloud(userId: string, sale: DailySale): Promise<void> {
  if (!sale) {
    console.warn('[Firestore] saveSaleToCloud chamado sem registro válido.');
    return;
  }

  const targetDate = sale.date || getTodaySafeDate();
  const saleId = `sale-${targetDate}`;
  const path = `users/${userId}/sales/${saleId}`;
  try {
    const docRef = doc(db, 'users', userId, 'sales', saleId);

    // Explicitly construct safe object without any undefined values
    const safeData = cleanForFirestore({
      id: saleId,
      date: targetDate,
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
        time: e.time || formatIsoToBRTime(e.createdAt),
        createdAt: e.createdAt || new Date().toISOString(),
      })),
      costEntries: (sale.costEntries || []).map((c) => ({
        id: c.id || `cost-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        amount: Number(c.amount) || 0,
        description: typeof c.description === 'string' ? c.description : 'Despesa/Custo',
        category: typeof c.category === 'string' ? c.category : 'Outros',
        time: c.time || formatIsoToBRTime(c.createdAt),
        createdAt: c.createdAt || new Date().toISOString(),
      })),
      notes: typeof sale.notes === 'string' ? sale.notes : '',
      userId,
      createdAt: sale.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await setDoc(docRef, safeData);
    console.log('[Firestore] Documento salvo com sucesso:', path);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

function getTodaySafeDate(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

// Clear all sales for a user from Firestore
export async function clearAllUserSalesFromCloud(userId: string): Promise<number> {
  const path = `users/${userId}/sales`;
  let count = 0;
  try {
    const salesRef = collection(db, 'users', userId, 'sales');
    const snapshot = await getDocs(salesRef);
    const deletePromises = snapshot.docs.map((docSnap) => {
      count++;
      return deleteDoc(docSnap.ref);
    });
    await Promise.all(deletePromises);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
  return count;
}

// Save app settings
export async function saveSettingsToCloud(userId: string, settings: AppSettings): Promise<void> {
  const path = `users/${userId}/settings/config`;
  try {
    const docRef = doc(db, 'users', userId, 'settings', 'config');
    const safeData = cleanForFirestore({
      businessName: settings.businessName || 'MY Brechó',
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
          businessName: data.businessName && data.businessName !== 'Meu Negócio' ? data.businessName : 'MY Brechó',
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

import { create } from 'zustand';
import type { WalletSummary, TransactionItem } from '@/types';

interface WalletState {
  summary: WalletSummary | null;
  transactions: TransactionItem[];
  totalTransactions: number;
  isLoading: boolean;
  isTransactionsLoading: boolean;
  fetchSummary: (userId: string) => Promise<void>;
  fetchTransactions: (userId: string, type?: string, limit?: number, offset?: number, append?: boolean) => Promise<void>;
  clearCache: () => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  summary: null,
  transactions: [],
  totalTransactions: 0,
  isLoading: false,
  isTransactionsLoading: false,

  fetchSummary: async (userId: string) => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/wallet', {
        headers: { 'X-User-Id': userId },
      });
      if (!res.ok) throw new Error('Failed to fetch wallet summary');
      const data = await res.json();
      set({ summary: data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchTransactions: async (userId: string, type?: string, limit = 20, offset = 0, append = false) => {
    set({ isTransactionsLoading: true });
    try {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      if (type && type !== 'all') {
        params.set('type', type);
      }
      const res = await fetch(`/api/wallet/transactions?${params.toString()}`, {
        headers: { 'X-User-Id': userId },
      });
      if (!res.ok) throw new Error('Failed to fetch transactions');
      const data = await res.json();
      if (append) {
        const existing = get().transactions;
        set({
          transactions: [...existing, ...data.transactions],
          totalTransactions: data.total,
          isTransactionsLoading: false,
        });
      } else {
        set({
          transactions: data.transactions,
          totalTransactions: data.total,
          isTransactionsLoading: false,
        });
      }
    } catch {
      set({ isTransactionsLoading: false });
    }
  },

  clearCache: () => {
    set({ summary: null, transactions: [], totalTransactions: 0 });
  },
}));

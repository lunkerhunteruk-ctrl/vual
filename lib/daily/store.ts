import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { VaultUser } from './auth';
import { syncCreditsToFirestore, addPointsToFirestore } from './auth';

const GUEST_FREE = 1;
const DAILY_FREE = 5;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

interface VaultStore {
  user: VaultUser | null;
  setUser: (user: VaultUser | null) => void;

  freeUsed: number;
  freeResetDate: string;
  paidCredits: number;
  points: number;
  incrementGeneration: () => void;
  addPaidCredits: (amount: number) => void;
  addPoints: (amount: number) => void;
  syncFromFirestore: (paidCredits: number, freeUsed: number, freeResetDate?: string, points?: number) => void;

  canGenerate: () => boolean;
  freeRemaining: () => number;
  totalRemaining: () => number;
}

function checkDailyReset(state: { user: VaultUser | null; freeUsed: number; freeResetDate: string }): { freeUsed: number; freeResetDate: string } {
  if (!state.user) return { freeUsed: state.freeUsed, freeResetDate: state.freeResetDate };
  const today = todayStr();
  if (state.freeResetDate !== today) {
    return { freeUsed: 0, freeResetDate: today };
  }
  return { freeUsed: state.freeUsed, freeResetDate: state.freeResetDate };
}

function syncToFirestore(state: { user: VaultUser | null; paidCredits: number; freeUsed: number; freeResetDate: string; points?: number }) {
  if (state.user) {
    syncCreditsToFirestore(state.user.id, state.paidCredits, state.freeUsed, state.freeResetDate, state.points).catch(() => {});
  }
}

export const useVaultStore = create<VaultStore>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => {
        if (user) {
          const localFreeUsed = get().freeUsed;
          const mergedFreeUsed = Math.max(localFreeUsed, user.freeUsed);
          const mergedPaidCredits = Math.max(get().paidCredits, user.paidCredits);
          const freeResetDate = get().freeResetDate || todayStr();
          set({ user, paidCredits: mergedPaidCredits, freeUsed: mergedFreeUsed, freeResetDate });
          const reset = checkDailyReset({ user, freeUsed: mergedFreeUsed, freeResetDate });
          set(reset);
          syncToFirestore({ user, paidCredits: mergedPaidCredits, ...reset });
        } else {
          set({ user: null });
        }
      },

      freeUsed: 0,
      freeResetDate: todayStr(),
      paidCredits: 0,
      points: 0,

      incrementGeneration: () => {
        const state = get();
        const reset = checkDailyReset(state);
        const freeUsed = reset.freeUsed;
        const freeResetDate = reset.freeResetDate;
        const { user, paidCredits } = state;
        const freeMax = user ? DAILY_FREE : GUEST_FREE;

        if (freeUsed < freeMax) {
          const newFreeUsed = freeUsed + 1;
          set({ freeUsed: newFreeUsed, freeResetDate });
          syncToFirestore({ user, paidCredits, freeUsed: newFreeUsed, freeResetDate });
        } else if (paidCredits > 0) {
          const newPaid = paidCredits - 1;
          set({ paidCredits: newPaid, freeResetDate });
          syncToFirestore({ user, paidCredits: newPaid, freeUsed, freeResetDate });
        }
      },

      syncFromFirestore: (serverPaid, serverFreeUsed, serverResetDate, serverPoints) => {
        const local = get();
        const freeResetDate = serverResetDate || local.freeResetDate;
        set({
          paidCredits: Math.max(local.paidCredits, serverPaid),
          freeUsed: Math.max(local.freeUsed, serverFreeUsed),
          freeResetDate,
          points: serverPoints ?? local.points,
        });
        const reset = checkDailyReset({ user: local.user, freeUsed: Math.max(local.freeUsed, serverFreeUsed), freeResetDate });
        set(reset);
      },

      addPaidCredits: (amount) => {
        const { user, freeUsed, paidCredits, freeResetDate } = get();
        const newPaid = paidCredits + amount;
        set({ paidCredits: newPaid });
        syncToFirestore({ user, paidCredits: newPaid, freeUsed, freeResetDate });
      },

      addPoints: (amount) => {
        const { user, points } = get();
        const newPoints = points + amount;
        set({ points: newPoints });
        if (user) {
          addPointsToFirestore(user.id, amount).catch(() => {});
        }
      },

      canGenerate: () => {
        const state = get();
        const reset = checkDailyReset(state);
        const freeMax = state.user ? DAILY_FREE : GUEST_FREE;
        return reset.freeUsed < freeMax || state.paidCredits > 0;
      },

      freeRemaining: () => {
        const state = get();
        const reset = checkDailyReset(state);
        const freeMax = state.user ? DAILY_FREE : GUEST_FREE;
        return Math.max(0, freeMax - reset.freeUsed);
      },

      totalRemaining: () => {
        const state = get();
        const reset = checkDailyReset(state);
        const freeMax = state.user ? DAILY_FREE : GUEST_FREE;
        return Math.max(0, freeMax - reset.freeUsed) + state.paidCredits;
      },
    }),
    {
      name: 'vault-daily-store',
      partialize: (state) => ({
        user: state.user,
        freeUsed: state.freeUsed,
        freeResetDate: state.freeResetDate,
        paidCredits: state.paidCredits,
        points: state.points,
      }),
    }
  )
);

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initLiff, getLiff, isLoggedIn, getProfile, type LiffProfile } from '@/lib/liff';
import { handleGoogleRedirectResult } from '@/lib/auth/google-auth';
import { useAuthStore } from '@/lib/store';
import { useCustomerContext } from '@/lib/store/customer-context';
import type { Liff } from '@line/liff';

interface LiffContextValue {
  liff: Liff | null;
  isReady: boolean;
  isLoggedIn: boolean;
  profile: LiffProfile | null;
  error: Error | null;
  login: () => void;
  logout: () => void;
}

const LiffContext = createContext<LiffContextValue | undefined>(undefined);

export function useLiff() {
  const context = useContext(LiffContext);
  if (!context) {
    throw new Error('useLiff must be used within a LiffProvider');
  }
  return context;
}

function isLineBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  return /Line\//i.test(navigator.userAgent);
}

interface LiffProviderProps {
  children: ReactNode;
}

export function LiffProvider({ children }: LiffProviderProps) {
  const [liff, setLiff] = useState<Liff | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const { setCustomer, setCustomerLoading } = useAuthStore();
  const { setStoreId } = useCustomerContext();

  useEffect(() => {
    const initialize = async () => {
      try {
        setCustomerLoading(true);

        // Capture storeId from URL params (e.g., LIFF URL: ?storeId=xxx)
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const storeIdParam = urlParams.get('storeId');
          if (storeIdParam) {
            setStoreId(storeIdParam);
          }
        }

        // Check for Google redirect result first (from signInWithRedirect)
        const googleCustomer = await handleGoogleRedirectResult();
        if (googleCustomer) {
          setCustomer(googleCustomer, 'google');
          setIsReady(true);
          return;
        }

        // Only initialize LIFF in LINE browser or when LIFF ID is set
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (liffId && isLineBrowser()) {
          const liffInstance = await initLiff();
          setLiff(liffInstance);
          setIsReady(true);

          if (liffInstance.isLoggedIn()) {
            const userProfile = await getProfile();
            setProfile(userProfile);

            if (userProfile) {
              setCustomer({
                id: userProfile.userId,
                lineUserId: userProfile.userId,
                displayName: userProfile.displayName,
                photoURL: userProfile.pictureUrl,
                addresses: [],
                orderCount: 0,
                totalSpent: 0,
                isVip: false,
                createdAt: new Date(),
                updatedAt: new Date(),
              }, 'line');
            }
          } else {
            setCustomerLoading(false);
          }
        } else {
          // Not in LINE browser - LIFF not needed
          setIsReady(true);
          setCustomerLoading(false);
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
        setError(err instanceof Error ? err : new Error('Auth initialization failed'));
        setIsReady(true);
        setCustomerLoading(false);
      }
    };

    if (typeof window !== 'undefined') {
      initialize();
    } else {
      setIsReady(true);
      setCustomerLoading(false);
    }
  }, [setCustomer, setCustomerLoading, setStoreId]);

  const login = () => {
    const liffInstance = getLiff();
    if (liffInstance) {
      liffInstance.login();
    }
  };

  const logout = () => {
    const liffInstance = getLiff();
    if (liffInstance) {
      liffInstance.logout();
      setProfile(null);
      setCustomer(null);
      window.location.reload();
    }
  };

  return (
    <LiffContext.Provider
      value={{
        liff,
        isReady,
        isLoggedIn: isLoggedIn(),
        profile,
        error,
        login,
        logout,
      }}
    >
      {children}
    </LiffContext.Provider>
  );
}

export default LiffProvider;

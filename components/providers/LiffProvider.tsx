'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initLiff, getLiff, isLoggedIn, getProfile, type LiffProfile } from '@/lib/liff';
import { useAuthStore } from '@/lib/store';
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

interface LiffProviderProps {
  children: ReactNode;
}

export function LiffProvider({ children }: LiffProviderProps) {
  const [liff, setLiff] = useState<Liff | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const { setCustomer, setCustomerLoading } = useAuthStore();

  useEffect(() => {
    const initializeLiff = async () => {
      try {
        setCustomerLoading(true);
        const liffInstance = await initLiff();
        setLiff(liffInstance);
        setIsReady(true);

        // Get profile if logged in
        if (liffInstance.isLoggedIn()) {
          const userProfile = await getProfile();
          setProfile(userProfile);

          // Set customer in auth store
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
            });
          }
        } else {
          setCustomerLoading(false);
        }
      } catch (err) {
        console.error('LIFF initialization failed:', err);
        setError(err instanceof Error ? err : new Error('LIFF initialization failed'));
        setCustomerLoading(false);
      }
    };

    // Only initialize in browser
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_LIFF_ID) {
      initializeLiff();
    } else {
      setIsReady(true);
      setCustomerLoading(false);
    }
  }, [setCustomer, setCustomerLoading]);

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

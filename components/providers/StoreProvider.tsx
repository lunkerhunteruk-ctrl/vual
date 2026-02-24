'use client';

import { useEffect, ReactNode } from 'react';
import { useStoreContext } from '@/lib/store/store-context';
import type { StoreInfo } from '@/lib/store-resolver';

interface StoreProviderProps {
  store: StoreInfo | null;
  isRootDomain: boolean;
  children: ReactNode;
}

export function StoreProvider({ store, isRootDomain, children }: StoreProviderProps) {
  const { setStore, setIsRootDomain } = useStoreContext();

  useEffect(() => {
    setStore(store);
    setIsRootDomain(isRootDomain);
  }, [store, isRootDomain, setStore, setIsRootDomain]);

  return <>{children}</>;
}

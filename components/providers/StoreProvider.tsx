'use client';

import { useRef, useEffect, ReactNode } from 'react';
import { useStoreContext } from '@/lib/store/store-context';
import type { StoreInfo } from '@/lib/store-resolver';

interface StoreProviderProps {
  store: StoreInfo | null;
  isRootDomain: boolean;
  children: ReactNode;
}

export function StoreProvider({ store, isRootDomain, children }: StoreProviderProps) {
  const { setStore, setIsRootDomain } = useStoreContext();
  const initialized = useRef(false);

  // Set store context synchronously on first render to avoid flash
  if (!initialized.current) {
    initialized.current = true;
    useStoreContext.setState({ store, isRootDomain });
  }

  useEffect(() => {
    setStore(store);
    setIsRootDomain(isRootDomain);
  }, [store, isRootDomain, setStore, setIsRootDomain]);

  return <>{children}</>;
}

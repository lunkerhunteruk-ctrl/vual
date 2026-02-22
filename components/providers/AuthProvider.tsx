'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db, COLLECTIONS } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthStore } from '@/lib/store';
import type { User } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { user, isLoading, error, setUser, setLoading, setError, signOut: storeSignOut } = useAuthStore();

  useEffect(() => {
    // Skip if Firebase is not initialized (e.g., no config)
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch user data from Firestore
          const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid));

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: userData.displayName || firebaseUser.displayName || '',
              photoURL: userData.photoURL || firebaseUser.photoURL || undefined,
              role: userData.role || 'staff',
              shopId: userData.shopId,
              createdAt: userData.createdAt?.toDate() || new Date(),
              updatedAt: userData.updatedAt?.toDate() || new Date(),
            });
          } else {
            // User exists in Firebase Auth but not in Firestore
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || undefined,
              role: 'staff',
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
          setError('Failed to fetch user data');
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [setUser, setLoading, setError]);

  const signOut = async () => {
    try {
      if (auth) {
        await firebaseSignOut(auth);
      }
      storeSignOut();
    } catch (err) {
      console.error('Sign out error:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;

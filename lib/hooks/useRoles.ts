import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import type { Role } from '@/lib/types';

interface UseRolesOptions {
  shopId?: string;
}

interface UseRolesReturn {
  roles: Role[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  createRole: (data: Omit<Role, 'id' | 'createdAt' | 'updatedAt' | 'isSystem'>) => Promise<string>;
  updateRole: (id: string, data: Partial<Role>) => Promise<void>;
  deleteRole: (id: string) => Promise<void>;
}

// Default permissions list
export const AVAILABLE_PERMISSIONS = [
  'products.view',
  'products.create',
  'products.edit',
  'products.delete',
  'orders.view',
  'orders.edit',
  'orders.cancel',
  'customers.view',
  'customers.edit',
  'coupons.view',
  'coupons.create',
  'coupons.edit',
  'coupons.delete',
  'reviews.view',
  'reviews.moderate',
  'analytics.view',
  'settings.view',
  'settings.edit',
  'team.view',
  'team.manage',
  'roles.view',
  'roles.manage',
  'media.view',
  'media.upload',
  'media.delete',
  'livestream.view',
  'livestream.manage',
  'ai.view',
  'ai.use',
] as const;

export type Permission = typeof AVAILABLE_PERMISSIONS[number];

export function useRoles(options: UseRolesOptions = {}): UseRolesReturn {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRoles = useCallback(async () => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      let q = query(
        collection(db, COLLECTIONS.ROLES),
        orderBy('name', 'asc')
      );

      if (options.shopId) {
        q = query(q, where('shopId', '==', options.shopId));
      }

      const snapshot = await getDocs(q);
      const fetchedRoles = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Role[];

      setRoles(fetchedRoles);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch roles'));
    } finally {
      setIsLoading(false);
    }
  }, [options.shopId]);

  useEffect(() => {
    fetchRoles();
  }, [options.shopId]);

  const refresh = async () => {
    await fetchRoles();
  };

  const createRole = async (data: Omit<Role, 'id' | 'createdAt' | 'updatedAt' | 'isSystem'>): Promise<string> => {
    if (!db) throw new Error('Database not initialized');

    const now = new Date();
    const docRef = await addDoc(collection(db, COLLECTIONS.ROLES), {
      ...data,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    });

    await refresh();
    return docRef.id;
  };

  const updateRole = async (id: string, data: Partial<Role>): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    // Prevent editing system roles
    const role = roles.find(r => r.id === id);
    if (role?.isSystem) {
      throw new Error('Cannot edit system roles');
    }

    const docRef = doc(db, COLLECTIONS.ROLES, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date(),
    });

    setRoles((prev) =>
      prev.map((role) =>
        role.id === id ? { ...role, ...data, updatedAt: new Date() } : role
      )
    );
  };

  const deleteRole = async (id: string): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    // Prevent deleting system roles
    const role = roles.find(r => r.id === id);
    if (role?.isSystem) {
      throw new Error('Cannot delete system roles');
    }

    await deleteDoc(doc(db, COLLECTIONS.ROLES, id));
    setRoles((prev) => prev.filter((role) => role.id !== id));
  };

  return { roles, isLoading, error, refresh, createRole, updateRole, deleteRole };
}

export function useRole(roleId: string | null) {
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!roleId || !db) {
      setIsLoading(false);
      return;
    }

    const fetchRole = async () => {
      try {
        setIsLoading(true);
        const docRef = doc(db, COLLECTIONS.ROLES, roleId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setRole({
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as Role);
        } else {
          setRole(null);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch role'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchRole();
  }, [roleId]);

  return { role, isLoading, error };
}

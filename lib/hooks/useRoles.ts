import { useState, useEffect, useCallback } from 'react';

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

interface UseRolesReturn {
  roles: Role[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  createRole: (data: Omit<Role, 'id' | 'created_at' | 'updated_at' | 'is_system'>) => Promise<string>;
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

export function useRoles(): UseRolesReturn {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRoles = useCallback(async () => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/roles');
      const data = await response.json();

      if (data.roles) {
        setRoles(data.roles);
      } else {
        setRoles([]);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch roles'));
      setRoles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const refresh = async () => {
    await fetchRoles();
  };

  const createRole = async (data: Omit<Role, 'id' | 'created_at' | 'updated_at' | 'is_system'>): Promise<string> => {
    const response = await fetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create role');
    }

    const result = await response.json();
    await refresh();
    return result.id;
  };

  const updateRole = async (id: string, data: Partial<Role>): Promise<void> => {
    const response = await fetch('/api/roles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || 'Failed to update role');
    }

    setRoles((prev) =>
      prev.map((role) =>
        role.id === id ? { ...role, ...data } : role
      )
    );
  };

  const deleteRole = async (id: string): Promise<void> => {
    const response = await fetch(`/api/roles?id=${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || 'Failed to delete role');
    }

    setRoles((prev) => prev.filter((role) => role.id !== id));
  };

  return { roles, isLoading, error, refresh, createRole, updateRole, deleteRole };
}

export function useRole(roleId: string | null) {
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!roleId) {
      setIsLoading(false);
      return;
    }

    const fetchRole = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/roles?id=${roleId}`);
        const data = await response.json();

        if (data && data.id) {
          setRole(data);
        } else {
          setRole(null);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch role'));
        setRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRole();
  }, [roleId]);

  return { role, isLoading, error };
}

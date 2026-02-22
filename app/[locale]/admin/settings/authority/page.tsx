'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Shield, Users, ShoppingCart, Package, CreditCard, Settings, Eye, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui';

interface Permission {
  id: string;
  name: string;
  description: string;
  icon: typeof Shield;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
}

const permissions: Permission[] = [
  { id: 'dashboard', name: 'Dashboard', description: 'View dashboard and analytics', icon: Settings },
  { id: 'orders', name: 'Orders', description: 'Manage orders and fulfillment', icon: ShoppingCart },
  { id: 'customers', name: 'Customers', description: 'View and manage customers', icon: Users },
  { id: 'products', name: 'Products', description: 'Add and edit products', icon: Package },
  { id: 'transactions', name: 'Transactions', description: 'View financial data', icon: CreditCard },
  { id: 'settings', name: 'Settings', description: 'Manage system settings', icon: Settings },
];

const mockRoles: Role[] = [
  { id: '1', name: 'Super Admin', description: 'Full access to all features', permissions: ['dashboard', 'orders', 'customers', 'products', 'transactions', 'settings'], userCount: 1 },
  { id: '2', name: 'Store Manager', description: 'Manage products and orders', permissions: ['dashboard', 'orders', 'customers', 'products'], userCount: 3 },
  { id: '3', name: 'Sales Staff', description: 'Handle orders and customers', permissions: ['dashboard', 'orders', 'customers'], userCount: 5 },
  { id: '4', name: 'Viewer', description: 'Read-only access', permissions: ['dashboard'], userCount: 2 },
];

export default function ControlAuthorityPage() {
  const t = useTranslations('admin.settings');
  const [selectedRole, setSelectedRole] = useState<Role | null>(mockRoles[0]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-title-active)]">
            {t('controlAuthority')}
          </h2>
          <p className="text-sm text-[var(--color-text-label)] mt-1">
            {t('controlAuthorityDescription')}
          </p>
        </div>
        <Button variant="primary" leftIcon={<Shield size={16} />}>
          {t('addRole')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)]"
        >
          <div className="p-4 border-b border-[var(--color-line)]">
            <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide">
              {t('roles')}
            </h3>
          </div>
          <div className="divide-y divide-[var(--color-line)]">
            {mockRoles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role)}
                className={`w-full p-4 text-left transition-colors ${
                  selectedRole?.id === role.id
                    ? 'bg-[var(--color-bg-element)]'
                    : 'hover:bg-[var(--color-bg-element)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-title-active)]">
                      {role.name}
                    </p>
                    <p className="text-xs text-[var(--color-text-label)] mt-0.5">
                      {role.description}
                    </p>
                  </div>
                  <span className="text-xs bg-[var(--color-bg-input)] text-[var(--color-text-body)] px-2 py-1 rounded-full">
                    {role.userCount} users
                  </span>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Permissions Editor */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-white border border-[var(--color-line)] rounded-[var(--radius-md)]"
        >
          {selectedRole ? (
            <>
              <div className="p-4 border-b border-[var(--color-line)] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-title-active)]">
                    {selectedRole.name}
                  </h3>
                  <p className="text-xs text-[var(--color-text-label)] mt-0.5">
                    {selectedRole.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-element)] transition-colors">
                    <Edit2 size={16} className="text-[var(--color-text-label)]" />
                  </button>
                  <button className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-element)] transition-colors">
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <h4 className="text-xs font-medium text-[var(--color-text-label)] uppercase tracking-wide mb-4">
                  {t('permissions')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {permissions.map((permission) => {
                    const Icon = permission.icon;
                    const hasPermission = selectedRole.permissions.includes(permission.id);
                    return (
                      <label
                        key={permission.id}
                        className={`flex items-center gap-3 p-3 rounded-[var(--radius-md)] border cursor-pointer transition-colors ${
                          hasPermission
                            ? 'border-[var(--color-accent)] bg-[var(--color-bg-element)]'
                            : 'border-[var(--color-line)] hover:bg-[var(--color-bg-element)]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={hasPermission}
                          onChange={() => {}}
                          className="w-4 h-4 rounded border-[var(--color-line)] text-[var(--color-accent)]"
                        />
                        <Icon size={18} className={hasPermission ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-label)]'} />
                        <div>
                          <p className="text-sm font-medium text-[var(--color-title-active)]">
                            {permission.name}
                          </p>
                          <p className="text-xs text-[var(--color-text-label)]">
                            {permission.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-6 flex justify-end">
                  <Button variant="primary">
                    {t('saveChanges')}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-[var(--color-text-label)]">
                {t('selectRoleToEdit')}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

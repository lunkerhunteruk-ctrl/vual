'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Shield, Users, ShoppingCart, Package, CreditCard, Settings, Edit2, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { useRoles, AVAILABLE_PERMISSIONS } from '@/lib/hooks';

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  is_system: boolean;
}

interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  icon: typeof Shield;
  permissions: string[];
}

const permissionGroups: PermissionGroup[] = [
  { id: 'dashboard', name: 'Dashboard', description: 'View dashboard and analytics', icon: Settings, permissions: ['analytics.view'] },
  { id: 'orders', name: 'Orders', description: 'Manage orders and fulfillment', icon: ShoppingCart, permissions: ['orders.view', 'orders.edit', 'orders.cancel'] },
  { id: 'customers', name: 'Customers', description: 'View and manage customers', icon: Users, permissions: ['customers.view', 'customers.edit'] },
  { id: 'products', name: 'Products', description: 'Add and edit products', icon: Package, permissions: ['products.view', 'products.create', 'products.edit', 'products.delete'] },
  { id: 'transactions', name: 'Transactions', description: 'View financial data', icon: CreditCard, permissions: ['analytics.view'] },
  { id: 'settings', name: 'Settings', description: 'Manage system settings', icon: Settings, permissions: ['settings.view', 'settings.edit', 'team.view', 'team.manage', 'roles.view', 'roles.manage'] },
];

export default function ControlAuthorityPage() {
  const t = useTranslations('admin.settings');
  const locale = useLocale();

  const { roles, isLoading, error, createRole, updateRole, deleteRole, refresh } = useRoles();

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPermissions, setEditedPermissions] = useState<string[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (roles.length > 0 && !selectedRole) {
      const firstRole = roles[0] as Role;
      setSelectedRole(firstRole);
      setEditedPermissions(firstRole.permissions);
    }
  }, [roles, selectedRole]);

  useEffect(() => {
    if (selectedRole) {
      setEditedPermissions(selectedRole.permissions);
    }
  }, [selectedRole]);

  const hasPermission = (groupId: string) => {
    const group = permissionGroups.find(g => g.id === groupId);
    if (!group) return false;
    return group.permissions.some(p => editedPermissions.includes(p));
  };

  const togglePermission = (groupId: string) => {
    const group = permissionGroups.find(g => g.id === groupId);
    if (!group) return;

    const hasAllPerms = group.permissions.every(p => editedPermissions.includes(p));

    if (hasAllPerms) {
      setEditedPermissions(prev => prev.filter(p => !group.permissions.includes(p)));
    } else {
      setEditedPermissions(prev => [...new Set([...prev, ...group.permissions])]);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;

    try {
      await updateRole(selectedRole.id, { permissions: editedPermissions });
      setSelectedRole({ ...selectedRole, permissions: editedPermissions });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;

    try {
      const id = await createRole({
        name: newRoleName,
        description: newRoleDescription,
        permissions: [],
      });
      setNewRoleName('');
      setNewRoleDescription('');
      setIsCreating(false);
      await refresh();
    } catch (err) {
      console.error('Failed to create role:', err);
    }
  };

  const handleDeleteRole = async (id: string) => {
    const role = roles.find(r => r.id === id) as Role | undefined;
    if (role?.is_system) {
      alert(locale === 'ja' ? 'システムロールは削除できません' : 'Cannot delete system role');
      return;
    }

    if (confirm(locale === 'ja' ? 'このロールを削除しますか？' : 'Delete this role?')) {
      try {
        await deleteRole(id);
        if (selectedRole?.id === id) {
          setSelectedRole(roles[0] as Role || null);
        }
      } catch (err) {
        console.error('Failed to delete role:', err);
      }
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-title-active)]">
            {locale === 'ja' ? '権限管理' : 'Control Authority'}
          </h2>
          <p className="text-sm text-[var(--color-text-label)] mt-1">
            {locale === 'ja' ? 'ロールと権限を管理します' : 'Manage roles and permissions'}
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Shield size={16} />}
          onClick={() => setIsCreating(true)}
        >
          {locale === 'ja' ? 'ロールを追加' : 'Add Role'}
        </Button>
      </div>

      {/* Create Role Modal */}
      {isCreating && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-4"
        >
          <h3 className="text-sm font-semibold text-[var(--color-title-active)] mb-4">
            {locale === 'ja' ? '新しいロールを作成' : 'Create New Role'}
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder={locale === 'ja' ? 'ロール名' : 'Role Name'}
              className="w-full h-10 px-3 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
            />
            <input
              type="text"
              value={newRoleDescription}
              onChange={(e) => setNewRoleDescription(e.target.value)}
              placeholder={locale === 'ja' ? '説明' : 'Description'}
              className="w-full h-10 px-3 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
            />
            <div className="flex gap-2">
              <Button variant="primary" onClick={handleCreateRole}>
                {locale === 'ja' ? '作成' : 'Create'}
              </Button>
              <Button variant="secondary" onClick={() => setIsCreating(false)}>
                {locale === 'ja' ? 'キャンセル' : 'Cancel'}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)]"
        >
          <div className="p-4 border-b border-[var(--color-line)]">
            <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide">
              {locale === 'ja' ? 'ロール' : 'Roles'}
            </h3>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={24} className="animate-spin text-[var(--color-text-label)]" />
            </div>
          ) : roles.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-[var(--color-text-label)]">
                {locale === 'ja' ? 'ロールがありません' : 'No roles'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-line)]">
              {roles.map((role) => {
                const typedRole = role as Role;
                return (
                  <button
                    key={typedRole.id}
                    onClick={() => { setSelectedRole(typedRole); setIsEditing(false); }}
                    className={`w-full p-4 text-left transition-colors ${
                      selectedRole?.id === typedRole.id
                        ? 'bg-[var(--color-bg-element)]'
                        : 'hover:bg-[var(--color-bg-element)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-title-active)]">
                          {typedRole.name}
                          {typedRole.is_system && (
                            <span className="ml-2 text-xs text-[var(--color-text-label)]">(System)</span>
                          )}
                        </p>
                        <p className="text-xs text-[var(--color-text-label)] mt-0.5">
                          {typedRole.description}
                        </p>
                      </div>
                      <span className="text-xs bg-[var(--color-bg-input)] text-[var(--color-text-body)] px-2 py-1 rounded-full">
                        {typedRole.permissions.length} perms
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
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
                  {!selectedRole.is_system && (
                    <>
                      <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-element)] transition-colors"
                      >
                        <Edit2 size={16} className="text-[var(--color-text-label)]" />
                      </button>
                      <button
                        onClick={() => handleDeleteRole(selectedRole.id)}
                        className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-element)] transition-colors"
                      >
                        <Trash2 size={16} className="text-red-500" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="p-4">
                <h4 className="text-xs font-medium text-[var(--color-text-label)] uppercase tracking-wide mb-4">
                  {locale === 'ja' ? '権限' : 'Permissions'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {permissionGroups.map((group) => {
                    const Icon = group.icon;
                    const hasPermissionGroup = hasPermission(group.id);
                    return (
                      <label
                        key={group.id}
                        className={`flex items-center gap-3 p-3 rounded-[var(--radius-md)] border cursor-pointer transition-colors ${
                          hasPermissionGroup
                            ? 'border-[var(--color-accent)] bg-[var(--color-bg-element)]'
                            : 'border-[var(--color-line)] hover:bg-[var(--color-bg-element)]'
                        } ${!isEditing && 'pointer-events-none'}`}
                      >
                        <input
                          type="checkbox"
                          checked={hasPermissionGroup}
                          onChange={() => togglePermission(group.id)}
                          disabled={!isEditing || selectedRole.is_system}
                          className="w-4 h-4 rounded border-[var(--color-line)] text-[var(--color-accent)]"
                        />
                        <Icon size={18} className={hasPermissionGroup ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-label)]'} />
                        <div>
                          <p className="text-sm font-medium text-[var(--color-title-active)]">
                            {group.name}
                          </p>
                          <p className="text-xs text-[var(--color-text-label)]">
                            {group.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {isEditing && !selectedRole.is_system && (
                  <div className="mt-6 flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => { setIsEditing(false); setEditedPermissions(selectedRole.permissions); }}>
                      {locale === 'ja' ? 'キャンセル' : 'Cancel'}
                    </Button>
                    <Button variant="primary" onClick={handleSavePermissions}>
                      {locale === 'ja' ? '保存' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-[var(--color-text-label)]">
                {locale === 'ja' ? '編集するロールを選択してください' : 'Select a role to edit'}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

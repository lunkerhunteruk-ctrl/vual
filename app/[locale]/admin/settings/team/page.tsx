'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Search, Mail, Shield, Edit2, Trash2, UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import Image from 'next/image';
import { useTeamMembers, useRoles } from '@/lib/hooks';
import type { TeamMember } from '@/lib/types';

type TeamMemberStatus = 'active' | 'invited' | 'inactive';

const statusColors: Record<TeamMemberStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  invited: 'bg-blue-50 text-blue-700',
  inactive: 'bg-gray-100 text-gray-600',
};

export default function TeamPage() {
  const t = useTranslations('admin.settings');
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');

  // TODO: Get shopId from auth context
  const shopId = 'demo-shop';
  const { members, isLoading, error, inviteMember, removeMember, updateMember } = useTeamMembers({ shopId });
  const { roles } = useRoles({ shopId });

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.roleName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteName.trim() || !inviteRoleId) return;

    const selectedRole = roles.find(r => r.id === inviteRoleId);
    if (!selectedRole) return;

    try {
      await inviteMember({
        email: inviteEmail,
        name: inviteName,
        roleId: inviteRoleId,
        roleName: selectedRole.name,
        shopId,
      });
      setInviteEmail('');
      setInviteName('');
      setInviteRoleId('');
      setIsInviting(false);
    } catch (err) {
      console.error('Failed to invite member:', err);
    }
  };

  const handleRemove = async (id: string) => {
    if (confirm(t('confirmRemoveMember'))) {
      try {
        await removeMember(id);
      } catch (err) {
        console.error('Failed to remove member:', err);
      }
    }
  };

  const toggleStatus = async (member: TeamMember) => {
    const newStatus = member.status === 'active' ? 'inactive' : 'active';
    try {
      await updateMember(member.id, { status: newStatus });
    } catch (err) {
      console.error('Failed to update member status:', err);
    }
  };

  const formatLastActive = (date?: Date) => {
    if (!date) return '-';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hours ago`;
    return `${days} days ago`;
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
            {t('teamMembers')}
          </h2>
          <p className="text-sm text-[var(--color-text-label)] mt-1">
            {t('teamMembersDescription')}
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<UserPlus size={16} />}
          onClick={() => setIsInviting(true)}
        >
          {t('inviteMember')}
        </Button>
      </div>

      {/* Invite Form */}
      {isInviting && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-4"
        >
          <h3 className="text-sm font-semibold text-[var(--color-title-active)] mb-4">{t('inviteNewMember')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder={t('name')}
              className="h-10 px-3 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
            />
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder={t('email')}
              className="h-10 px-3 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
            />
            <select
              value={inviteRoleId}
              onChange={(e) => setInviteRoleId(e.target.value)}
              className="h-10 px-3 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] focus:outline-none focus:border-[var(--color-accent)]"
            >
              <option value="">{t('selectRole')}</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="primary" onClick={handleInvite}>
              {t('sendInvite')}
            </Button>
            <Button variant="secondary" onClick={() => setIsInviting(false)}>
              {t('cancel')}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Team Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)]"
      >
        {/* Search */}
        <div className="p-4 border-b border-[var(--color-line)]">
          <div className="relative max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchTeam')}
              className="w-full h-10 pl-9 pr-4 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-[var(--color-text-label)]" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-sm text-[var(--color-text-label)]">{t('noTeamMembers')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-line)] bg-[var(--color-bg-element)]">
                  <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                    {t('member')}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                    {t('email')}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                    {t('role')}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                    {t('status')}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                    {t('lastActive')}
                  </th>
                  <th className="w-24 py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-bg-element)] transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[var(--color-bg-input)] rounded-full flex items-center justify-center overflow-hidden">
                          {member.avatar ? (
                            <Image
                              src={member.avatar}
                              alt={member.name}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-medium text-[var(--color-text-body)]">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-medium text-[var(--color-title-active)]">
                          {member.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-sm text-[var(--color-text-body)]">
                        <Mail size={14} className="text-[var(--color-text-label)]" />
                        {member.email}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-sm text-[var(--color-text-body)]">
                        <Shield size={14} className="text-[var(--color-text-label)]" />
                        {member.roleName}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleStatus(member)}
                        className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full cursor-pointer ${statusColors[member.status]}`}
                      >
                        {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                      {formatLastActive(member.lastActiveAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-input)] transition-colors">
                          <Edit2 size={14} className="text-[var(--color-text-label)]" />
                        </button>
                        <button
                          onClick={() => handleRemove(member.id)}
                          className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-input)] transition-colors"
                        >
                          <Trash2 size={14} className="text-[var(--color-text-label)]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
}

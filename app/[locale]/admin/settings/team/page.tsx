'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Search, Mail, Shield, Edit2, Trash2, UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { useTeamMembers, useRoles } from '@/lib/hooks';

type TeamMemberStatus = 'active' | 'invited' | 'inactive';

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role_id?: string;
  role_name?: string;
  status: TeamMemberStatus;
  last_active_at?: string;
}

const statusColors: Record<TeamMemberStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  invited: 'bg-blue-50 text-blue-700',
  inactive: 'bg-gray-100 text-gray-600',
};

export default function TeamPage() {
  const t = useTranslations('admin.settings');
  const locale = useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');

  const { members, isLoading, error, inviteMember, removeMember, updateMember } = useTeamMembers();
  const { roles } = useRoles();

  const filteredMembers = members.filter((member: TeamMember) =>
    member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteName.trim()) return;

    const selectedRole = roles.find(r => r.id === inviteRoleId);

    try {
      await inviteMember({
        email: inviteEmail,
        name: inviteName,
        role_id: inviteRoleId || undefined,
        role_name: selectedRole?.name,
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
    if (confirm(locale === 'ja' ? 'このメンバーを削除しますか？' : 'Remove this member?')) {
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

  const formatLastActive = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return locale === 'ja' ? '今' : 'Now';
    if (minutes < 60) return locale === 'ja' ? `${minutes}分前` : `${minutes} min ago`;
    if (hours < 24) return locale === 'ja' ? `${hours}時間前` : `${hours} hours ago`;
    return locale === 'ja' ? `${days}日前` : `${days} days ago`;
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
          <h3 className="text-sm font-semibold text-[var(--color-title-active)] mb-4">
            {locale === 'ja' ? '新しいメンバーを招待' : 'Invite New Member'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder={locale === 'ja' ? '名前' : 'Name'}
              className="h-10 px-3 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
            />
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder={locale === 'ja' ? 'メールアドレス' : 'Email'}
              className="h-10 px-3 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
            />
            <select
              value={inviteRoleId}
              onChange={(e) => setInviteRoleId(e.target.value)}
              className="h-10 px-3 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] focus:outline-none focus:border-[var(--color-accent)]"
            >
              <option value="">{locale === 'ja' ? '役割を選択' : 'Select Role'}</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="primary" onClick={handleInvite}>
              {locale === 'ja' ? '招待を送信' : 'Send Invite'}
            </Button>
            <Button variant="secondary" onClick={() => setIsInviting(false)}>
              {locale === 'ja' ? 'キャンセル' : 'Cancel'}
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
              placeholder={locale === 'ja' ? 'チームを検索' : 'Search team'}
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
              <p className="text-sm text-[var(--color-text-label)]">
                {locale === 'ja' ? 'チームメンバーがいません' : 'No team members'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-line)] bg-[var(--color-bg-element)]">
                  <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                    {locale === 'ja' ? 'メンバー' : 'Member'}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                    {locale === 'ja' ? 'メール' : 'Email'}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                    {locale === 'ja' ? '役割' : 'Role'}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                    {locale === 'ja' ? 'ステータス' : 'Status'}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                    {locale === 'ja' ? '最終活動' : 'Last Active'}
                  </th>
                  <th className="w-24 py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member: TeamMember) => (
                  <tr
                    key={member.id}
                    className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-bg-element)] transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[var(--color-bg-input)] rounded-full flex items-center justify-center overflow-hidden">
                          <span className="text-sm font-medium text-[var(--color-text-body)]">
                            {member.name?.split(' ').map(n => n[0]).join('') || '?'}
                          </span>
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
                        {member.role_name || '-'}
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
                      {formatLastActive(member.last_active_at)}
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

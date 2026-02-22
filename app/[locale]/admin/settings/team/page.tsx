'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Search, Plus, MoreHorizontal, Mail, Shield, Edit2, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui';
import Image from 'next/image';

type TeamMemberStatus = 'active' | 'invited' | 'inactive';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  status: TeamMemberStatus;
  lastActive: string;
}

const mockTeamMembers: TeamMember[] = [
  { id: '1', name: 'Admin User', email: 'admin@vual.com', role: 'Super Admin', status: 'active', lastActive: 'Now' },
  { id: '2', name: 'Store Manager', email: 'manager@vual.com', role: 'Store Manager', status: 'active', lastActive: '2 hours ago' },
  { id: '3', name: 'Sales Staff 1', email: 'sales1@vual.com', role: 'Sales Staff', status: 'active', lastActive: '1 day ago' },
  { id: '4', name: 'Sales Staff 2', email: 'sales2@vual.com', role: 'Sales Staff', status: 'invited', lastActive: '-' },
  { id: '5', name: 'Viewer', email: 'viewer@vual.com', role: 'Viewer', status: 'inactive', lastActive: '1 week ago' },
];

const statusColors: Record<TeamMemberStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  invited: 'bg-blue-50 text-blue-700',
  inactive: 'bg-gray-100 text-gray-600',
};

export default function TeamPage() {
  const t = useTranslations('admin.settings');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMembers = mockTeamMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <Button variant="primary" leftIcon={<UserPlus size={16} />}>
          {t('inviteMember')}
        </Button>
      </div>

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
                      {member.role}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[member.status]}`}>
                      {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                    {member.lastActive}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-input)] transition-colors">
                        <Edit2 size={14} className="text-[var(--color-text-label)]" />
                      </button>
                      <button className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-input)] transition-colors">
                        <Trash2 size={14} className="text-[var(--color-text-label)]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

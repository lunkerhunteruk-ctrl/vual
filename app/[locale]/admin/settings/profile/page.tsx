'use client';

import { ProfileForm, PasswordChange } from '@/components/admin/settings';

export default function ProfileSettingsPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left - Profile Form (2/3) */}
      <div className="lg:col-span-2">
        <ProfileForm />
      </div>

      {/* Right - Password Change (1/3) */}
      <div>
        <PasswordChange />
      </div>
    </div>
  );
}

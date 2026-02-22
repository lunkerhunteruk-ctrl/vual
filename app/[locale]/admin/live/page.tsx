'use client';

import { useState } from 'react';
import { LivePreview, StreamSettings, ProductCasting, BroadcastHistory } from '@/components/admin/live';

export default function LiveBroadcastPage() {
  const [isLive, setIsLive] = useState(false);

  const handleGoLive = () => {
    setIsLive(!isLive);
  };

  return (
    <div className="space-y-6">
      {/* Top Section - Preview and Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Preview */}
        <div className="lg:col-span-2">
          <LivePreview />
        </div>

        {/* Right - Settings */}
        <div className="space-y-6">
          <StreamSettings onGoLive={handleGoLive} isLive={isLive} />
          <ProductCasting />
        </div>
      </div>

      {/* Bottom Section - Broadcast History */}
      <BroadcastHistory />
    </div>
  );
}

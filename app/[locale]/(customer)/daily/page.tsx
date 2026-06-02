"use client";

import { VaultContent } from "@/components/daily/VaultContent";

export default function DailyPage() {
  return (
    <div
      className="daily-vault min-h-screen"
      style={{
        background: "var(--vault-bg)",
        color: "var(--vault-text)",
        fontFamily: "'JetBrains Mono', 'SF Mono', 'Courier New', monospace",
      }}
    >
      <VaultContent />
    </div>
  );
}

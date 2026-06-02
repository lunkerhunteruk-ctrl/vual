"use client";

import { VaultContent } from "@/components/daily/VaultContent";
import { ThemeToggle } from "@/components/daily/ThemeToggle";

export default function DailyPage() {
  return (
    <div
      className="daily-vault min-h-screen"
      data-theme="light"
      style={{
        background: "var(--vault-bg)",
        color: "var(--vault-text)",
        fontFamily: "'JetBrains Mono', 'SF Mono', 'Courier New', monospace",
      }}
    >
      {/* Theme toggle — fixed bottom center */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <ThemeToggle />
      </div>

      <VaultContent />
    </div>
  );
}

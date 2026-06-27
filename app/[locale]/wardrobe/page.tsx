"use client";

import { VaultContent } from "@/components/daily/VaultContent";
import { ThemeToggle } from "@/components/daily/ThemeToggle";
import { NavPill } from "@/components/wardrobe/NavPill";
import { usePathname } from "next/navigation";

const MONO = "'JetBrains Mono', 'SF Mono', 'Courier New', monospace";

export default function WardrobePage() {
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "ja";

  return (
    <div
      className="daily-vault min-h-screen"
      data-theme="light"
      style={{
        background: "var(--vault-bg)",
        color: "var(--vault-text)",
        fontFamily: MONO,
      }}
    >
      <NavPill active="wardrobe" locale={locale} />

      {/* Theme toggle — fixed bottom center */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <ThemeToggle />
      </div>

      <VaultContent tier={undefined} />
    </div>
  );
}

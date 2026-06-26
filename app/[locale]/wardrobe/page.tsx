"use client";

import { VaultContent } from "@/components/daily/VaultContent";
import { ThemeToggle } from "@/components/daily/ThemeToggle";
import Link from "next/link";
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
      {/* Theme toggle — fixed bottom center */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <ThemeToggle />
      </div>

      {/* Generate FAB — fixed bottom right */}
      <Link
        href={`/${locale}/my/generate`}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 text-[10px] tracking-[3px] font-light transition-opacity hover:opacity-70"
        style={{
          background: "var(--vault-text)",
          color: "var(--vault-bg)",
          fontFamily: MONO,
        }}
      >
        ＋ GENERATE
      </Link>

      <VaultContent />
    </div>
  );
}

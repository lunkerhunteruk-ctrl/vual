"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export function NavPill({
  active,
  locale,
}: {
  active: "wardrobe" | "generate";
  locale: string;
}) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => {
      const wrapper = document.querySelector(".daily-vault");
      setIsDark(!wrapper?.getAttribute("data-theme"));
    };
    check();
    const observer = new MutationObserver(check);
    const wrapper = document.querySelector(".daily-vault");
    if (wrapper) observer.observe(wrapper, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const isGenerate = active === "generate";

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50">
      <div
        className="relative flex"
        style={{
          width: 288,
          height: 44,
          borderRadius: 22,
          padding: 4,
          background: isDark
            ? "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)"
            : "linear-gradient(135deg, rgba(201,168,76,0.1) 0%, rgba(201,168,76,0.03) 100%)",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(201,168,76,0.22)"}`,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: isDark
            ? "inset 0 1px 1px rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.35)"
            : "inset 0 1px 1px rgba(255,255,255,0.7), 0 4px 24px rgba(0,0,0,0.07)",
        }}
      >
        {/* Outer top reflection */}
        <div
          className="absolute top-0 left-0 right-0 pointer-events-none"
          style={{
            height: "48%",
            borderRadius: "22px 22px 0 0",
            background: isDark
              ? "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, transparent 100%)"
              : "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, transparent 100%)",
          }}
        />

        {/* Sliding active indicator */}
        <div
          className="absolute top-[4px] transition-all duration-500 ease-[cubic-bezier(0.68,-0.15,0.32,1.15)]"
          style={{
            left: isGenerate ? 144 : 4,
            width: 136,
            height: 34,
            borderRadius: 17,
            background: isDark
              ? "linear-gradient(145deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.04) 100%)"
              : "linear-gradient(145deg, rgba(201,168,76,0.32) 0%, rgba(201,168,76,0.1) 100%)",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.16)" : "rgba(201,168,76,0.42)"}`,
            boxShadow: isDark
              ? "0 2px 10px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.12)"
              : "0 2px 10px rgba(201,168,76,0.18), inset 0 1px 1px rgba(255,255,255,0.65)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          {/* Indicator inner reflection */}
          <div
            className="absolute top-[3px] left-[5px] right-[5px] pointer-events-none"
            style={{
              height: "44%",
              borderRadius: "8px 8px 0 0",
              background: isDark
                ? "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 100%)"
                : "linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 100%)",
            }}
          />
        </div>

        {/* FEED */}
        <Link
          href={`/${locale}/wardrobe`}
          className="relative flex-1 flex items-center justify-center z-10 text-[9px] tracking-[2.5px] font-light"
          style={{
            color:
              active === "wardrobe"
                ? isDark ? "rgba(255,255,255,0.88)" : "rgba(0,0,0,0.75)"
                : isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
          }}
        >
          FEED
        </Link>

        {/* GENERATE */}
        <Link
          href={`/${locale}/my/generate`}
          className="relative flex-1 flex items-center justify-center z-10 text-[9px] tracking-[2.5px] font-light"
          style={{
            color:
              active === "generate"
                ? isDark ? "rgba(255,255,255,0.88)" : "rgba(0,0,0,0.75)"
                : isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
          }}
        >
          GENERATE
        </Link>
      </div>
    </div>
  );
}

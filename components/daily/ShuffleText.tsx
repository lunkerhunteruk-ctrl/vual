"use client";

import { useEffect, useRef } from "react";

interface ShuffleTextProps {
  lines: string[];
  startDelay?: number;
  shuffleDuration?: number;
  stagger?: number;
  glowColor?: string;
  fontSize?: string;
  letterSpacing?: string;
  className?: string;
  onComplete?: () => void;
}

export function ShuffleText({
  lines,
  startDelay = 0,
  stagger = 40,
  fontSize = "28px",
  letterSpacing = "10px",
  className = "",
  onComplete,
}: ShuffleTextProps) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const completedRef = useRef(false);

  const totalChars = lines.join("").replace(/ /g, "").length;
  const totalDurationMs = startDelay + totalChars * stagger + 600;

  useEffect(() => {
    if (completedRef.current) return;
    const t = setTimeout(() => {
      completedRef.current = true;
      onCompleteRef.current?.();
    }, totalDurationMs);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let globalCharIndex = 0;

  return (
    <>
      <style>{`
        @keyframes charStrike {
          0% { opacity: 0; transform: scale(1.15); }
          40% { opacity: 1; transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <div
        className={className}
        style={{
          fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
          fontSize,
          fontWeight: 300,
          letterSpacing,
          lineHeight: 1.8,
          textAlign: "center",
          whiteSpace: "pre",
        }}
      >
        {lines.map((line, lineIdx) => (
          <div key={lineIdx}>
            {line.split("").map((char, charIdx) => {
              if (char === " ") {
                globalCharIndex++;
                return <span key={charIdx}>&nbsp;</span>;
              }

              const ci = globalCharIndex++;
              const delay = startDelay + ci * stagger;

              return (
                <span
                  key={charIdx}
                  style={{
                    display: "inline-block",
                    opacity: 0,
                    color: "var(--vault-text)",
                    animation: `charStrike 200ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms forwards`,
                  }}
                >
                  {char}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}

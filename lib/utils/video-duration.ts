/**
 * Video duration distribution utility
 *
 * Distributes total video duration across shots respecting
 * Veo 3.1 constraints (only 4, 6, or 8 second clips allowed).
 */

const VEO_ALLOWED_DURATIONS = [4, 6, 8] as const;
type VeoDuration = (typeof VEO_ALLOWED_DURATIONS)[number];

/**
 * Distribute totalSeconds across shotCount clips using only 4/6/8s durations.
 *
 * Strategy:
 * 1. Start with all clips at 4s (minimum)
 * 2. Distribute remaining seconds by upgrading clips to 6s or 8s
 * 3. If total is too short, pad with 4s; if too long, cap at nearest valid total
 *
 * @param shotCount - Number of video clips (typically 3-6)
 * @param totalSeconds - User-requested total duration (20-40s)
 * @returns Array of durations in seconds for each clip
 */
export function distributeVideoDuration(
  shotCount: number,
  totalSeconds: number
): VeoDuration[] {
  if (shotCount <= 0) return [];

  const minTotal = shotCount * 4;
  const maxTotal = shotCount * 8;

  // Clamp to valid range
  const target = Math.max(minTotal, Math.min(maxTotal, totalSeconds));

  // Start all at 4s
  const durations: VeoDuration[] = Array(shotCount).fill(4);
  let remaining = target - minTotal;

  // Distribute remaining seconds, preferring to upgrade earlier clips first
  // First pass: try 6s (upgrade by 2)
  for (let i = 0; i < shotCount && remaining >= 2; i++) {
    durations[i] = 6;
    remaining -= 2;
  }

  // Second pass: try 8s (upgrade from 6 to 8, +2 more)
  for (let i = 0; i < shotCount && remaining >= 2; i++) {
    if (durations[i] === 6) {
      durations[i] = 8;
      remaining -= 2;
    }
  }

  // Third pass: upgrade remaining 4s to 6s if still have budget
  for (let i = 0; i < shotCount && remaining >= 2; i++) {
    if (durations[i] === 4) {
      durations[i] = 6;
      remaining -= 2;
    }
  }

  return durations;
}

/**
 * Calculate the actual total duration from a distribution.
 */
export function totalFromDistribution(durations: number[]): number {
  return durations.reduce((sum, d) => sum + d, 0);
}

/**
 * Get valid total duration range for a given shot count.
 */
export function getDurationRange(shotCount: number): { min: number; max: number } {
  return {
    min: shotCount * 4,
    max: shotCount * 8,
  };
}

/**
 * Format duration distribution for display.
 * e.g., [4, 6, 4, 4, 6, 4] -> "4s + 6s + 4s + 4s + 6s + 4s = 28s"
 */
export function formatDistribution(durations: number[]): string {
  const parts = durations.map((d) => `${d}s`).join(' + ');
  const total = totalFromDistribution(durations);
  return `${parts} = ${total}s`;
}

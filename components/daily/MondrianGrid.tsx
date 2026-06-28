"use client";

import { useRef } from "react";
import { VaultMedia } from "@/lib/daily/types";
import { InteractiveCell } from "./InteractiveCell";

interface PlacedCell {
  colStart: number;
  colEnd: number;
  rowStart: number;
  rowEnd: number;
}

function layout6Mixed(): PlacedCell[] {
  return [
    { colStart: 1, colEnd: 13, rowStart: 1, rowEnd: 6 },
    { colStart: 1, colEnd: 6, rowStart: 6, rowEnd: 12 },
    { colStart: 6, colEnd: 9, rowStart: 6, rowEnd: 10 },
    { colStart: 9, colEnd: 13, rowStart: 6, rowEnd: 10 },
    { colStart: 6, colEnd: 13, rowStart: 10, rowEnd: 18 },
    { colStart: 1, colEnd: 6, rowStart: 12, rowEnd: 18 },
  ];
}

function layout6Portrait(patternIndex: number): PlacedCell[] {
  const patterns: PlacedCell[][] = [
    [
      { colStart: 1, colEnd: 8, rowStart: 1, rowEnd: 10 },
      { colStart: 8, colEnd: 13, rowStart: 1, rowEnd: 5 },
      { colStart: 8, colEnd: 13, rowStart: 5, rowEnd: 10 },
      { colStart: 1, colEnd: 5, rowStart: 10, rowEnd: 16 },
      { colStart: 5, colEnd: 9, rowStart: 10, rowEnd: 16 },
      { colStart: 9, colEnd: 13, rowStart: 10, rowEnd: 16 },
    ],
    [
      { colStart: 1, colEnd: 5, rowStart: 1, rowEnd: 6 },
      { colStart: 5, colEnd: 9, rowStart: 1, rowEnd: 6 },
      { colStart: 9, colEnd: 13, rowStart: 1, rowEnd: 6 },
      { colStart: 1, colEnd: 8, rowStart: 6, rowEnd: 15 },
      { colStart: 8, colEnd: 13, rowStart: 6, rowEnd: 10 },
      { colStart: 8, colEnd: 13, rowStart: 10, rowEnd: 15 },
    ],
    [
      { colStart: 1, colEnd: 6, rowStart: 1, rowEnd: 5 },
      { colStart: 1, colEnd: 6, rowStart: 5, rowEnd: 10 },
      { colStart: 6, colEnd: 13, rowStart: 1, rowEnd: 10 },
      { colStart: 1, colEnd: 5, rowStart: 10, rowEnd: 16 },
      { colStart: 5, colEnd: 9, rowStart: 10, rowEnd: 16 },
      { colStart: 9, colEnd: 13, rowStart: 10, rowEnd: 16 },
    ],
    [
      { colStart: 1, colEnd: 7, rowStart: 1, rowEnd: 8 },
      { colStart: 7, colEnd: 13, rowStart: 1, rowEnd: 8 },
      { colStart: 1, colEnd: 13, rowStart: 8, rowEnd: 12 },
      { colStart: 1, colEnd: 5, rowStart: 12, rowEnd: 17 },
      { colStart: 5, colEnd: 9, rowStart: 12, rowEnd: 17 },
      { colStart: 9, colEnd: 13, rowStart: 12, rowEnd: 17 },
    ],
  ];
  return patterns[patternIndex % patterns.length];
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// 9:16 tall-portrait layouts — exact-AR cell sizes:
//   6col × 8row = exact 9:16  |  3col × 4row = exact 9:16  |  4col × 5row ≈ 9:16 (6% off)
function layout6TallPortrait(patternIndex: number): PlacedCell[] {
  const patterns: PlacedCell[][] = [
    // Pattern 0: 3×2 compact grid
    [
      { colStart: 1,  colEnd: 5,  rowStart: 1,  rowEnd: 6  },
      { colStart: 5,  colEnd: 9,  rowStart: 1,  rowEnd: 6  },
      { colStart: 9,  colEnd: 13, rowStart: 1,  rowEnd: 6  },
      { colStart: 1,  colEnd: 5,  rowStart: 6,  rowEnd: 11 },
      { colStart: 5,  colEnd: 9,  rowStart: 6,  rowEnd: 11 },
      { colStart: 9,  colEnd: 13, rowStart: 6,  rowEnd: 11 },
    ],
    // Pattern 1: 2 large + 4 narrow
    [
      { colStart: 1,  colEnd: 7,  rowStart: 1,  rowEnd: 9  },
      { colStart: 7,  colEnd: 13, rowStart: 1,  rowEnd: 9  },
      { colStart: 1,  colEnd: 4,  rowStart: 9,  rowEnd: 13 },
      { colStart: 4,  colEnd: 7,  rowStart: 9,  rowEnd: 13 },
      { colStart: 7,  colEnd: 10, rowStart: 9,  rowEnd: 13 },
      { colStart: 10, colEnd: 13, rowStart: 9,  rowEnd: 13 },
    ],
    // Pattern 2: 4 narrow + 2 large
    [
      { colStart: 1,  colEnd: 4,  rowStart: 1,  rowEnd: 5  },
      { colStart: 4,  colEnd: 7,  rowStart: 1,  rowEnd: 5  },
      { colStart: 7,  colEnd: 10, rowStart: 1,  rowEnd: 5  },
      { colStart: 10, colEnd: 13, rowStart: 1,  rowEnd: 5  },
      { colStart: 1,  colEnd: 7,  rowStart: 5,  rowEnd: 13 },
      { colStart: 7,  colEnd: 13, rowStart: 5,  rowEnd: 13 },
    ],
    // Pattern 3: asymmetric Mondrian (2 narrow left-top + 1 large right | 1 large left + 2 narrow right-bottom)
    [
      { colStart: 1,  colEnd: 4,  rowStart: 1,  rowEnd: 5  },
      { colStart: 4,  colEnd: 7,  rowStart: 1,  rowEnd: 5  },
      { colStart: 7,  colEnd: 13, rowStart: 1,  rowEnd: 9  },
      { colStart: 1,  colEnd: 7,  rowStart: 5,  rowEnd: 13 },
      { colStart: 7,  colEnd: 10, rowStart: 9,  rowEnd: 13 },
      { colStart: 10, colEnd: 13, rowStart: 9,  rowEnd: 13 },
    ],
  ];
  return patterns[patternIndex % patterns.length];
}

// All-landscape (16:9 or 4:3) layouts — row heights sized for landscape cells
// Base row = vw/12 * 4/3, so landscape cells need fewer rows:
//   full-width 16:9 → 5 rows  |  half-width 16:9 → 3 rows  |  third-width 16:9 → 2 rows
function layout6Landscape(patternIndex: number): PlacedCell[] {
  const patterns: PlacedCell[][] = [
    // hero → 3 equal thirds → 2 halves
    [
      { colStart: 1, colEnd: 13, rowStart: 1,  rowEnd: 6  },
      { colStart: 1, colEnd: 5,  rowStart: 6,  rowEnd: 8  },
      { colStart: 5, colEnd: 9,  rowStart: 6,  rowEnd: 8  },
      { colStart: 9, colEnd: 13, rowStart: 6,  rowEnd: 8  },
      { colStart: 1, colEnd: 7,  rowStart: 8,  rowEnd: 11 },
      { colStart: 7, colEnd: 13, rowStart: 8,  rowEnd: 11 },
    ],
    // 2 halves → hero → 3 equal thirds
    [
      { colStart: 1, colEnd: 7,  rowStart: 1,  rowEnd: 4  },
      { colStart: 7, colEnd: 13, rowStart: 1,  rowEnd: 4  },
      { colStart: 1, colEnd: 13, rowStart: 4,  rowEnd: 9  },
      { colStart: 1, colEnd: 5,  rowStart: 9,  rowEnd: 11 },
      { colStart: 5, colEnd: 9,  rowStart: 9,  rowEnd: 11 },
      { colStart: 9, colEnd: 13, rowStart: 9,  rowEnd: 11 },
    ],
    // 3 equal thirds → 2 halves → hero
    [
      { colStart: 1, colEnd: 5,  rowStart: 1,  rowEnd: 3  },
      { colStart: 5, colEnd: 9,  rowStart: 1,  rowEnd: 3  },
      { colStart: 9, colEnd: 13, rowStart: 1,  rowEnd: 3  },
      { colStart: 1, colEnd: 7,  rowStart: 3,  rowEnd: 6  },
      { colStart: 7, colEnd: 13, rowStart: 3,  rowEnd: 6  },
      { colStart: 1, colEnd: 13, rowStart: 6,  rowEnd: 11 },
    ],
    // even 2×3 grid
    [
      { colStart: 1, colEnd: 7,  rowStart: 1,  rowEnd: 4  },
      { colStart: 7, colEnd: 13, rowStart: 1,  rowEnd: 4  },
      { colStart: 1, colEnd: 7,  rowStart: 4,  rowEnd: 7  },
      { colStart: 7, colEnd: 13, rowStart: 4,  rowEnd: 7  },
      { colStart: 1, colEnd: 7,  rowStart: 7,  rowEnd: 10 },
      { colStart: 7, colEnd: 13, rowStart: 7,  rowEnd: 10 },
    ],
  ];
  return patterns[patternIndex % patterns.length];
}

// 4 portrait/square images — 2×2 grid (6col×6row ≈ 3:4, 7% off for 4:5, fine for 1:1)
function layout4Images(): PlacedCell[] {
  return [
    { colStart: 1, colEnd: 7,  rowStart: 1, rowEnd: 7  },
    { colStart: 7, colEnd: 13, rowStart: 1, rowEnd: 7  },
    { colStart: 1, colEnd: 7,  rowStart: 7, rowEnd: 13 },
    { colStart: 7, colEnd: 13, rowStart: 7, rowEnd: 13 },
  ];
}

// 4 landscape (16:9 or 4:3) images — 2×2 grid with landscape-height cells (6col×3row)
function layout4Landscape(): PlacedCell[] {
  return [
    { colStart: 1, colEnd: 7,  rowStart: 1, rowEnd: 4 },
    { colStart: 7, colEnd: 13, rowStart: 1, rowEnd: 4 },
    { colStart: 1, colEnd: 7,  rowStart: 4, rowEnd: 7 },
    { colStart: 7, colEnd: 13, rowStart: 4, rowEnd: 7 },
  ];
}

// 4 tall-portrait (9:16) images — 4-in-a-row; 3col×4row = exact 9:16 AR
function layout4TallPortrait(): PlacedCell[] {
  return [
    { colStart: 1,  colEnd: 4,  rowStart: 1, rowEnd: 5 },
    { colStart: 4,  colEnd: 7,  rowStart: 1, rowEnd: 5 },
    { colStart: 7,  colEnd: 10, rowStart: 1, rowEnd: 5 },
    { colStart: 10, colEnd: 13, rowStart: 1, rowEnd: 5 },
  ];
}

function layout7Portrait(patternIndex: number): PlacedCell[] {
  const patterns: PlacedCell[][] = [
    [
      { colStart: 1, colEnd: 8, rowStart: 1, rowEnd: 9 },
      { colStart: 8, colEnd: 13, rowStart: 1, rowEnd: 5 },
      { colStart: 8, colEnd: 13, rowStart: 5, rowEnd: 9 },
      { colStart: 1, colEnd: 13, rowStart: 9, rowEnd: 13 },
      { colStart: 1, colEnd: 5, rowStart: 13, rowEnd: 19 },
      { colStart: 5, colEnd: 9, rowStart: 13, rowEnd: 19 },
      { colStart: 9, colEnd: 13, rowStart: 13, rowEnd: 19 },
    ],
    [
      { colStart: 1, colEnd: 5, rowStart: 1, rowEnd: 6 },
      { colStart: 5, colEnd: 9, rowStart: 1, rowEnd: 6 },
      { colStart: 9, colEnd: 13, rowStart: 1, rowEnd: 6 },
      { colStart: 1, colEnd: 7, rowStart: 6, rowEnd: 13 },
      { colStart: 7, colEnd: 13, rowStart: 6, rowEnd: 13 },
      { colStart: 1, colEnd: 7, rowStart: 13, rowEnd: 17 },
      { colStart: 7, colEnd: 13, rowStart: 13, rowEnd: 17 },
    ],
    [
      { colStart: 1, colEnd: 7, rowStart: 1, rowEnd: 8 },
      { colStart: 7, colEnd: 13, rowStart: 1, rowEnd: 8 },
      { colStart: 1, colEnd: 5, rowStart: 8, rowEnd: 12 },
      { colStart: 5, colEnd: 13, rowStart: 8, rowEnd: 15 },
      { colStart: 1, colEnd: 5, rowStart: 12, rowEnd: 15 },
      { colStart: 1, colEnd: 7, rowStart: 15, rowEnd: 20 },
      { colStart: 7, colEnd: 13, rowStart: 15, rowEnd: 20 },
    ],
    [
      { colStart: 1, colEnd: 13, rowStart: 1, rowEnd: 6 },
      { colStart: 1, colEnd: 5, rowStart: 6, rowEnd: 10 },
      { colStart: 5, colEnd: 9, rowStart: 6, rowEnd: 10 },
      { colStart: 9, colEnd: 13, rowStart: 6, rowEnd: 10 },
      { colStart: 1, colEnd: 13, rowStart: 10, rowEnd: 15 },
      { colStart: 1, colEnd: 7, rowStart: 15, rowEnd: 20 },
      { colStart: 7, colEnd: 13, rowStart: 15, rowEnd: 20 },
    ],
  ];
  return patterns[patternIndex % patterns.length];
}

function layout8Portrait(patternIndex: number): PlacedCell[] {
  const patterns: PlacedCell[][] = [
    [
      { colStart: 1, colEnd: 8, rowStart: 1, rowEnd: 8 },
      { colStart: 8, colEnd: 13, rowStart: 1, rowEnd: 4 },
      { colStart: 8, colEnd: 13, rowStart: 4, rowEnd: 8 },
      { colStart: 1, colEnd: 5, rowStart: 8, rowEnd: 11 },
      { colStart: 5, colEnd: 13, rowStart: 8, rowEnd: 15 },
      { colStart: 1, colEnd: 5, rowStart: 11, rowEnd: 15 },
      { colStart: 1, colEnd: 7, rowStart: 15, rowEnd: 20 },
      { colStart: 7, colEnd: 13, rowStart: 15, rowEnd: 20 },
    ],
    [
      { colStart: 1, colEnd: 5, rowStart: 1, rowEnd: 6 },
      { colStart: 5, colEnd: 9, rowStart: 1, rowEnd: 6 },
      { colStart: 9, colEnd: 13, rowStart: 1, rowEnd: 6 },
      { colStart: 1, colEnd: 7, rowStart: 6, rowEnd: 13 },
      { colStart: 7, colEnd: 13, rowStart: 6, rowEnd: 13 },
      { colStart: 1, colEnd: 5, rowStart: 13, rowEnd: 18 },
      { colStart: 5, colEnd: 9, rowStart: 13, rowEnd: 18 },
      { colStart: 9, colEnd: 13, rowStart: 13, rowEnd: 18 },
    ],
    [
      { colStart: 1, colEnd: 5, rowStart: 1, rowEnd: 5 },
      { colStart: 1, colEnd: 5, rowStart: 5, rowEnd: 9 },
      { colStart: 5, colEnd: 13, rowStart: 1, rowEnd: 9 },
      { colStart: 1, colEnd: 8, rowStart: 9, rowEnd: 16 },
      { colStart: 8, colEnd: 13, rowStart: 9, rowEnd: 12 },
      { colStart: 8, colEnd: 13, rowStart: 12, rowEnd: 16 },
      { colStart: 1, colEnd: 7, rowStart: 16, rowEnd: 21 },
      { colStart: 7, colEnd: 13, rowStart: 16, rowEnd: 21 },
    ],
    [
      { colStart: 1, colEnd: 13, rowStart: 1, rowEnd: 6 },
      { colStart: 1, colEnd: 4, rowStart: 6, rowEnd: 10 },
      { colStart: 4, colEnd: 7, rowStart: 6, rowEnd: 10 },
      { colStart: 7, colEnd: 10, rowStart: 6, rowEnd: 10 },
      { colStart: 10, colEnd: 13, rowStart: 6, rowEnd: 10 },
      { colStart: 1, colEnd: 13, rowStart: 10, rowEnd: 15 },
      { colStart: 1, colEnd: 7, rowStart: 15, rowEnd: 20 },
      { colStart: 7, colEnd: 13, rowStart: 15, rowEnd: 20 },
    ],
  ];
  return patterns[patternIndex % patterns.length];
}

function layout9Portrait(): PlacedCell[] {
  return [
    { colStart: 1, colEnd: 8, rowStart: 1, rowEnd: 8 },
    { colStart: 8, colEnd: 13, rowStart: 1, rowEnd: 4 },
    { colStart: 8, colEnd: 13, rowStart: 4, rowEnd: 8 },
    { colStart: 1, colEnd: 5, rowStart: 8, rowEnd: 13 },
    { colStart: 5, colEnd: 9, rowStart: 8, rowEnd: 13 },
    { colStart: 9, colEnd: 13, rowStart: 8, rowEnd: 13 },
    { colStart: 1, colEnd: 5, rowStart: 13, rowEnd: 18 },
    { colStart: 5, colEnd: 9, rowStart: 13, rowEnd: 18 },
    { colStart: 9, colEnd: 13, rowStart: 13, rowEnd: 18 },
  ];
}

function layout10Portrait(): PlacedCell[] {
  return [
    { colStart: 1, colEnd: 7, rowStart: 1, rowEnd: 7 },
    { colStart: 7, colEnd: 13, rowStart: 1, rowEnd: 7 },
    { colStart: 1, colEnd: 4, rowStart: 7, rowEnd: 11 },
    { colStart: 4, colEnd: 7, rowStart: 7, rowEnd: 11 },
    { colStart: 7, colEnd: 10, rowStart: 7, rowEnd: 11 },
    { colStart: 10, colEnd: 13, rowStart: 7, rowEnd: 11 },
    { colStart: 1, colEnd: 4, rowStart: 11, rowEnd: 15 },
    { colStart: 4, colEnd: 7, rowStart: 11, rowEnd: 15 },
    { colStart: 7, colEnd: 10, rowStart: 11, rowEnd: 15 },
    { colStart: 10, colEnd: 13, rowStart: 11, rowEnd: 15 },
  ];
}

function layout11Portrait(): PlacedCell[] {
  return [
    { colStart: 1, colEnd: 8, rowStart: 1, rowEnd: 8 },
    { colStart: 8, colEnd: 13, rowStart: 1, rowEnd: 4 },
    { colStart: 8, colEnd: 13, rowStart: 4, rowEnd: 8 },
    { colStart: 1, colEnd: 4, rowStart: 8, rowEnd: 12 },
    { colStart: 4, colEnd: 7, rowStart: 8, rowEnd: 12 },
    { colStart: 7, colEnd: 10, rowStart: 8, rowEnd: 12 },
    { colStart: 10, colEnd: 13, rowStart: 8, rowEnd: 12 },
    { colStart: 1, colEnd: 4, rowStart: 12, rowEnd: 16 },
    { colStart: 4, colEnd: 7, rowStart: 12, rowEnd: 16 },
    { colStart: 7, colEnd: 10, rowStart: 12, rowEnd: 16 },
    { colStart: 10, colEnd: 13, rowStart: 12, rowEnd: 16 },
  ];
}

function layout12Portrait(): PlacedCell[] {
  return [
    { colStart: 1, colEnd: 5, rowStart: 1, rowEnd: 6 },
    { colStart: 5, colEnd: 9, rowStart: 1, rowEnd: 6 },
    { colStart: 9, colEnd: 13, rowStart: 1, rowEnd: 6 },
    { colStart: 1, colEnd: 7, rowStart: 6, rowEnd: 12 },
    { colStart: 7, colEnd: 13, rowStart: 6, rowEnd: 12 },
    { colStart: 1, colEnd: 4, rowStart: 12, rowEnd: 16 },
    { colStart: 4, colEnd: 7, rowStart: 12, rowEnd: 16 },
    { colStart: 7, colEnd: 10, rowStart: 12, rowEnd: 16 },
    { colStart: 10, colEnd: 13, rowStart: 12, rowEnd: 16 },
    { colStart: 1, colEnd: 5, rowStart: 16, rowEnd: 21 },
    { colStart: 5, colEnd: 9, rowStart: 16, rowEnd: 21 },
    { colStart: 9, colEnd: 13, rowStart: 16, rowEnd: 21 },
  ];
}

function layout13Portrait(): PlacedCell[] {
  return [
    { colStart: 1, colEnd: 8, rowStart: 1, rowEnd: 8 },
    { colStart: 8, colEnd: 13, rowStart: 1, rowEnd: 4 },
    { colStart: 8, colEnd: 13, rowStart: 4, rowEnd: 8 },
    { colStart: 1, colEnd: 4, rowStart: 8, rowEnd: 12 },
    { colStart: 4, colEnd: 7, rowStart: 8, rowEnd: 12 },
    { colStart: 7, colEnd: 10, rowStart: 8, rowEnd: 12 },
    { colStart: 10, colEnd: 13, rowStart: 8, rowEnd: 12 },
    { colStart: 1, colEnd: 5, rowStart: 12, rowEnd: 17 },
    { colStart: 5, colEnd: 9, rowStart: 12, rowEnd: 17 },
    { colStart: 9, colEnd: 13, rowStart: 12, rowEnd: 17 },
    { colStart: 1, colEnd: 5, rowStart: 17, rowEnd: 22 },
    { colStart: 5, colEnd: 9, rowStart: 17, rowEnd: 22 },
    { colStart: 9, colEnd: 13, rowStart: 17, rowEnd: 22 },
  ];
}

function videoPlus8Layout(): PlacedCell[] {
  return [
    { colStart: 1, colEnd: 7, rowStart: 1, rowEnd: 9 },
    { colStart: 7, colEnd: 10, rowStart: 1, rowEnd: 4 },
    { colStart: 10, colEnd: 13, rowStart: 1, rowEnd: 4 },
    { colStart: 7, colEnd: 10, rowStart: 4, rowEnd: 7 },
    { colStart: 10, colEnd: 13, rowStart: 4, rowEnd: 7 },
    { colStart: 7, colEnd: 13, rowStart: 7, rowEnd: 13 },
    { colStart: 1, colEnd: 4, rowStart: 9, rowEnd: 13 },
    { colStart: 4, colEnd: 7, rowStart: 9, rowEnd: 13 },
    { colStart: 1, colEnd: 7, rowStart: 13, rowEnd: 19 },
  ];
}

function videoPlus12Portrait(patternIndex: number): PlacedCell[] {
  const patterns: PlacedCell[][] = [
    // Pattern A: video hero left (7×10 ≈ 3:4) + 3 small right, 3 equal, hero right + 2 small left, 3 equal
    [
      { colStart: 1, colEnd: 8, rowStart: 1, rowEnd: 10 },    // VIDEO 7×9 (≈3:4)
      { colStart: 8, colEnd: 13, rowStart: 1, rowEnd: 4 },    // i1 5×3
      { colStart: 8, colEnd: 13, rowStart: 4, rowEnd: 7 },    // i2 5×3
      { colStart: 8, colEnd: 13, rowStart: 7, rowEnd: 10 },   // i3 5×3
      { colStart: 1, colEnd: 5, rowStart: 10, rowEnd: 15 },   // i4 4×5
      { colStart: 5, colEnd: 9, rowStart: 10, rowEnd: 15 },   // i5 4×5
      { colStart: 9, colEnd: 13, rowStart: 10, rowEnd: 15 },  // i6 4×5
      { colStart: 1, colEnd: 5, rowStart: 15, rowEnd: 18 },   // i7 4×3
      { colStart: 5, colEnd: 13, rowStart: 15, rowEnd: 22 },  // i8 hero 8×7
      { colStart: 1, colEnd: 5, rowStart: 18, rowEnd: 22 },   // i9 4×4
      { colStart: 1, colEnd: 5, rowStart: 22, rowEnd: 27 },   // i10 4×5
      { colStart: 5, colEnd: 9, rowStart: 22, rowEnd: 27 },   // i11 4×5
      { colStart: 9, colEnd: 13, rowStart: 22, rowEnd: 27 },  // i12 4×5
    ],
    // Pattern B: 3 equal, video hero (7×9) + 2 small, 4 equal, hero left + 2 small right, 2 equal bottom
    [
      { colStart: 1, colEnd: 5, rowStart: 1, rowEnd: 6 },
      { colStart: 5, colEnd: 9, rowStart: 1, rowEnd: 6 },
      { colStart: 9, colEnd: 13, rowStart: 1, rowEnd: 6 },
      { colStart: 1, colEnd: 8, rowStart: 6, rowEnd: 15 },    // VIDEO 7×9
      { colStart: 8, colEnd: 13, rowStart: 6, rowEnd: 10 },
      { colStart: 8, colEnd: 13, rowStart: 10, rowEnd: 15 },
      { colStart: 1, colEnd: 4, rowStart: 15, rowEnd: 19 },
      { colStart: 4, colEnd: 7, rowStart: 15, rowEnd: 19 },
      { colStart: 7, colEnd: 10, rowStart: 15, rowEnd: 19 },
      { colStart: 10, colEnd: 13, rowStart: 15, rowEnd: 19 },
      { colStart: 1, colEnd: 7, rowStart: 19, rowEnd: 25 },   // i10 hero 6×6
      { colStart: 7, colEnd: 13, rowStart: 19, rowEnd: 22 },  // i11 6×3
      { colStart: 7, colEnd: 13, rowStart: 22, rowEnd: 25 },  // i12 6×3
    ],
    // Pattern C: full video (12×8 ≈ 3:2 crop acceptable for full-width), 4 equal, 2 hero, 3 equal, 2 equal
    [
      { colStart: 1, colEnd: 13, rowStart: 1, rowEnd: 8 },    // VIDEO full 12×7
      { colStart: 1, colEnd: 4, rowStart: 8, rowEnd: 12 },
      { colStart: 4, colEnd: 7, rowStart: 8, rowEnd: 12 },
      { colStart: 7, colEnd: 10, rowStart: 8, rowEnd: 12 },
      { colStart: 10, colEnd: 13, rowStart: 8, rowEnd: 12 },
      { colStart: 1, colEnd: 7, rowStart: 12, rowEnd: 19 },
      { colStart: 7, colEnd: 13, rowStart: 12, rowEnd: 19 },
      { colStart: 1, colEnd: 5, rowStart: 19, rowEnd: 24 },
      { colStart: 5, colEnd: 9, rowStart: 19, rowEnd: 24 },
      { colStart: 9, colEnd: 13, rowStart: 19, rowEnd: 24 },
      { colStart: 1, colEnd: 7, rowStart: 24, rowEnd: 29 },
      { colStart: 7, colEnd: 13, rowStart: 24, rowEnd: 29 },
      { colStart: 1, colEnd: 13, rowStart: 29, rowEnd: 34 },
    ],
    // Pattern D: 2 hero top, video (8×9 ≈ 3:4) + 2 small, 3 equal, full wide, 3 equal
    [
      { colStart: 1, colEnd: 7, rowStart: 1, rowEnd: 8 },
      { colStart: 7, colEnd: 13, rowStart: 1, rowEnd: 8 },
      { colStart: 1, colEnd: 5, rowStart: 8, rowEnd: 12 },
      { colStart: 5, colEnd: 13, rowStart: 8, rowEnd: 17 },   // VIDEO 8×9 (≈3:4)
      { colStart: 1, colEnd: 5, rowStart: 12, rowEnd: 17 },
      { colStart: 1, colEnd: 5, rowStart: 17, rowEnd: 22 },
      { colStart: 5, colEnd: 9, rowStart: 17, rowEnd: 22 },
      { colStart: 9, colEnd: 13, rowStart: 17, rowEnd: 22 },
      { colStart: 1, colEnd: 13, rowStart: 22, rowEnd: 26 },
      { colStart: 1, colEnd: 5, rowStart: 26, rowEnd: 31 },
      { colStart: 5, colEnd: 9, rowStart: 26, rowEnd: 31 },
      { colStart: 9, colEnd: 13, rowStart: 26, rowEnd: 31 },
      { colStart: 1, colEnd: 13, rowStart: 31, rowEnd: 36 },
    ],
  ];
  return patterns[patternIndex % patterns.length];
}

function rowSpanForAspect(aspect: string, colSpan: number): number {
  const [w, h] = aspect.split(":").map(Number);
  return Math.round(colSpan * (3 * h) / (4 * w));
}

function layoutMondrian(media: { aspect: string; type: string }[]): PlacedCell[] {
  const placements: PlacedCell[] = [];
  let row = 1;
  let i = 0;

  const splits: [number, number][] = [
    [5, 7], [7, 5], [4, 8], [8, 4], [5, 7], [7, 5],
  ];
  const tripleSplits: [number, number, number][] = [
    [4, 4, 4], [3, 5, 4], [5, 3, 4], [4, 5, 3],
  ];

  let splitIdx = 0;

  const nextSplit = (): [number, number] => {
    const s = splits[splitIdx % splits.length];
    splitIdx++;
    return s;
  };

  const nextTriple = (): [number, number, number] => {
    const s = tripleSplits[splitIdx % tripleSplits.length];
    splitIdx++;
    return s;
  };

  const isLandscape = (aspect: string) => aspect === "16:9" || aspect === "4:3";

  while (i < media.length) {
    const remaining = media.length - i;

    // Two consecutive landscape images → pair side by side (avoids wasteful full-width + tiny pair)
    if (remaining >= 2 && isLandscape(media[i].aspect) && isLandscape(media[i + 1]?.aspect)) {
      const spanA = rowSpanForAspect(media[i].aspect, 6);
      const spanB = rowSpanForAspect(media[i + 1].aspect, 6);
      const sharedSpan = Math.max(spanA, spanB);
      placements.push({ colStart: 1, colEnd: 7,  rowStart: row, rowEnd: row + sharedSpan });
      placements.push({ colStart: 7, colEnd: 13, rowStart: row, rowEnd: row + sharedSpan });
      row += sharedSpan;
      i += 2;
      continue;
    }

    // Single landscape followed by portrait images → full-width landscape as hero, then pair below
    if (remaining >= 3 && isLandscape(media[i].aspect)) {
      const spanWide = rowSpanForAspect(media[i].aspect, 12);
      placements.push({ colStart: 1, colEnd: 13, rowStart: row, rowEnd: row + spanWide });
      row += spanWide;

      const [lc, rc] = nextSplit();
      const spanB = rowSpanForAspect(media[i + 1].aspect, lc);
      const spanC = rowSpanForAspect(media[i + 2].aspect, rc);
      placements.push({ colStart: 1, colEnd: 1 + lc, rowStart: row, rowEnd: row + spanB });
      placements.push({ colStart: 1 + lc, colEnd: 13, rowStart: row, rowEnd: row + spanC });
      row += Math.max(spanB, spanC);
      i += 3;
      continue;
    }

    if (remaining >= 3) {
      const [c1, c2, c3] = nextTriple();
      const s1 = rowSpanForAspect(media[i].aspect, c1);
      const s2 = rowSpanForAspect(media[i + 1].aspect, c2);
      const s3 = rowSpanForAspect(media[i + 2].aspect, c3);
      const sharedSpan = Math.max(s1, s2, s3);

      placements.push({ colStart: 1, colEnd: 1 + c1, rowStart: row, rowEnd: row + sharedSpan });
      placements.push({ colStart: 1 + c1, colEnd: 1 + c1 + c2, rowStart: row, rowEnd: row + sharedSpan });
      placements.push({ colStart: 1 + c1 + c2, colEnd: 13, rowStart: row, rowEnd: row + sharedSpan });
      row += sharedSpan;
      i += 3;
      continue;
    }

    if (remaining >= 2) {
      const [lc, rc] = nextSplit();
      const spanA = rowSpanForAspect(media[i].aspect, lc);
      const spanB = rowSpanForAspect(media[i + 1].aspect, rc);
      const sharedSpan = Math.max(spanA, spanB);
      placements.push({ colStart: 1, colEnd: 1 + lc, rowStart: row, rowEnd: row + sharedSpan });
      placements.push({ colStart: 1 + lc, colEnd: 13, rowStart: row, rowEnd: row + sharedSpan });
      row += sharedSpan;
      i += 2;
      continue;
    }

    const spanA = rowSpanForAspect(media[i].aspect, 12);
    const singleSpan = Math.max(spanA, 3);
    placements.push({ colStart: 1, colEnd: 13, rowStart: row, rowEnd: row + singleSpan });
    row += singleSpan;
    i += 1;
  }

  return placements;
}

interface MondrianGridProps {
  media: (VaultMedia & { locationId: string })[];
  collectionId?: string;
  onImageClick: (media: VaultMedia & { locationId: string }) => void;
  onVideoClick: (src: string) => void;
}

export function MondrianGrid({ media, collectionId, onImageClick, onVideoClick }: MondrianGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  const hasVideo = media.some((m) => m.type === "video");
  const imageCount = media.filter((m) => m.type === "image").length;

  const aspects = media.map(m => m.aspect);
  const is6Mixed = media.length === 6 &&
    aspects.filter(a => a === "16:9").length === 1 &&
    aspects.filter(a => a === "9:16").length === 1;

  const is6Portrait = !hasVideo && media.length === 6 &&
    aspects.every(a => a === "3:4" || a === "4:5");

  const is6TallPortrait = !hasVideo && media.length === 6 &&
    aspects.every(a => a === "9:16");

  const is6Landscape = !hasVideo && media.length === 6 &&
    aspects.every(a => a === "16:9" || a === "4:3");

  let placements: PlacedCell[];
  if (is6Portrait) {
    const patternIdx = hashString(collectionId || 'default') % 4;
    placements = layout6Portrait(patternIdx);
  } else if (is6TallPortrait) {
    const patternIdx = hashString(collectionId || 'default') % 4;
    placements = layout6TallPortrait(patternIdx);
  } else if (is6Landscape) {
    const patternIdx = hashString(collectionId || 'default') % 4;
    placements = layout6Landscape(patternIdx);
  } else if (is6Mixed) {
    placements = layout6Mixed();
  } else if (hasVideo && imageCount === 12) {
    const patternIdx = hashString(collectionId || 'default') % 4;
    placements = videoPlus12Portrait(patternIdx);
  } else if (hasVideo && imageCount === 8) {
    placements = videoPlus8Layout();
  } else if (!hasVideo && imageCount === 7 && aspects.every(a => a === "3:4")) {
    const patternIdx = hashString(collectionId || 'default') % 4;
    placements = layout7Portrait(patternIdx);
  } else if (!hasVideo && imageCount === 8 && aspects.every(a => a === "3:4")) {
    const patternIdx = hashString(collectionId || 'default') % 4;
    placements = layout8Portrait(patternIdx);
  } else if (!hasVideo && imageCount === 9) {
    placements = layout9Portrait();
  } else if (!hasVideo && imageCount === 10) {
    placements = layout10Portrait();
  } else if (!hasVideo && imageCount === 11) {
    placements = layout11Portrait();
  } else if (!hasVideo && imageCount === 12) {
    placements = layout12Portrait();
  } else if (!hasVideo && imageCount === 13) {
    placements = layout13Portrait();
  } else if (hasVideo && imageCount >= 8 && imageCount <= 12) {
    const videoRows = 12;
    const rightImages = Math.min(2, imageCount);
    const belowImages = imageCount - rightImages;

    const topPlacements: PlacedCell[] = [
      { colStart: 1, colEnd: 7, rowStart: 1, rowEnd: videoRows + 1 },
      { colStart: 7, colEnd: 13, rowStart: 1, rowEnd: 7 },
    ];
    if (rightImages >= 2) {
      topPlacements.push({ colStart: 7, colEnd: 13, rowStart: 7, rowEnd: videoRows + 1 });
    }

    const belowPlacements: PlacedCell[] = [];
    let belowRow = videoRows + 1;
    let remaining = belowImages;
    while (remaining > 0) {
      const cols = remaining >= 4 ? 4 : remaining >= 3 ? 3 : remaining;
      const colWidth = Math.floor(12 / cols);
      for (let c = 0; c < cols; c++) {
        belowPlacements.push({
          colStart: c * colWidth + 1,
          colEnd: c === cols - 1 ? 13 : (c + 1) * colWidth + 1,
          rowStart: belowRow,
          rowEnd: belowRow + 5,
        });
      }
      belowRow += 5;
      remaining -= cols;
    }

    placements = [...topPlacements, ...belowPlacements];
  } else if (!hasVideo && imageCount === 4) {
    if (aspects.every(a => a === "9:16"))
      placements = layout4TallPortrait();
    else if (aspects.every(a => a === "16:9" || a === "4:3"))
      placements = layout4Landscape();
    else
      placements = layout4Images(); // portrait family (3:4, 4:5, 1:1)
  } else {
    placements = layoutMondrian(media.map((m) => ({ aspect: m.aspect, type: m.type })));
  }

  const maxRow = Math.max(...placements.map((p) => p.rowEnd)) - 1;

  return (
    <div
      ref={gridRef}
      className="grid gap-[2px]"
      style={{
        gridTemplateColumns: "repeat(12, 1fr)",
        gridTemplateRows: `repeat(${maxRow}, calc(100vw / 12 * 4 / 3))`,
      }}
    >
      {media.map((item, i) => {
        const p = placements[i % placements.length];
        const isVideo = item.type === "video";

        return (
          <InteractiveCell
            key={i}
            item={item}
            isVideo={isVideo}
            style={{
              gridColumn: `${p.colStart} / ${p.colEnd}`,
              gridRow: `${p.rowStart} / ${p.rowEnd}`,
            }}
            onImageClick={() => onImageClick(item)}
            onVideoClick={() => onVideoClick(item.file)}
          />
        );
      })}
    </div>
  );
}

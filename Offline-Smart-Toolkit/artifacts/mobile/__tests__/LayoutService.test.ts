// ────────────────────────────────────────────────────────────────────────────
// Deterministic unit tests for lib/printTools/LayoutService
// Run with: npx tsx __tests__/LayoutService.test.ts
// ────────────────────────────────────────────────────────────────────────────
import assert from 'node:assert/strict';
import {
  calculateMultiCopiesLayout,
  calculatePassportLayout,
  calculateA4Layout,
  PAPER_SIZES,
  PHOTO_TYPES,
} from '../lib/printTools/LayoutService';

const A4 = PAPER_SIZES['A4']; // 210 × 297 mm

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (e: any) {
    console.error(`  ✗  ${name}`);
    console.error(`     ${e?.message ?? e}`);
    failed++;
  }
}

// ── calculateMultiCopiesLayout ────────────────────────────────────────────────

console.log('\ncalculateMultiCopiesLayout – grid shape');

// Expected grids on A4 portrait paper (210×297mm, margin=10, gap=3).
// Score = area / (1 + |ln(cellW/cellH)|) penalises extreme aspect ratios,
// avoiding single-row/single-column strips.  Portrait paper is taller than
// wide, so balanced grids have more rows than columns for small counts.
const gridCases: Array<[number, number, number]> = [
  // [count, expectedCols, expectedRows]
  [1,  1, 1],
  [2,  1, 2],   // portrait A4: stacking gives larger near-square cells than side-by-side
  [4,  2, 2],   // 2×2 square
  [6,  2, 3],   // 2 cols × 3 rows — cells near-square on portrait A4
  [9,  3, 3],   // 3×3 square
  [12, 3, 4],   // 3 cols × 4 rows — cells near-square on portrait A4
  [16, 4, 4],   // 4×4 — must NOT produce a single-row 16×1 strip
  [7,  2, 4],   // non-square: 2 cols × 4 rows (last row partial, cells near-square)
];

for (const [count, expectedCols, expectedRows] of gridCases) {
  test(`count=${count} → ${expectedCols} cols × ${expectedRows} rows`, () => {
    const result = calculateMultiCopiesLayout(A4, count);
    assert.equal(result.cols, expectedCols,
      `Expected cols=${expectedCols}, got ${result.cols}`);
    assert.equal(result.rows, expectedRows,
      `Expected rows=${expectedRows}, got ${result.rows}`);
  });
}

test('all cells have positive dimensions', () => {
  for (const count of [1, 2, 4, 6, 9, 12, 16, 7]) {
    const result = calculateMultiCopiesLayout(A4, count);
    for (const cell of result.cells) {
      assert.ok(cell.width > 0, `cell.width=${cell.width} not positive (count=${count})`);
      assert.ok(cell.height > 0, `cell.height=${cell.height} not positive (count=${count})`);
    }
  }
});

test('cell count equals requested count', () => {
  for (const count of [1, 3, 5, 7, 11, 16]) {
    const result = calculateMultiCopiesLayout(A4, count);
    assert.equal(result.cells.length, count,
      `Expected ${count} cells, got ${result.cells.length}`);
  }
});

test('no cell exceeds paper boundaries', () => {
  const margin = 10;
  const gap = 3;
  const result = calculateMultiCopiesLayout(A4, 9, margin, gap);
  for (const cell of result.cells) {
    assert.ok(cell.x >= margin - 0.01);
    assert.ok(cell.y >= margin - 0.01);
    assert.ok(cell.x + cell.width <= A4.width - margin + 0.01,
      `cell overflows right: x=${cell.x}, w=${cell.width}`);
    assert.ok(cell.y + cell.height <= A4.height - margin + 0.01,
      `cell overflows bottom: y=${cell.y}, h=${cell.height}`);
  }
});

// ── calculatePassportLayout ───────────────────────────────────────────────────

console.log('\ncalculatePassportLayout');

const passport = PHOTO_TYPES['passport']; // 35 × 45 mm

const passportCases: Array<[number, number, number]> = [
  [2,  2, 1],
  [4,  2, 2],
  [6,  3, 2],
  [8,  4, 2],
  [12, 4, 3],
];

for (const [count, cols, rows] of passportCases) {
  test(`count=${count} → ${cols} cols × ${rows} rows`, () => {
    const result = calculatePassportLayout(A4, passport, count as any);
    assert.equal(result.cols, cols);
    assert.equal(result.rows, rows);
    assert.equal(result.cells.length, count);
  });
}

test('all cells have passport photo dimensions', () => {
  const result = calculatePassportLayout(A4, passport, 4);
  for (const cell of result.cells) {
    assert.ok(Math.abs(cell.width - passport.width) < 0.01,
      `Expected width≈${passport.width}, got ${cell.width}`);
    assert.ok(Math.abs(cell.height - passport.height) < 0.01,
      `Expected height≈${passport.height}, got ${cell.height}`);
  }
});

// ── calculateA4Layout ─────────────────────────────────────────────────────────

console.log('\ncalculateA4Layout');

const baseOptions = {
  paperSize: 'A4' as const,
  orientation: 'portrait' as const,
  fitToPage: false,
  autoCenter: false,
  scale: 1,
  margin: 10,
};

test('scale=1 preserves natural image dimensions', () => {
  const result = calculateA4Layout(100, 80, baseOptions);
  assert.ok(Math.abs(result.imageWidth - 100) < 0.01, `imageWidth=${result.imageWidth}`);
  assert.ok(Math.abs(result.imageHeight - 80) < 0.01, `imageHeight=${result.imageHeight}`);
});

test('fitToPage scales down oversized image to fit within margins', () => {
  const result = calculateA4Layout(300, 400, { ...baseOptions, fitToPage: true });
  assert.ok(result.imageWidth <= A4.width - 20 + 0.01, `imageWidth=${result.imageWidth}`);
  assert.ok(result.imageHeight <= A4.height - 20 + 0.01, `imageHeight=${result.imageHeight}`);
  assert.ok(result.scale < 1, `Expected scale<1, got ${result.scale}`);
});

test('autoCenter places image centre at paper centre', () => {
  const result = calculateA4Layout(100, 80, { ...baseOptions, autoCenter: true });
  const centreX = result.imageX + result.imageWidth / 2;
  const centreY = result.imageY + result.imageHeight / 2;
  assert.ok(Math.abs(centreX - A4.width / 2) < 0.5,
    `centreX=${centreX}, expected ${A4.width / 2}`);
  assert.ok(Math.abs(centreY - A4.height / 2) < 0.5,
    `centreY=${centreY}, expected ${A4.height / 2}`);
});

test('landscape orientation swaps paper width and height', () => {
  const portrait = calculateA4Layout(50, 50, baseOptions);
  const landscape = calculateA4Layout(50, 50, { ...baseOptions, orientation: 'landscape' });
  assert.equal(landscape.paperWidth, portrait.paperHeight);
  assert.equal(landscape.paperHeight, portrait.paperWidth);
});

// ── summary ───────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);

// Pure-JS percentage calculation — 100% offline, no external deps.

export type PercentageMode =
  | 'percentage-of'      // X% of Y
  | 'marks'              // obtained/total → %
  | 'increase'           // old → new  percentage increase
  | 'decrease';          // old → new  percentage decrease

export interface PercentageResult {
  label: string;
  value: string;
  formula: string;
}

/** Returns null if inputs are invalid (non-numeric / div by zero). */
export function calcPercentageOf(
  percent: number,
  total: number,
): PercentageResult | null {
  if (isNaN(percent) || isNaN(total)) return null;
  const result = (percent / 100) * total;
  return {
    label: `${percent}% of ${total}`,
    value: formatNum(result),
    formula: `(${percent} ÷ 100) × ${total} = ${formatNum(result)}`,
  };
}

export function calcMarksPercentage(
  obtained: number,
  total: number,
): PercentageResult | null {
  if (isNaN(obtained) || isNaN(total) || total === 0) return null;
  const result = (obtained / total) * 100;
  return {
    label: `Marks Percentage`,
    value: `${formatNum(result)}%`,
    formula: `(${obtained} ÷ ${total}) × 100 = ${formatNum(result)}%`,
  };
}

export function calcPercentageIncrease(
  original: number,
  newValue: number,
): PercentageResult | null {
  if (isNaN(original) || isNaN(newValue) || original === 0) return null;
  const result = ((newValue - original) / Math.abs(original)) * 100;
  const isIncrease = result >= 0;
  return {
    label: isIncrease ? 'Percentage Increase' : 'Percentage Decrease',
    value: `${isIncrease ? '+' : ''}${formatNum(result)}%`,
    formula: `((${newValue} − ${original}) ÷ |${original}|) × 100 = ${formatNum(result)}%`,
  };
}

export function calcPercentageDecrease(
  original: number,
  newValue: number,
): PercentageResult | null {
  if (isNaN(original) || isNaN(newValue) || original === 0) return null;
  const result = ((original - newValue) / Math.abs(original)) * 100;
  const isDecrease = result >= 0;
  return {
    label: isDecrease ? 'Percentage Decrease' : 'Percentage Increase',
    value: `${isDecrease ? '-' : '+'}${formatNum(Math.abs(result))}%`,
    formula: `((${original} − ${newValue}) ÷ |${original}|) × 100 = ${formatNum(result)}%`,
  };
}

/** Add GST / percentage to a base amount */
export function calcAddPercent(
  base: number,
  percent: number,
): PercentageResult | null {
  if (isNaN(base) || isNaN(percent)) return null;
  const added = (percent / 100) * base;
  const total = base + added;
  return {
    label: `${base} + ${percent}%`,
    value: formatNum(total),
    formula: `${base} + (${percent}% × ${base}) = ${formatNum(base)} + ${formatNum(added)} = ${formatNum(total)}`,
  };
}

/** Subtract percentage from base amount */
export function calcSubtractPercent(
  base: number,
  percent: number,
): PercentageResult | null {
  if (isNaN(base) || isNaN(percent)) return null;
  const removed = (percent / 100) * base;
  const total = base - removed;
  return {
    label: `${base} − ${percent}%`,
    value: formatNum(total),
    formula: `${base} − (${percent}% × ${base}) = ${formatNum(base)} − ${formatNum(removed)} = ${formatNum(total)}`,
  };
}

function formatNum(n: number): string {
  if (!isFinite(n)) return '—';
  // Up to 4 decimal places, trailing zeros stripped
  return parseFloat(n.toFixed(4)).toString();
}

export function formatCopyText(result: PercentageResult): string {
  return [
    `Percentage Calculator — CSC Smart Toolkit`,
    `${result.label}: ${result.value}`,
    `Formula: ${result.formula}`,
  ].join('\n');
}

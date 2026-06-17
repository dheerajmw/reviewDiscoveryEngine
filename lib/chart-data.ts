export function frequencyToChartData(
  data: Record<string, { count: number; pct: number }>,
) {
  return Object.entries(data)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([name, { count, pct }]) => ({
      name,
      count,
      pct,
      label: `${name} (${pct}%)`,
    }));
}

export const CHART_COLORS = [
  "#4648d4",
  "#6063ee",
  "#575992",
  "#bdbefe",
  "#b55d00",
  "#c7c4d7",
];

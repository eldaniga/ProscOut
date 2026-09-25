export const ACTIVITY_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
  "#ec4899",
  "#64748b",
] as const;

export const DEFAULT_ACTIVITY_COLOR = ACTIVITY_COLORS[0];

export function isActivityColor(value: string): boolean {
  return (ACTIVITY_COLORS as readonly string[]).includes(value);
}

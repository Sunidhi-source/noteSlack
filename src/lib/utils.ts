import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns initials from a full name (e.g. "John Doe" → "JD")
 */
export function getInitials(name: string): string {
  if (!name || !name.trim()) return "?"; // ✅ guard
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const COLORS = [
  "#6c63ff", // indigo
  "#22c986", // emerald
  "#f5a623", // amber
  "#ff4d6a", // rose
  "#3b82f6", // blue
  "#a855f7", // purple
  "#14b8a6", // teal
  "#f97316", // orange
  "#ec4899", // pink
  "#84cc16", // lime
];

export function generateUserColor(seed: string): string {
  if (!seed) return COLORS[0]; // ✅ guard against undefined/empty
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return COLORS[hash % COLORS.length];
}

/**
 * Human-readable relative time (e.g. "3 minutes ago", "yesterday")
 */
export function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return ""; // ✅ guard
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return "";
  }
}

export function truncate(str: string, maxLen: number): string {
  if (!str) return ""; // ✅ guard
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "…";
}

export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
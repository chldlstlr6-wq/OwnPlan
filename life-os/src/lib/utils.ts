import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateShort(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

export function getDaysUntil(deadline: string | Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(deadline);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getDDayText(deadline: string | Date): string {
  const days = getDaysUntil(deadline);
  if (days === 0) return "D-Day";
  if (days > 0) return `D-${days}`;
  return `D+${Math.abs(days)}`;
}

export function getIntervalLabel(interval: string): string {
  const labels: Record<string, string> = {
    day: "매일",
    week: "매주",
    month: "매월",
    quarter: "분기별",
    half: "반기별",
    year: "연간",
  };
  return labels[interval] || interval;
}

export function isOverdue(deadline: string | Date): boolean {
  return getDaysUntil(deadline) < 0;
}

export function isUrgent(deadline: string | Date, threshold: number = 3): boolean {
  const days = getDaysUntil(deadline);
  return days >= 0 && days <= threshold;
}

// Returns a local date key in YYYY-MM-DD (local timezone)
export function getDateKey(date: Date | string = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : new Date(date.getTime());
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

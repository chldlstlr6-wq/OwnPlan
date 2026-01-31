"use client";

import { cn, getIntervalLabel } from "@/lib/utils";
import { Habit } from "@/types";
import { Card } from "../ui";

interface HabitCardProps {
  habit: Habit;
  isDue: boolean;
  intervalDaysText?: string;
  onComplete?: (id: string) => void;
  onEdit?: (habit: Habit) => void;
  onDelete?: (id: string) => void;
}

export default function HabitCard({
  habit,
  isDue,
  intervalDaysText,
  onComplete,
  onEdit,
  onDelete,
}: HabitCardProps) {
  return (
    <Card variant="outlined" className={cn(!isDue && "border-l-4 border-l-indigo-500")}>
      <div className="flex items-start gap-3">
        {isDue ? (
          <button
            onClick={() => onComplete?.(habit.id)}
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all"
          >
            <svg
              className="w-5 h-5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="9" strokeWidth={2} />
            </svg>
          </button>
        ) : (
          <button
            onClick={() => onComplete?.(habit.id)}
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-indigo-500 hover:bg-indigo-600 shadow-sm"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        )}

        <div className="flex-1 min-w-0" onClick={() => onEdit?.(habit)}>
          <p className={cn("text-slate-900 font-medium", isDue && "text-slate-400")}>
            {habit.title}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {getIntervalLabel(habit.interval_type)}
            </span>
            {intervalDaysText && (
              <span className="text-xs text-slate-400">{intervalDaysText}</span>
            )}
            {habit.last_done_date && (
              <span className="text-xs text-slate-400">
                최근:{" "}
                {new Date(habit.last_done_date).toLocaleDateString("ko-KR", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
        </div>

        {onDelete && (
          <button
            onClick={() => onDelete(habit.id)}
            className="flex-shrink-0 p-1 text-slate-300 hover:text-red-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>
    </Card>
  );
}

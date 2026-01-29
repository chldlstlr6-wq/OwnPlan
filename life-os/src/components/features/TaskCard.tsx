"use client";

import { cn, getDDayText, isOverdue, isUrgent } from "@/lib/utils";
import { Task } from "@/types";
import { Card } from "../ui";

interface TaskCardProps {
  task: Task;
  onToggle?: (id: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
  showComment?: boolean;
  compact?: boolean;
}

export default function TaskCard({ task, onToggle, onEdit, onDelete, showComment = true, compact = false }: TaskCardProps) {
  const isCompleted = task.status === "completed";
  const overdue = task.deadline && !isCompleted ? isOverdue(task.deadline) : false;
  const urgent = task.deadline && !isCompleted ? isUrgent(task.deadline) : false;

  return (
    <Card
      variant="outlined"
      className={cn(
        "transition-all",
        isCompleted && "opacity-50 bg-slate-50"
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.(task.id);
          }}
          className={cn(
            "flex-shrink-0 w-6 h-6 mt-0.5 rounded-full border-2 transition-all",
            isCompleted
              ? "bg-indigo-500 border-indigo-500"
              : "border-slate-300 hover:border-indigo-500"
          )}
        >
          {isCompleted && (
            <svg className="w-full h-full text-white p-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit?.(task)}>
          <p className={cn(
            "text-slate-900 font-medium",
            isCompleted && "line-through text-slate-400"
          )}>
            {task.title}
          </p>

          {showComment && task.comment && !compact && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
              {task.comment}
            </p>
          )}

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {task.category && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {task.category}
              </span>
            )}
            {task.deadline && !isCompleted && (
              <span className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full",
                overdue ? "bg-red-100 text-red-600" :
                urgent ? "bg-amber-100 text-amber-600" :
                "bg-slate-100 text-slate-600"
              )}>
                {getDDayText(task.deadline)}
              </span>
            )}
            {isCompleted && task.completed_at && (
              <span className="text-xs text-slate-400">
                {new Date(task.completed_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })} 완료
              </span>
            )}
          </div>
        </div>

        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="flex-shrink-0 p-1 text-slate-300 hover:text-red-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </Card>
  );
}

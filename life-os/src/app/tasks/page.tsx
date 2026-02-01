"use client";

import { useState, useMemo } from "react";
import { BottomNavigation, PageHeader } from "@/components/layout";
import { TaskCard } from "@/components/features";
import { Button, BottomSheet, Input, Card } from "@/components/ui";
import { Task } from "@/types";
import { cn, getDaysUntil } from "@/lib/utils";
import { useTasks } from "@/hooks/useTasks";

type SortType = "deadline" | "category" | "created";

export default function TasksPage() {
  const { tasks, addTask, updateTask, deleteTask, toggleTask, isLoaded } = useTasks();
  const [sortBy, setSortBy] = useState<SortType>("deadline");
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({
    title: "",
    category: "",
    deadline: "",
    comment: "",
  });

  const COMPLETED_PREVIEW_COUNT = 3;

  const { pendingTasks, completedTasks } = useMemo(() => {
    // Tasks 페이지에서는 캘린더 이벤트(isEvent===true)를 제외한 마감형 할 일만 다룸
    const nonEventTasks = tasks.filter((t) => !t.isEvent);
    const pending = nonEventTasks.filter((t) => t.status === "pending");
    const completed = nonEventTasks.filter((t) => t.status === "completed");

    const sortFn = (a: Task, b: Task) => {
      if (sortBy === "deadline") {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return getDaysUntil(a.deadline) - getDaysUntil(b.deadline);
      }
      if (sortBy === "category") {
        const catA = a.category || "zzz";
        const catB = b.category || "zzz";
        return catA.localeCompare(catB);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    };

    pending.sort(sortFn);
    completed.sort((a, b) => {
      const dateA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
      const dateB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
      return dateB - dateA;
    });

    return { pendingTasks: pending, completedTasks: completed };
  }, [tasks, sortBy]);

  const handleToggle = (id: string) => {
    toggleTask(id);
  };

  const handleDelete = (id: string) => {
    deleteTask(id);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      category: task.category || "",
      deadline: task.deadline ? task.deadline.split("T")[0] : "",
      comment: task.comment || "",
    });
    setIsAddSheetOpen(true);
  };

  const handleSave = async () => {
    if (!newTask.title.trim()) return;

    if (editingTask) {
      await updateTask(editingTask.id, {
        title: newTask.title,
        category: newTask.category || null,
        deadline: newTask.deadline || null,
        comment: newTask.comment || null,
      });
    } else {
      await addTask({
        user_id: "",
        title: newTask.title,
        deadline: newTask.deadline || null,
        status: "pending",
        category: newTask.category || null,
        comment: newTask.comment || null,
        isEvent: false,
        completed_at: null,
      });
    }

    resetForm();
  };

  const resetForm = () => {
    setNewTask({ title: "", category: "", deadline: "", comment: "" });
    setEditingTask(null);
    setIsAddSheetOpen(false);
  };

  const sortOptions: { key: SortType; label: string }[] = [
    { key: "deadline", label: "마감일순" },
    { key: "category", label: "카테고리순" },
    { key: "created", label: "등록순" },
  ];

  const displayedCompleted = showAllCompleted
    ? completedTasks
    : completedTasks.slice(0, COMPLETED_PREVIEW_COUNT);
  const hasMoreCompleted = completedTasks.length > COMPLETED_PREVIEW_COUNT;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <PageHeader
        title="할 일"
        subtitle={isLoaded ? `${pendingTasks.length}개 진행중` : "로딩 중..."}
        action={
          <Button size="sm" onClick={() => setIsAddSheetOpen(true)}>
            + 추가
          </Button>
        }
      />

      <main className="px-4 space-y-6">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {sortOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                sortBy === opt.key
                  ? "bg-indigo-500 text-white shadow-sm"
                  : "bg-white text-slate-500 hover:bg-slate-100"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">진행중</h2>
          {pendingTasks.length > 0 ? (
            <div className="space-y-2">
              {pendingTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={handleToggle}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <Card className="text-center py-8">
              <p className="text-slate-400">진행중인 할 일이 없습니다</p>
              <Button
                variant="ghost"
                className="mt-2"
                onClick={() => setIsAddSheetOpen(true)}
              >
                + 새 할 일 추가하기
              </Button>
            </Card>
          )}
        </section>

        {completedTasks.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">
              완료 <span className="text-slate-400 font-normal">({completedTasks.length})</span>
            </h2>
            <div className="space-y-2">
              {displayedCompleted.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={handleToggle}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  showComment={false}
                />
              ))}
            </div>
            {hasMoreCompleted && (
              <button
                onClick={() => setShowAllCompleted(!showAllCompleted)}
                className="w-full mt-3 py-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors font-medium"
              >
                {showAllCompleted
                  ? "접기"
                  : `더보기 (+${completedTasks.length - COMPLETED_PREVIEW_COUNT})`}
              </button>
            )}
          </section>
        )}
      </main>

      <BottomSheet
        isOpen={isAddSheetOpen}
        onClose={resetForm}
        title={editingTask ? "할 일 수정" : "새 할 일 추가"}
      >
        <div className="space-y-4">
          <Input
            label="할 일"
            placeholder="할 일을 입력하세요"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
          />
          <Input
            label="카테고리"
            placeholder="업무, 개인 등 (선택)"
            value={newTask.category}
            onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
          />
          <Input
            type="date"
            label="마감일"
            value={newTask.deadline}
            onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              메모 (선택)
            </label>
            <textarea
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              rows={3}
              placeholder="간단한 메모를 남겨보세요"
              value={newTask.comment}
              onChange={(e) => setNewTask({ ...newTask, comment: e.target.value })}
            />
          </div>
          <div className="pt-2 flex gap-2">
            {editingTask && (
              <Button variant="secondary" className="flex-1" onClick={resetForm}>
                취소
              </Button>
            )}
            <Button className="flex-1" onClick={handleSave}>
              {editingTask ? "저장" : "추가하기"}
            </Button>
          </div>
        </div>
      </BottomSheet>

      <BottomNavigation />
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { BottomNavigation, PageHeader } from "@/components/layout";
import { CalendarWidget, TaskCard } from "@/components/features";
import { Card, Button, BottomSheet, Input } from "@/components/ui";
import { Task } from "@/types";
import { formatDate, cn, getDateKey } from "@/lib/utils";
import { useHabits } from "@/hooks/useHabits";
import { getStoredTasks, saveTasks } from "@/lib/storage";
import { useAuthContext } from "@/components/providers/AuthProvider";

// Mock data
const initialTasks: Task[] = [
  {
    id: "1",
    user_id: "user1",
    title: "프로젝트 기획서 제출",
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: "pending",
    category: "업무",
    comment: "팀장님께 먼저 검토 요청",
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    user_id: "user1",
    title: "팀 미팅",
    deadline: new Date().toISOString(),
    status: "pending",
    category: "업무",
    comment: "회의실 3층 A",
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "3",
    user_id: "user1",
    title: "치과 예약",
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: "pending",
    category: "개인",
    comment: null,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function CalendarPage() {
  const { user } = useAuthContext();
  const userId = user?.id;
  const [tasks, setTasks] = useState<Task[]>(() => getStoredTasks(initialTasks, userId));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { habits, toggleHabit, getHabitCompletionStatus, isLoaded } = useHabits();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({
    title: "",
    category: "",
    comment: "",
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const markedDates = tasks
    .filter((task) => task.deadline)
    .map((task) => getDateKey(new Date(task.deadline!)));

  const tasksForSelectedDate = tasks.filter((task) => {
    if (!task.deadline) return false;
    const taskDate = getDateKey(new Date(task.deadline!));
    const selected = getDateKey(selectedDate);
    return taskDate === selected;
  });

  const handleToggle = (id: string) => {
    setTasks((prev) => {
      const updated = prev.map((task) =>
        task.id === id
          ? ({
              ...task,
              status: (task.status === "completed" ? "pending" : "completed") as "pending" | "completed",
              completed_at: task.status === "completed" ? null : new Date().toISOString(),
            } as Task)
          : task
      );
      saveTasks(updated, userId);
      return updated;
    });
  };

  const handleDelete = (id: string) => {
    setTasks((prev) => {
      const updated = prev.filter((task) => task.id !== id);
      saveTasks(updated, userId);
      return updated;
    });
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      category: task.category || "",
      comment: task.comment || "",
    });
    setIsAddSheetOpen(true);
  };

  const handleSave = () => {
    if (!newTask.title.trim()) return;

    if (editingTask) {
      setTasks((prev) => {
        const updated = prev.map((task) =>
          task.id === editingTask.id
            ? {
                ...task,
                title: newTask.title,
                category: newTask.category || null,
                comment: newTask.comment || null,
              }
            : task
        );
        saveTasks(updated, userId);
        return updated;
      });
    } else {
      const task: Task = {
        id: Date.now().toString(),
        user_id: userId || "",
        title: newTask.title,
        deadline: selectedDate.toISOString(),
        status: "pending",
        category: newTask.category || null,
        comment: newTask.comment || null,
        isEvent: true,
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setTasks((prev) => {
        const updated = [task, ...prev];
        saveTasks(updated, userId);
        return updated;
      });
    }

    resetForm();
  };

  const resetForm = () => {
    setNewTask({ title: "", category: "", comment: "" });
    setEditingTask(null);
    setIsAddSheetOpen(false);
  };

  const openAddSheet = () => {
    setEditingTask(null);
    setNewTask({ title: "", category: "", comment: "" });
    setIsAddSheetOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <PageHeader
        title="캘린더"
        subtitle={formatDate(selectedDate)}
        action={
          <Button size="sm" onClick={openAddSheet}>
            + 추가
          </Button>
        }
      />

      <main className="px-4 space-y-6">
        <CalendarWidget
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          markedDates={markedDates}
          habits={habits}
        />

        {/* 오늘의 루틴 달성 상태 */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            {formatDate(selectedDate)} 루틴
          </h2>
          
          {isLoaded && habits.length > 0 ? (
            <div className="space-y-3">
              {habits.map((habit) => {
                const dateStr = getDateKey(selectedDate);
                const isCompleted = getHabitCompletionStatus(habit.id, dateStr);
                
                // 해당 날짜에 이 루틴이 실행되어야 하는지 확인
                const today = selectedDate.getDay();
                const todayDate = selectedDate.getDate();
                const todayMonth = selectedDate.getMonth() + 1;
                
                const shouldRunToday = 
                  (habit.interval_type === "day") ||
                  (habit.interval_type === "week" && habit.interval_days?.includes(today)) ||
                  (habit.interval_type === "month" && habit.interval_days?.includes(todayDate)) ||
                  (habit.interval_type === "quarter" && habit.interval_days?.includes(todayMonth)) ||
                  (habit.interval_type === "half" && habit.interval_days?.includes(todayMonth));
                
                if (!shouldRunToday) return null;
                
                // 상태별 색상 결정
                let statusColor = "gray"; // 기본 (실행 대상 아님)
                let statusText = "예정";
                let dotColor = "bg-gray-300";
                
                if (isCompleted) {
                  statusColor = "green";
                  statusText = "완료";
                  dotColor = "bg-green-500";
                } else {
                  // 미완료 상태 - interval_type에 따라 색상 결정
                  if (habit.interval_type === "day") {
                    statusColor = "yellow";
                    statusText = "미완료";
                    dotColor = "bg-yellow-400";
                  } else if (habit.interval_type === "week") {
                    statusColor = "orange";
                    statusText = "미완료";
                    dotColor = "bg-orange-400";
                  } else {
                    statusColor = "red";
                    statusText = "미완료";
                    dotColor = "bg-red-400";
                  }
                }
                
                return (
                  <button
                    key={habit.id}
                    onClick={() => toggleHabit(habit.id, dateStr)}
                    className="w-full text-left"
                  >
                    <Card variant="outlined" className="flex items-center gap-3 hover:bg-slate-100 transition-colors cursor-pointer">
                      <div className={cn("w-3 h-3 rounded-full flex-shrink-0", dotColor)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-900 font-medium truncate">{habit.title}</p>
                        <p className="text-xs text-slate-400">{statusText}</p>
                      </div>
                      <div className={cn(
                        "text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0",
                        isCompleted 
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      )}>
                        {isCompleted ? "✓" : "○"}
                      </div>
                    </Card>
                  </button>
                );
              })}
            </div>
          ) : !isLoaded ? (
            <Card className="text-center py-4">
              <p className="text-slate-400">로딩 중...</p>
            </Card>
          ) : (
            <Card className="text-center py-4">
              <p className="text-slate-400">루틴이 없습니다</p>
            </Card>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {formatDate(selectedDate)} 일정
            </h2>
            <span className="text-sm text-slate-400">
              {isMounted ? `${tasksForSelectedDate.length}개` : "-"}
            </span>
          </div>
          {isMounted ? (
            tasksForSelectedDate.length > 0 ? (
              <div className="space-y-2">
                {tasksForSelectedDate.map((task) => (
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
                <p className="text-slate-400">이 날짜에 일정이 없습니다</p>
                <Button
                  variant="ghost"
                  className="mt-2"
                  onClick={openAddSheet}
                >
                  + 일정 추가하기
                </Button>
              </Card>
            )
          ) : (
            <Card className="text-center py-6">
              <p className="text-slate-400">로딩 중...</p>
            </Card>
          )}
        </section>
      </main>

      <BottomSheet
        isOpen={isAddSheetOpen}
        onClose={resetForm}
        title={editingTask ? "일정 수정" : `${formatDate(selectedDate)} 일정 추가`}
      >
        <div className="space-y-4">
          <Input
            label="일정 제목"
            placeholder="일정을 입력하세요"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
          />
          <Input
            label="카테고리"
            placeholder="업무, 개인 등 (선택)"
            value={newTask.category}
            onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
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

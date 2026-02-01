"use client";

import { useState, useEffect } from "react";
import { BottomNavigation, PageHeader } from "@/components/layout";
import { CalendarWidget, TaskCard } from "@/components/features";
import { Card, Button, BottomSheet, Input } from "@/components/ui";
import { Task } from "@/types";
import { formatDate, cn, getDateKey } from "@/lib/utils";
import { useHabits } from "@/hooks/useHabits";
import { useTasks } from "@/hooks/useTasks";

export default function CalendarPage() {
  const { tasks, addTask, updateTask, deleteTask, toggleTask, isLoaded: tasksLoaded } = useTasks();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { habits, toggleHabit, getHabitCompletionStatus, isLoaded: habitsLoaded } = useHabits();
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

  const selected = getDateKey(selectedDate);

  // 일정 (isEvent === true)
  const eventsForSelectedDate = tasks.filter((task) => {
    if (!task.deadline || !task.isEvent) return false;
    return getDateKey(new Date(task.deadline!)) === selected;
  });

  // 할 일 (isEvent !== true)
  const deadlineTasksForSelectedDate = tasks.filter((task) => {
    if (!task.deadline || task.isEvent) return false;
    return getDateKey(new Date(task.deadline!)) === selected;
  });

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
        comment: newTask.comment || null,
      });
    } else {
      await addTask({
        user_id: "",
        title: newTask.title,
        deadline: selectedDate.toISOString(),
        status: "pending",
        category: newTask.category || null,
        comment: newTask.comment || null,
        isEvent: true,
        completed_at: null,
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

          {habitsLoaded && habits.length > 0 ? (
            <div className="space-y-3">
              {habits.map((habit) => {
                const dateStr = getDateKey(selectedDate);
                const isCompleted = getHabitCompletionStatus(habit.id, dateStr);

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

                let statusText = "예정";
                let dotColor = "bg-gray-300";

                if (isCompleted) {
                  statusText = "완료";
                  dotColor = "bg-green-500";
                } else {
                  if (habit.interval_type === "day") {
                    statusText = "미완료";
                    dotColor = "bg-yellow-400";
                  } else if (habit.interval_type === "week") {
                    statusText = "미완료";
                    dotColor = "bg-orange-400";
                  } else {
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
          ) : !habitsLoaded ? (
            <Card className="text-center py-4">
              <p className="text-slate-400">로딩 중...</p>
            </Card>
          ) : (
            <Card className="text-center py-4">
              <p className="text-slate-400">루틴이 없습니다</p>
            </Card>
          )}
        </section>

        {/* 일정 (isEvent=true) */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {formatDate(selectedDate)} 일정
            </h2>
            <span className="text-sm text-slate-400">
              {isMounted && tasksLoaded ? `${eventsForSelectedDate.length}개` : "-"}
            </span>
          </div>
          {isMounted && tasksLoaded ? (
            eventsForSelectedDate.length > 0 ? (
              <div className="space-y-2">
                {eventsForSelectedDate.map((task) => (
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

        {/* 마감 할 일 (isEvent=false) */}
        {isMounted && tasksLoaded && deadlineTasksForSelectedDate.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-900">
                {formatDate(selectedDate)} 마감 할 일
              </h2>
              <span className="text-sm text-slate-400">
                {deadlineTasksForSelectedDate.length}개
              </span>
            </div>
            <div className="space-y-2">
              {deadlineTasksForSelectedDate.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={handleToggle}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </section>
        )}
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

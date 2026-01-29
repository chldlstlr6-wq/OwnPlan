"use client";

import { useState } from "react";
import { BottomNavigation, PageHeader } from "@/components/layout";
import { CalendarWidget, TaskCard } from "@/components/features";
import { Card, Button, BottomSheet, Input } from "@/components/ui";
import { Task } from "@/types";
import { formatDate } from "@/lib/utils";

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
  },
];

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({
    title: "",
    category: "",
    comment: "",
  });

  const markedDates = tasks
    .filter((task) => task.deadline)
    .map((task) => new Date(task.deadline!).toISOString().split("T")[0]);

  const tasksForSelectedDate = tasks.filter((task) => {
    if (!task.deadline) return false;
    const taskDate = new Date(task.deadline).toISOString().split("T")[0];
    const selected = selectedDate.toISOString().split("T")[0];
    return taskDate === selected;
  });

  const handleToggle = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
              ...task,
              status: task.status === "completed" ? "pending" : "completed",
              completed_at: task.status === "completed" ? null : new Date().toISOString(),
            }
          : task
      )
    );
  };

  const handleDelete = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
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
      setTasks((prev) =>
        prev.map((task) =>
          task.id === editingTask.id
            ? {
                ...task,
                title: newTask.title,
                category: newTask.category || null,
                comment: newTask.comment || null,
              }
            : task
        )
      );
    } else {
      const task: Task = {
        id: Date.now().toString(),
        user_id: "user1",
        title: newTask.title,
        deadline: selectedDate.toISOString(),
        status: "pending",
        category: newTask.category || null,
        comment: newTask.comment || null,
        completed_at: null,
        created_at: new Date().toISOString(),
      };
      setTasks((prev) => [task, ...prev]);
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
        />

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {formatDate(selectedDate)} 일정
            </h2>
            <span className="text-sm text-slate-400">
              {tasksForSelectedDate.length}개
            </span>
          </div>

          {tasksForSelectedDate.length > 0 ? (
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

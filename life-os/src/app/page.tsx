"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { BottomNavigation, PageHeader } from "@/components/layout";
import { TaskCard } from "@/components/features";
import { Task, Habit } from "@/types";
import { getDaysUntil, getIntervalLabel } from "@/lib/utils";
import Link from "next/link";

// Mock data - will be replaced with Supabase
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
    title: "치과 예약",
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: "pending",
    category: "개인",
    comment: null,
    completed_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "t1",
    user_id: "user1",
    title: "오전 팀 미팅",
    deadline: new Date().toISOString(),
    status: "completed",
    category: "업무",
    comment: "회의실 3층 A",
    completed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: "t2",
    user_id: "user1",
    title: "점심 약속",
    deadline: new Date().toISOString(),
    status: "pending",
    category: "개인",
    comment: "강남역 2번 출구",
    completed_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "t3",
    user_id: "user1",
    title: "코드 리뷰",
    deadline: new Date().toISOString(),
    status: "pending",
    category: "업무",
    comment: null,
    completed_at: null,
    created_at: new Date().toISOString(),
  },
];

const mockHabits: Habit[] = [
  {
    id: "1",
    user_id: "user1",
    title: "운동하기",
    interval_type: "day",
    interval_days: undefined,
    last_done_date: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    user_id: "user1",
    title: "독서 30분",
    interval_type: "day",
    interval_days: undefined,
    last_done_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    created_at: new Date().toISOString(),
  },
];

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const today = new Date();
  const greeting = getGreeting();

  // 오늘 일정 (완료된 건 숨기거나 흐리게)
  const todaysTasks = tasks.filter((task) => {
    if (!task.deadline) return false;
    const taskDate = new Date(task.deadline).toISOString().split("T")[0];
    const todayDate = today.toISOString().split("T")[0];
    return taskDate === todayDate;
  });

  const pendingTodayTasks = todaysTasks.filter((t) => t.status === "pending");
  const completedTodayTasks = todaysTasks.filter((t) => t.status === "completed");

  // 긴급 할 일 (3일 이내)
  const urgentTasks = tasks.filter(
    (task) => task.deadline && getDaysUntil(task.deadline) <= 3 && getDaysUntil(task.deadline) > 0 && task.status !== "completed"
  );

  // 오늘의 루틴
  const todayHabits = mockHabits.filter((habit) => habit.interval_type === "day");

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

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <PageHeader
        title={greeting}
        subtitle={today.toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "long",
        })}
      />

      <main className="px-4 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
            <div className="text-2xl font-bold">{pendingTodayTasks.length}</div>
            <div className="text-xs text-indigo-100 mt-0.5">오늘 일정</div>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white">
            <div className="text-2xl font-bold">{urgentTasks.length}</div>
            <div className="text-xs text-amber-100 mt-0.5">긴급 할 일</div>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
            <div className="text-2xl font-bold">{todayHabits.length}</div>
            <div className="text-xs text-emerald-100 mt-0.5">오늘 루틴</div>
          </Card>
        </div>

        {/* Today's Schedule */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-900">오늘 일정</h2>
            <Link href="/calendar" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              캘린더
            </Link>
          </div>
          {pendingTodayTasks.length > 0 ? (
            <div className="space-y-2">
              {pendingTodayTasks.map((task) => (
                <TaskCard key={task.id} task={task} onToggle={handleToggle} compact />
              ))}
            </div>
          ) : (
            <Card className="text-center py-6 bg-white">
              <p className="text-slate-400">오늘 예정된 일정이 없습니다</p>
            </Card>
          )}
          {completedTodayTasks.length > 0 && (
            <div className="mt-2 space-y-2">
              {completedTodayTasks.map((task) => (
                <TaskCard key={task.id} task={task} onToggle={handleToggle} compact showComment={false} />
              ))}
            </div>
          )}
        </section>

        {/* Urgent Tasks Section */}
        {urgentTasks.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-900">긴급 할 일</h2>
              <Link href="/tasks" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                전체보기
              </Link>
            </div>
            <div className="space-y-2">
              {urgentTasks.slice(0, 3).map((task) => (
                <TaskCard key={task.id} task={task} onToggle={handleToggle} />
              ))}
            </div>
          </section>
        )}

        {/* Today's Habits Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-900">오늘의 루틴</h2>
            <Link href="/habits" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              전체보기
            </Link>
          </div>
          {todayHabits.length > 0 ? (
            <div className="space-y-2">
              {todayHabits.map((habit) => (
                <Card key={habit.id} variant="outlined" className="flex items-center gap-3">
                  <button className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shadow-sm">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <div className="flex-1">
                    <p className="text-slate-900 font-medium">{habit.title}</p>
                    <p className="text-xs text-slate-400">{getIntervalLabel(habit.interval_type)}</p>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-6 bg-white">
              <p className="text-slate-400">오늘 완료할 루틴이 없습니다</p>
            </Card>
          )}
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">빠른 실행</h2>
          <div className="grid grid-cols-4 gap-3">
            <Link href="/tasks" className="flex flex-col items-center p-3 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-xs text-slate-600 font-medium">할 일</span>
            </Link>
            <Link href="/calendar" className="flex flex-col items-center p-3 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs text-slate-600 font-medium">일정</span>
            </Link>
            <Link href="/habits" className="flex flex-col items-center p-3 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <span className="text-xs text-slate-600 font-medium">루틴</span>
            </Link>
            <Link href="/portfolio" className="flex flex-col items-center p-3 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-xs text-slate-600 font-medium">자산</span>
            </Link>
          </div>
        </section>
      </main>

      <BottomNavigation />
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "좋은 새벽이에요";
  if (hour < 12) return "좋은 아침이에요";
  if (hour < 18) return "좋은 오후에요";
  return "좋은 저녁이에요";
}

"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui";
import { BottomNavigation, PageHeader } from "@/components/layout";
import { TaskCard, HabitCard } from "@/components/features";
import { Task, Habit } from "@/types";
import { getDaysUntil, getIntervalLabel } from "@/lib/utils";
import { useHabits } from "@/hooks/useHabits";
import Link from "next/link";
import { getStoredTasks, saveTasks, getStoredPortfolio } from "@/lib/storage";
import { initialPortfolio as portfolioInitial } from "@/app/portfolio/constants";

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

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>(() => getStoredTasks(initialTasks));
  const { habits, toggleHabit, isLoaded } = useHabits();
  const today = new Date();
  const greeting = getGreeting();
  const [portfolio] = useState<any[]>(() => getStoredPortfolio(portfolioInitial || []));
  const [isMounted, setIsMounted] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 환율 가져오기 (USD -> KRW)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/exchange');
        const data = await res.json();
        if (mounted && data?.usd_krw) setExchangeRate(Number(data.usd_krw));
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  // 리로드: 다른 페이지(캘린더)에서 로컬스토리지 변경 후 돌아왔을 때 반영
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === undefined) {
        // global change, reload
        setTasks(getStoredTasks(initialTasks));
      } else if (e.key === "ownplan_tasks") {
        setTasks(getStoredTasks(initialTasks));
      }
    };

    const onFocus = () => setTasks(getStoredTasks(initialTasks));

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // 오늘 일정 (완료된 건 숨기거나 흐리게)
  // todayEvents: 캘린더에서 추가한 '그 날만 실행하는 일정' (isEvent===true)
  const todayEvents = tasks.filter((task) => {
    if (!task.deadline) return false;
    if (!task.isEvent) return false;
    const taskDate = new Date(task.deadline).toISOString().split("T")[0];
    const todayDate = today.toISOString().split("T")[0];
    return taskDate === todayDate;
  });

  // 하루짜리 이벤트(오늘 일정)
  const pendingTodayEvents = todayEvents.filter((t) => t.status === "pending");
  const completedTodayEvents = todayEvents.filter((t) => t.status === "completed");

  // 긴급 할 일: Tasks 페이지에서 생성된 마감형 할 일(isEvent===false) 중 3일 이내인 것
  const urgentTasks = tasks.filter(
    (task) =>
      !task.isEvent &&
      task.deadline &&
      getDaysUntil(task.deadline) <= 3 &&
      task.status !== "completed"
  );

  // 오늘의 루틴 (미완료된 루틴만, 일일/주간/월간)
  const todayHabits = habits.filter((habit) => {
    const now = new Date();
    const today = now.getDay();
    const todayDate = now.getDate();
    const todayStr = now.toISOString().split("T")[0];
    
    // 오늘 이미 완료한 루틴은 제외
    if (habit.last_done_date === todayStr) return false;
    
    // 일일 루틴
    if (habit.interval_type === "day") return true;
    
    // 주간 루틴 (오늘 요일이 포함된 경우)
    if (habit.interval_type === "week" && habit.interval_days?.includes(today)) return true;
    
    // 월간 루틴 (오늘 날짜가 포함된 경우)
    if (habit.interval_type === "month" && habit.interval_days?.includes(todayDate)) return true;
    
    return false;
  });

  const handleToggle = (id: string) => {
    setTasks((prev) => {
      const updated = prev.map((task) =>
        task.id === id
          ? {
              ...task,
              status: (task.status === "completed" ? "pending" : "completed") as 'pending' | 'completed',
              completed_at: task.status === "completed" ? null : new Date().toISOString(),
            }
          : task
      );
      saveTasks(updated);
      return updated;
    });
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
            <div className="text-2xl font-bold">{isMounted ? pendingTodayEvents.length : "-"}</div>
            <div className="text-xs text-indigo-100 mt-0.5">오늘 일정</div>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white">
            <div className="text-2xl font-bold">{isMounted ? urgentTasks.length : "-"}</div>
            <div className="text-xs text-amber-100 mt-0.5">긴급 할 일</div>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
            <div className="text-2xl font-bold">{isMounted ? todayHabits.length : "-"}</div>
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
          {isMounted ? (
            pendingTodayEvents.length > 0 ? (
              <div className="space-y-2">
                {pendingTodayEvents.map((task) => (
                  <TaskCard key={task.id} task={task} onToggle={handleToggle} compact />
                ))}
              </div>
            ) : (
              <Card className="text-center py-6 bg-white">
                <p className="text-slate-400">오늘 예정된 일정이 없습니다</p>
              </Card>
            )
          ) : (
            <Card className="text-center py-6 bg-white">
              <p className="text-slate-400">로딩 중...</p>
            </Card>
          )}
          {isMounted && completedTodayEvents.length > 0 && (
            <div className="mt-2 space-y-2">
              {completedTodayEvents.map((task) => (
                <TaskCard key={task.id} task={task} onToggle={handleToggle} compact showComment={false} />
              ))}
            </div>
          )}
        </section>

        {/* Urgent Tasks Section */}
        {isMounted && urgentTasks.length > 0 && (
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
          {isLoaded && todayHabits.length > 0 ? (
            <div className="space-y-2">
              {todayHabits.map((habit) => (
                <HabitCard 
                  key={habit.id} 
                  habit={habit} 
                  isDue={true}
                  onComplete={toggleHabit}
                />
              ))}
            </div>
          ) : !isLoaded ? (
            <Card className="text-center py-6 bg-white">
              <p className="text-slate-400">로딩 중...</p>
            </Card>
          ) : (
            <Card className="text-center py-6 bg-white">
              <p className="text-slate-400">오늘 완료할 루틴이 없습니다</p>
            </Card>
          )}
        </section>

        {/* Asset Quick Card (연동된 간단 자산 요약) */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">나의 자산</h2>
          <div className="grid grid-cols-1">
            <Link href="/portfolio">
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-500">포트폴리오 요약</div>
                          <div className="text-xl font-semibold text-slate-900 mt-1">{isMounted ? `${portfolio.length} 종목` : "-"}</div>
                          <div className="text-xs text-slate-400">계좌 수: {isMounted ? new Set((portfolio || []).map(p => p.account_id)).size : "-"}</div>
                          {isMounted && exchangeRate ? (
                            (() => {
                              const CASH_TICKER = "__CASH__";
                              const totalKRW = (portfolio || []).reduce((sum: number, item: any) => {
                                if (item.ticker === CASH_TICKER) {
                                  return sum + (item.market === 'US' ? (Number(item.avg_price) || 0) * exchangeRate : (Number(item.avg_price) || 0));
                                }
                                const price = Number(item.current_price || item.avg_price) || 0;
                                const value = price * (Number(item.current_quantity) || 0);
                                return sum + (item.market === 'US' ? value * exchangeRate : value);
                              }, 0);

                              const totalCostKRW = (portfolio || []).reduce((sum: number, item: any) => {
                                if (item.ticker === CASH_TICKER) {
                                  return sum + (item.market === 'US' ? (Number(item.avg_price) || 0) * exchangeRate : (Number(item.avg_price) || 0));
                                }
                                const cost = (Number(item.avg_price) || 0) * (Number(item.current_quantity) || 0);
                                return sum + (item.market === 'US' ? cost * exchangeRate : cost);
                              }, 0);

                              const profitKRW = totalCostKRW > 0 ? totalKRW - totalCostKRW : 0;
                              const overallPct = totalCostKRW > 0 ? (profitKRW / totalCostKRW) * 100 : 0;

                              // top 3 tickers by value
                              const tickerMap = new Map<string, { name: string; value: number; profitPct: number }>();
                              for (const item of portfolio || []) {
                                if (item.ticker === CASH_TICKER) continue;
                                const priceNow = Number(item.current_price || item.avg_price) || 0;
                                const valueKRW = (item.market === 'US' ? priceNow * exchangeRate : priceNow) * (Number(item.current_quantity) || 0);
                                const avgKRW = (item.market === 'US' ? Number(item.avg_price || 0) * exchangeRate : Number(item.avg_price || 0));
                                const profitPct = avgKRW > 0 ? ((priceNow - Number(item.avg_price || 0)) / Number(item.avg_price || 0)) * 100 : 0;
                                const existing = tickerMap.get(item.ticker) || { name: item.name || item.ticker, value: 0, profitPct };
                                existing.value += valueKRW;
                                existing.profitPct = profitPct;
                                tickerMap.set(item.ticker, existing);
                              }
                              const top3 = [...tickerMap.entries()]
                                .map(([ticker, v]) => ({ ticker, name: v.name, value: v.value, profitPct: v.profitPct }))
                                .sort((a, b) => b.value - a.value)
                                .slice(0, 3);

                              return (
                                <div className="mt-2 space-y-1">
                                  <div className="text-sm text-slate-400">총평가액</div>
                                  <div className="font-semibold text-slate-900">{formatKRW(totalKRW)}</div>
                                  <div className="text-xs text-slate-500">전체 수익률 {overallPct >= 0 ? '+' : ''}{overallPct.toFixed(2)}%</div>
                                  <div className="mt-2 text-xs text-slate-600">
                                    {top3.map((t) => (
                                      <div key={t.ticker} className="flex justify-between">
                                        <span>{t.name}</span>
                                        <span className={t.profitPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{t.profitPct >= 0 ? '+' : ''}{t.profitPct.toFixed(2)}%</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()
                          ) : null}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-500">현금</div>
                    <div className="text-lg font-medium text-slate-800 mt-1">{isMounted ? formatCash(portfolio) : "-"}</div>
                  </div>
                </div>
              </Card>
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

function formatCash(portfolio: any[]): string {
  if (!portfolio || portfolio.length === 0) return "₩0";
  const cashItems = (portfolio || []).filter((p) => p.ticker === "__CASH__" || p.name === "현금");
  if (cashItems.length === 0) return "₩0";
  const krwSum = cashItems
    .filter((c) => c.market === "KR")
    .reduce((s, c) => s + (Number(c.avg_price) || 0), 0);
  const usdSum = cashItems
    .filter((c) => c.market === "US")
    .reduce((s, c) => s + (Number(c.avg_price) || 0), 0);
  if (usdSum > 0 && krwSum === 0) return `$${usdSum.toLocaleString()}`;
  if (krwSum > 0 && usdSum === 0) return `₩${krwSum.toLocaleString()}`;
  return `₩${krwSum.toLocaleString()} + $${usdSum.toLocaleString()}`;
}

function formatKRW(value: number | null): string {
  if (value == null) return "-";
  return `₩${Math.round(value).toLocaleString()}`;
}

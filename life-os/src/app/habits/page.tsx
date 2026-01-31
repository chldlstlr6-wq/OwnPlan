"use client";

import { useState } from "react";
import { BottomNavigation, PageHeader } from "@/components/layout";
import { HabitCard } from "@/components/features";
import { Button, BottomSheet, Input, Card } from "@/components/ui";
import { Habit, IntervalType } from "@/types";
import { cn, getIntervalLabel } from "@/lib/utils";
import { useHabits } from "@/hooks/useHabits";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const intervalTypes: IntervalType[] = ["day", "week", "month", "quarter", "half", "year"];

export default function HabitsPage() {
  const { habits, toggleHabit, addHabit, deleteHabit, isLoaded } = useHabits();
  const [filterInterval, setFilterInterval] = useState<IntervalType | "all">("all");
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [newHabit, setNewHabit] = useState({
    title: "",
    interval_type: "day" as IntervalType,
    interval_days: [] as number[],
  });

  const filteredHabits = habits.filter((habit) => {
    if (filterInterval === "all") return true;
    return habit.interval_type === filterInterval;
  });

  const isHabitDue = (habit: Habit): boolean => {
    const now = new Date();
    const today = now.getDay();
    const todayDate = now.getDate();

    if (habit.interval_type === "week" && habit.interval_days?.length) {
      if (!habit.interval_days.includes(today)) return false;
    }
    if (habit.interval_type === "month" && habit.interval_days?.length) {
      if (!habit.interval_days.includes(todayDate)) return false;
    }

    if (!habit.last_done_date) return true;

    const lastDone = new Date(habit.last_done_date);
    const diffDays = Math.floor((now.getTime() - lastDone.getTime()) / (1000 * 60 * 60 * 24));

    switch (habit.interval_type) {
      case "day":
        return diffDays >= 1;
      case "week":
        return diffDays >= 1;
      case "month":
        return diffDays >= 1;
      case "quarter":
        return diffDays >= 90;
      case "half":
        return diffDays >= 180;
      case "year":
        return diffDays >= 365;
      default:
        return true;
    }
  };

  const handleAddHabit = () => {
    if (!newHabit.title.trim()) return;

    const habit: Habit = {
      id: Date.now().toString(),
      user_id: "user1",
      title: newHabit.title,
      interval_type: newHabit.interval_type,
      interval_days: newHabit.interval_days.length > 0 ? newHabit.interval_days : undefined,
      last_done_date: null,
      completion_records: {},
      created_at: new Date().toISOString(),
    };

    addHabit(habit);
    resetForm();
  };

  const resetForm = () => {
    setNewHabit({ title: "", interval_type: "day", interval_days: [] });
    setIsAddSheetOpen(false);
  };

  const toggleIntervalDay = (day: number) => {
    setNewHabit((prev) => ({
      ...prev,
      interval_days: prev.interval_days.includes(day)
        ? prev.interval_days.filter((d) => d !== day)
        : [...prev.interval_days, day].sort((a, b) => a - b),
    }));
  };

  const getIntervalDaysText = (habit: Habit): string => {
    if (!habit.interval_days?.length) return "";
    if (habit.interval_type === "week") {
      return habit.interval_days.map((d) => WEEKDAYS[d]).join(", ");
    }
    if (habit.interval_type === "month") {
      return habit.interval_days.map((d) => `${d}일`).join(", ");
    }
    if (habit.interval_type === "quarter") {
      return `분기: ${habit.interval_days.map((m) => `${m}월`).join(", ")}`;
    }
    if (habit.interval_type === "half") {
      return `반기: ${habit.interval_days.map((m) => `${m}월`).join(", ")}`;
    }
    return "";
  };

  const dueHabits = filteredHabits.filter(isHabitDue);
  const notDueHabits = filteredHabits.filter((h) => !isHabitDue(h));

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <PageHeader
        title="루틴 관리"
        subtitle={`${dueHabits.length}개 실행 필요`}
        action={
          <Button size="sm" onClick={() => setIsAddSheetOpen(true)}>
            + 추가
          </Button>
        }
      />

      <main className="px-4 space-y-6">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
          <button
            onClick={() => setFilterInterval("all")}
            className={cn(
              "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all",
              filterInterval === "all"
                ? "bg-indigo-500 text-white shadow-sm"
                : "bg-white text-slate-500 hover:bg-slate-100"
            )}
          >
            전체
          </button>
          {intervalTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilterInterval(type)}
              className={cn(
                "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all",
                filterInterval === type
                  ? "bg-indigo-500 text-white shadow-sm"
                  : "bg-white text-slate-500 hover:bg-slate-100"
              )}
            >
              {getIntervalLabel(type)}
            </button>
          ))}
        </div>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">실행 필요</h2>
          {isLoaded && dueHabits.length > 0 ? (
            <div className="space-y-2">
              {dueHabits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  isDue={true}
                  intervalDaysText={getIntervalDaysText(habit)}
                  onComplete={toggleHabit}
                  onDelete={deleteHabit}
                />
              ))}
            </div>
          ) : !isLoaded ? (
            <Card className="text-center py-6">
              <p className="text-slate-400">로딩 중...</p>
            </Card>
          ) : (
            <Card className="text-center py-6">
              <p className="text-slate-400">모든 루틴을 완료했습니다!</p>
            </Card>
          )}
        </section>

        {notDueHabits.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">완료됨</h2>
            <div className="space-y-2">
              {notDueHabits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  isDue={false}
                  intervalDaysText={getIntervalDaysText(habit)}
                  onComplete={toggleHabit}
                  onDelete={deleteHabit}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <BottomSheet
        isOpen={isAddSheetOpen}
        onClose={resetForm}
        title="새 루틴 추가"
      >
        <div className="space-y-4">
          <Input
            label="루틴 이름"
            placeholder="루틴을 입력하세요"
            value={newHabit.title}
            onChange={(e) => setNewHabit({ ...newHabit, title: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              반복 주기
            </label>
            <div className="grid grid-cols-3 gap-2">
              {intervalTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setNewHabit({ ...newHabit, interval_type: type, interval_days: [] })}
                  className={cn(
                    "px-3 py-2 rounded-xl text-sm font-medium transition-all",
                    newHabit.interval_type === type
                      ? "bg-indigo-500 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {getIntervalLabel(type)}
                </button>
              ))}
            </div>
          </div>

          {newHabit.interval_type === "week" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                실행 요일
              </label>
              <div className="flex gap-2">
                {WEEKDAYS.map((day, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleIntervalDay(idx)}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                      newHabit.interval_days.includes(idx)
                        ? "bg-indigo-500 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {newHabit.interval_type === "month" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                실행 날짜
              </label>
              <div className="grid grid-cols-7 gap-1 max-h-40 overflow-y-auto">
                {MONTH_DAYS.map((day) => (
                  <button
                    key={day}
                    onClick={() => toggleIntervalDay(day)}
                    className={cn(
                      "py-2 rounded-lg text-sm font-medium transition-all",
                      newHabit.interval_days.includes(day)
                        ? "bg-indigo-500 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {newHabit.interval_type === "quarter" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                분기 실행 월 (분기마다 한번씩)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <button
                    key={month}
                    onClick={() => toggleIntervalDay(month)}
                    className={cn(
                      "py-2 rounded-lg text-sm font-medium transition-all",
                      newHabit.interval_days.includes(month)
                        ? "bg-indigo-500 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {month}월
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                💡 선택한 월 중 실행 요일: 매월 1일 (또는 해당 월의 시작)
              </p>
            </div>
          )}

          {newHabit.interval_type === "half" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                반기 실행 월 (반년마다 한번씩)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <button
                    key={month}
                    onClick={() => toggleIntervalDay(month)}
                    className={cn(
                      "py-2 rounded-lg text-sm font-medium transition-all",
                      newHabit.interval_days.includes(month)
                        ? "bg-indigo-500 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {month}월
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                💡 선택한 월 중 실행: 상반기 1개월, 하반기 1개월
              </p>
            </div>
          )}

          <div className="pt-2">
            <Button className="w-full" onClick={handleAddHabit}>
              추가하기
            </Button>
          </div>
        </div>
      </BottomSheet>

      <BottomNavigation />
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import PageHeader from "@/components/layout/PageHeader";
import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import BottomNavigation from "@/components/layout/BottomNavigation";
import { useHabits } from "@/hooks/useHabits";
import { DateType, Habit, IntervalType, QuarterHalfYearConfig } from "@/types";
import { cn, getIntervalLabel } from "@/lib/utils";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function getHabitDetailText(habit: Habit): string {
  const base = getIntervalLabel(habit.interval_type);
  if (habit.interval_type === "week" && habit.interval_days?.length) {
    const days = habit.interval_days
      .sort((a, b) => a - b)
      .map((d) => DAY_LABELS[d])
      .join(",");
    return `${base} ${days}`;
  }
  if (habit.interval_type === "month" && habit.interval_days?.length) {
    const dates = habit.interval_days.sort((a, b) => a - b).join(",");
    return `${base} ${dates}일`;
  }
  if (["quarter", "half", "year"].includes(habit.interval_type) && habit.quarterHalfYearConfig) {
    const cfg = habit.quarterHalfYearConfig;
    const months = cfg.months?.sort((a, b) => a - b).join(",") || "";
    if (cfg.type === "specific_date") {
      return `${base} ${months}월 ${cfg.specificDate}일`;
    } else {
      return `${base} ${months}월 ${cfg.weekCount}번째 ${DAY_LABELS[cfg.weekday || 0]}`;
    }
  }
  return base;
}

type GroupKey = "day" | "week" | "month" | "quarter" | "half" | "year";
const GROUP_ORDER: GroupKey[] = ["day", "week", "month", "quarter", "half", "year"];
const GROUP_LABELS: Record<GroupKey, string> = {
  day: "매일",
  week: "매주",
  month: "매월",
  quarter: "분기",
  half: "반기",
  year: "연간",
};

export default function HabitsPage() {
  const { habits, addHabit, updateHabit, deleteHabit } = useHabits();

  const [isOpen, setIsOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [title, setTitle] = useState("");
  const [intervalType, setIntervalType] = useState<IntervalType>("day");
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [selectedMonthDays, setSelectedMonthDays] = useState<number[]>([]);

  // 분기/반기/연간 설정
  const [dateType, setDateType] = useState<DateType>("specific_date");
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [specificDate, setSpecificDate] = useState<number>(1);
  const [weekday, setWeekday] = useState<number>(1);
  const [weekCount, setWeekCount] = useState<number>(1);

  // 주기별 그룹화
  const groupedHabits = useMemo(() => {
    const groups = new Map<GroupKey, Habit[]>();
    for (const key of GROUP_ORDER) {
      const items = habits.filter((h) => h.interval_type === key);
      if (items.length > 0) groups.set(key, items);
    }
    return groups;
  }, [habits]);

  const toggleWeekday = (day: number) => {
    setSelectedWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleMonthDay = (day: number) => {
    setSelectedMonthDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleMonth = (m: number) => {
    setSelectedMonths((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  const resetForm = () => {
    setTitle("");
    setIntervalType("day");
    setSelectedWeekdays([]);
    setSelectedMonthDays([]);
    setDateType("specific_date");
    setSelectedMonths([]);
    setSpecificDate(1);
    setWeekday(1);
    setWeekCount(1);
    setEditingHabit(null);
  };

  const openAdd = () => {
    resetForm();
    setIsOpen(true);
  };

  const openEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setTitle(habit.title);
    setIntervalType(habit.interval_type);
    setSelectedWeekdays(
      habit.interval_type === "week" ? [...(habit.interval_days || [])] : []
    );
    setSelectedMonthDays(
      habit.interval_type === "month" ? [...(habit.interval_days || [])] : []
    );
    if (habit.quarterHalfYearConfig) {
      setDateType(habit.quarterHalfYearConfig.type || "specific_date");
      setSelectedMonths([...(habit.quarterHalfYearConfig.months || [])]);
      setSpecificDate(habit.quarterHalfYearConfig.specificDate || 1);
      setWeekday(habit.quarterHalfYearConfig.weekday || 1);
      setWeekCount(habit.quarterHalfYearConfig.weekCount || 1);
    } else {
      setDateType("specific_date");
      setSelectedMonths([]);
      setSpecificDate(1);
      setWeekday(1);
      setWeekCount(1);
    }
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    let interval_days: number[] | undefined = undefined;
    let quarterHalfYearConfig: QuarterHalfYearConfig | undefined = undefined;

    if (intervalType === "week") {
      interval_days = selectedWeekdays.length > 0 ? selectedWeekdays : undefined;
    } else if (intervalType === "month") {
      interval_days = selectedMonthDays.length > 0 ? selectedMonthDays : undefined;
    } else if (["quarter", "half", "year"].includes(intervalType)) {
      const cfg: QuarterHalfYearConfig = {
        type: dateType,
        months: selectedMonths,
      };
      if (dateType === "specific_date") {
        cfg.specificDate = specificDate;
      } else {
        cfg.weekday = weekday;
        cfg.weekCount = weekCount;
      }
      quarterHalfYearConfig = cfg;
    }

    if (editingHabit) {
      await updateHabit(editingHabit.id, {
        title: title.trim(),
        interval_type: intervalType,
        interval_days,
        quarterHalfYearConfig,
      });
    } else {
      await addHabit({
        user_id: "",
        title: title.trim(),
        interval_type: intervalType,
        interval_days,
        quarterHalfYearConfig,
        last_done_date: null,
        completion_records: {},
      });
    }

    resetForm();
    setIsOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <PageHeader
        title="루틴 관리"
        subtitle={`${habits.length}개 루틴`}
        action={<Button size="sm" onClick={openAdd}>+ 추가</Button>}
      />

      <main className="px-4 space-y-6">
        {habits.length === 0 && (
          <Card className="text-center py-12">
            <p className="text-slate-400">등록된 루틴이 없습니다</p>
            <Button variant="ghost" className="mt-2" onClick={openAdd}>
              + 루틴 추가하기
            </Button>
          </Card>
        )}

        {GROUP_ORDER.map((groupKey) => {
          const items = groupedHabits.get(groupKey);
          if (!items || items.length === 0) return null;

          return (
            <section key={groupKey}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-lg font-semibold text-slate-900">
                  {GROUP_LABELS[groupKey]}
                </h2>
                <span className="text-sm text-slate-400">({items.length})</span>
              </div>
              <div className="space-y-2">
                {items.map((habit) => (
                  <button
                    key={habit.id}
                    onClick={() => openEdit(habit)}
                    className="w-full text-left"
                  >
                    <Card
                      variant="outlined"
                      className="flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-900 font-medium truncate">
                          {habit.title}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {getHabitDetailText(habit)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteHabit(habit.id);
                          }}
                          className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    </Card>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </main>

      <BottomSheet
        isOpen={isOpen}
        onClose={() => {
          resetForm();
          setIsOpen(false);
        }}
        title={editingHabit ? "루틴 수정" : "루틴 추가"}
      >
        <div className="space-y-4">
          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              제목
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="루틴 제목을 입력하세요"
            />
          </div>

          {/* 주기 선택 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              주기
            </label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: "day", label: "매일" },
                  { key: "week", label: "매주" },
                  { key: "month", label: "매월" },
                  { key: "quarter", label: "분기" },
                  { key: "half", label: "반기" },
                  { key: "year", label: "연간" },
                ] as { key: IntervalType; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setIntervalType(opt.key)}
                  className={cn(
                    "px-3 py-2 rounded-xl text-sm font-medium transition-all",
                    intervalType === opt.key
                      ? "bg-indigo-500 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 매주: 요일 선택 버튼 */}
          {intervalType === "week" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                요일 선택
              </label>
              <div className="flex gap-2">
                {DAY_LABELS.map((label, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleWeekday(idx)}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all",
                      selectedWeekdays.includes(idx)
                        ? "bg-indigo-500 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 매월: 날짜 그리드 */}
          {intervalType === "month" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                날짜 선택
              </label>
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleMonthDay(day)}
                    className={cn(
                      "py-2 rounded-lg text-sm font-medium transition-all",
                      selectedMonthDays.includes(day)
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

          {/* 분기/반기/연간: 월 선택 + 날짜 유형 */}
          {["quarter", "half", "year"].includes(intervalType) && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  적용 월 선택
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMonth(m)}
                      className={cn(
                        "px-2 py-1.5 rounded-lg text-sm font-medium transition-all",
                        selectedMonths.includes(m)
                          ? "bg-indigo-500 text-white shadow-sm"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      )}
                    >
                      {m}월
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  날짜 유형
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDateType("specific_date")}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-sm font-medium transition-all",
                      dateType === "specific_date"
                        ? "bg-indigo-500 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    특정 날짜
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateType("nth_weekday")}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-sm font-medium transition-all",
                      dateType === "nth_weekday"
                        ? "bg-indigo-500 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    n번째 요일
                  </button>
                </div>
              </div>

              {dateType === "specific_date" ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    일자 (1-31)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={specificDate}
                    onChange={(e) => setSpecificDate(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      요일
                    </label>
                    <div className="flex gap-1">
                      {DAY_LABELS.map((label, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setWeekday(idx)}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-xs font-medium transition-all",
                            weekday === idx
                              ? "bg-indigo-500 text-white shadow-sm"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      몇번째
                    </label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setWeekCount(n)}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                            weekCount === n
                              ? "bg-indigo-500 text-white shadow-sm"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 저장/취소 */}
          <div className="pt-2 flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                resetForm();
                setIsOpen(false);
              }}
            >
              취소
            </Button>
            <Button className="flex-1" onClick={handleSave}>
              {editingHabit ? "저장" : "추가하기"}
            </Button>
          </div>
        </div>
      </BottomSheet>

      <BottomNavigation />
    </div>
  );
}

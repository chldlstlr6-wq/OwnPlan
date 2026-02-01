"use client";

import { useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";
import BottomNavigation from "@/components/layout/BottomNavigation";
import { useHabits } from "@/hooks/useHabits";
import { DateType, Habit, IntervalType, QuarterHalfYearConfig } from "@/types";

export default function HabitsPage() {
  const { habits, addHabit, deleteHabit } = useHabits();

  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [intervalType, setIntervalType] = useState<IntervalType>("day");

  const [dateType, setDateType] = useState<DateType>("specific_date");
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [specificDate, setSpecificDate] = useState<number>(1);
  const [weekday, setWeekday] = useState<number>(1);
  const [weekCount, setWeekCount] = useState<number>(1);

  const toggleMonth = (m: number) => {
    setSelectedMonths((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const resetForm = () => {
    setTitle("");
    setIntervalType("day");
    setDateType("specific_date");
    setSelectedMonths([]);
    setSpecificDate(1);
    setWeekday(1);
    setWeekCount(1);
  };

  const handleAdd = async () => {
    if (!title.trim()) return;

    const newHabit: Omit<Habit, "id" | "created_at" | "updated_at"> = {
      user_id: "",
      title: title.trim(),
      interval_type: intervalType,
      interval_days: undefined,
      quarterHalfYearConfig: undefined,
      last_done_date: null,
      completion_records: {},
    };

    if (["quarter", "half", "year"].includes(intervalType)) {
      const cfg: QuarterHalfYearConfig = {
        type: dateType,
        months: selectedMonths,
      } as QuarterHalfYearConfig;

      if (dateType === "specific_date") {
        cfg.specificDate = specificDate;
      } else {
        cfg.weekday = weekday;
        cfg.weekCount = weekCount;
      }

      newHabit.quarterHalfYearConfig = cfg;
    }

    await addHabit(newHabit as any);
    resetForm();
    setIsOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="루틴 관리"
        subtitle="루틴을 추가/편집하세요. 실행 여부는 여기서 변경할 수 없습니다."
        action={<Button onClick={() => setIsOpen(true)}>추가</Button>}
      />

      <main className="p-4">
        <div className="space-y-3">
          {habits.map((h) => (
            <div key={h.id} className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
              <div>
                <div className="font-medium">{h.title}</div>
                <div className="text-sm text-slate-500">{h.interval_type}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => deleteHabit(h.id)}>삭제</Button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title="루틴 추가">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">제목</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="루틴 제목을 입력하세요"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">주기</label>
            <select value={intervalType} onChange={(e) => setIntervalType(e.target.value as IntervalType)} className="w-full px-3 py-2 border rounded-lg">
              <option value="day">매일</option>
              <option value="week">매주</option>
              <option value="month">매월</option>
              <option value="quarter">분기</option>
              <option value="half">반기</option>
              <option value="year">연간</option>
            </select>
          </div>

          {["quarter", "half", "year"].includes(intervalType) && (
            <div className="space-y-3">
              <div>
                <div className="text-sm text-slate-600 mb-2">적용 월 선택</div>
                <div className="grid grid-cols-6 gap-2">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMonth(m)}
                      className={`px-2 py-1 rounded ${selectedMonths.includes(m) ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-700"}`}
                    >
                      {m}월
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-600 mb-2">날짜 유형</div>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={dateType === "specific_date"} onChange={() => setDateType("specific_date")} />
                    <span className="text-sm">특정 날짜</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={dateType === "nth_weekday"} onChange={() => setDateType("nth_weekday")} />
                    <span className="text-sm">n번째 요일</span>
                  </label>
                </div>
              </div>

              {dateType === "specific_date" ? (
                <div>
                  <label className="block text-sm text-slate-600 mb-1">일자 (1-31)</label>
                  <input type="number" min={1} max={31} value={specificDate} onChange={(e) => setSpecificDate(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">요일 (0=일 ~ 6=토)</label>
                    <input type="number" min={0} max={6} value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">몇번째 (1-5)</label>
                    <input type="number" min={1} max={5} value={weekCount} onChange={(e) => setWeekCount(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { resetForm(); setIsOpen(false); }}>취소</Button>
            <Button onClick={handleAdd}>저장</Button>
          </div>
        </div>
      </BottomSheet>

      <BottomNavigation />
    </div>
  );
}

"use client";

import { cn, getDateKey } from "@/lib/utils";
import { useState } from "react";
import { Card } from "../ui";
import { Habit, Task } from "@/types";

interface CalendarWidgetProps {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  markedDates?: string[];
  habits?: Habit[];
  tasks?: Task[];
}

export default function CalendarWidget({
  selectedDate = new Date(),
  onDateSelect,
  markedDates = [],
  habits = [],
  tasks = [],
}: CalendarWidgetProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  // 해당 날짜의 루틴 달성 상태를 계산
  const getHabitStatusForDate = (date: Date) => {
    const dateStr = getDateKey(date);
    const today = date.getDay();
    const todayDate = date.getDate();
    const todayMonth = date.getMonth() + 1;
    
    let allCompleted = 0;
    let dayIncompleted = 0;
    let weekIncompleted = 0;
    let otherIncompleted = 0;
    
    habits.forEach((habit) => {
      const shouldRunToday = 
        (habit.interval_type === "day") ||
        (habit.interval_type === "week" && habit.interval_days?.includes(today)) ||
        (habit.interval_type === "month" && habit.interval_days?.includes(todayDate)) ||
        (habit.interval_type === "quarter" && habit.interval_days?.includes(todayMonth)) ||
        (habit.interval_type === "half" && habit.interval_days?.includes(todayMonth));
      
      if (!shouldRunToday) return;
      
      const isCompleted = habit.completion_records?.[dateStr] ?? false;
      if (isCompleted) {
        allCompleted++;
      } else {
        if (habit.interval_type === "day") dayIncompleted++;
        else if (habit.interval_type === "week") weekIncompleted++;
        else otherIncompleted++;
      }
    });
    
    return { allCompleted, dayIncompleted, weekIncompleted, otherIncompleted };
  };

  // 해당 날짜의 일정 개수 계산
  const getTaskCountForDate = (date: Date) => {
    const dateStr = getDateKey(date);
    const eventCount = tasks.filter((task) => {
      if (!task.deadline || !task.isEvent) return false;
      return getDateKey(new Date(task.deadline)) === dateStr;
    }).length;
    return eventCount;
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isMarked = (date: Date) => {
    const dateStr = getDateKey(date);
    return markedDates.includes(dateStr);
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-lg font-semibold text-slate-900">
          {currentMonth.toLocaleDateString("ko-KR", { year: "numeric", month: "long" })}
        </h3>
        <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, index) => (
          <div
            key={day}
            className={cn(
              "text-center text-xs font-medium py-2",
              index === 0 ? "text-red-500" : index === 6 ? "text-indigo-500" : "text-slate-400"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          const status = date ? getHabitStatusForDate(date) : null;
          const eventCount = date ? getTaskCountForDate(date) : 0;
          
          return (
            <button
              key={index}
              onClick={() => date && onDateSelect?.(date)}
              disabled={!date}
              className={cn(
                "aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all relative",
                !date && "invisible",
                date && isSelected(date) && "bg-indigo-500 text-white shadow-sm",
                date && !isSelected(date) && isToday(date) && "bg-indigo-100 text-indigo-700 font-semibold",
                date && !isSelected(date) && !isToday(date) && "text-slate-700 hover:bg-slate-100"
              )}
            >
              <span>{date?.getDate()}</span>
              
              {/* 루틴 달성 표시 - 최대 2개까지 표시 */}
              {date && status && (status.allCompleted > 0 || status.dayIncompleted > 0 || status.weekIncompleted > 0 || status.otherIncompleted > 0) && (
                <div className="flex gap-0.5 mt-0.5">
                  {/* 완료: 초록색 */}
                  {status.allCompleted > 0 && (
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" title={`완료: ${status.allCompleted}개`} />
                  )}
                  
                  {/* 일일 미완료: 노란색 */}
                  {status.dayIncompleted > 0 && (
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" title={`일일 미완료: ${status.dayIncompleted}개`} />
                  )}
                  
                  {/* 주간 미완료: 주황색 */}
                  {status.weekIncompleted > 0 && (
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400" title={`주간 미완료: ${status.weekIncompleted}개`} />
                  )}
                  
                  {/* 기타 미완료 (분기/월간/반기): 빨간색 */}
                  {status.otherIncompleted > 0 && (
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400" title={`장기 미완료: ${status.otherIncompleted}개`} />
                  )}
                </div>
              )}

              {/* 일정 표시 - 날짜 아래에 동그라미로 표시 */}
              {eventCount > 0 && (
                <div className="flex gap-1 mt-1 items-center">
                  {Array.from({ length: Math.min(eventCount, 3) }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 h-1 rounded-full bg-indigo-500"
                      title={`${eventCount}개 일정`}
                    />
                  ))}
                  {eventCount > 3 && (
                    <span className="text-xs text-indigo-500 font-semibold">+</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

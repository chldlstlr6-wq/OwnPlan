"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Habit } from "@/types";

const HABITS_STORAGE_KEY = "habits_data";

// 초기 루틴 데이터
const initialHabits: Habit[] = [
  {
    id: "1",
    user_id: "user1",
    title: "운동하기",
    interval_type: "day",
    interval_days: undefined,
    last_done_date: null,
    completion_records: {},
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    user_id: "user1",
    title: "독서 30분",
    interval_type: "day",
    interval_days: undefined,
    last_done_date: null,
    completion_records: {},
    created_at: new Date().toISOString(),
  },
];

export function useHabits(userId?: string) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHabits = useCallback(async () => {
    if (!userId) {
      // userId가 없으면 로컬스토리지에서 로드 (오프라인 모드)
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem(HABITS_STORAGE_KEY);
          setHabits(stored ? JSON.parse(stored) : initialHabits);
        } catch (err) {
          console.error("Failed to load habits from localStorage:", err);
          setHabits(initialHabits);
        }
      }
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("habits")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Supabase에서 로드 성공 시 로컬스토리지에 저장
      if (data) {
        setHabits(data as Habit[]);
        if (typeof window !== "undefined") {
          localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(data));
        }
      }
    } catch (err) {
      console.error("Failed to fetch habits from Supabase:", err);
      // Supabase 실패 시 로컬스토리지에서 폴백
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem(HABITS_STORAGE_KEY);
          setHabits(stored ? JSON.parse(stored) : initialHabits);
        } catch (fallbackErr) {
          console.error("Failed to load habits from localStorage:", fallbackErr);
          setHabits(initialHabits);
        }
      }
      setError(err instanceof Error ? err : new Error("Failed to fetch habits"));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const addHabit = useCallback(
    async (habit: Omit<Habit, "id" | "created_at">) => {
      if (!userId) {
        // userId가 없으면 로컬스토리지에만 저장
        const newHabit: Habit = {
          ...(habit as Habit),
          id: Date.now().toString(),
          created_at: new Date().toISOString(),
        };
        const updated = [...habits, newHabit];
        setHabits(updated);
        if (typeof window !== "undefined") {
          localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(updated));
        }
        return { data: newHabit, error: null };
      }

      try {
        const { data, error } = await supabase
          .from("habits")
          .insert([{ ...habit, user_id: userId }])
          .select()
          .single();

        if (error) throw error;
        const newHabits = [data as Habit, ...habits];
        setHabits(newHabits);
        // Supabase 저장 후 로컬스토리지에도 저장
        if (typeof window !== "undefined") {
          localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(newHabits));
        }
        return { data, error: null };
      } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error("Failed to add habit") };
      }
    },
    [userId, habits]
  );

  const updateHabit = useCallback(async (id: string, updates: Partial<Habit>) => {
    try {
      const updated = habits.map((habit) => (habit.id === id ? { ...habit, ...updates } : habit));
      setHabits(updated);

      // 로컬스토리지에 저장
      if (typeof window !== "undefined") {
        localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(updated));
      }

      // Supabase에도 저장 시도 (있으면)
      if (userId) {
        const { data, error } = await supabase
          .from("habits")
          .update(updates)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;
        // Supabase 업데이트 성공 시 로컬스토리지 다시 동기화
        if (typeof window !== "undefined") {
          const synced = habits.map((habit) => (habit.id === id ? (data as Habit) : habit));
          localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(synced));
        }
        return { data, error: null };
      }

      return { data: updated[0], error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err : new Error("Failed to update habit") };
    }
  }, [habits, userId]);

  const deleteHabit = useCallback(async (id: string) => {
    try {
      const updated = habits.filter((habit) => habit.id !== id);
      setHabits(updated);

      // 로컬스토리지에 저장
      if (typeof window !== "undefined") {
        localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(updated));
      }

      // Supabase에도 삭제 시도 (있으면)
      if (userId) {
        const { error } = await supabase.from("habits").delete().eq("id", id);
        if (error) throw error;
      }

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error("Failed to delete habit") };
    }
  }, [habits, userId]);

  // 루틴 토글 (완료/미완료) - 날짜별 기록
  const toggleHabit = useCallback(
    (id: string, dateStr?: string) => {
      const habit = habits.find((h) => h.id === id);
      if (!habit) return;

      const date = dateStr || new Date().toISOString().split("T")[0];
      const records = { ...habit.completion_records };
      const isCompleted = records[date];
      
      // 토글
      records[date] = !isCompleted;
      
      // last_done_date 업데이트 (마지막 완료 날짜)
      const completedDates = Object.entries(records)
        .filter(([_, completed]) => completed)
        .map(([dateKey]) => dateKey)
        .sort()
        .reverse();
      
      updateHabit(id, { 
        last_done_date: completedDates.length > 0 ? completedDates[0] : null,
        completion_records: records 
      });
    },
    [habits, updateHabit]
  );

  // 특정 날짜의 루틴 완료 상태 조회
  const getHabitCompletionStatus = useCallback(
    (habitId: string, dateStr?: string): boolean => {
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return false;
      const date = dateStr || new Date().toISOString().split("T")[0];
      return habit.completion_records?.[date] ?? false;
    },
    [habits]
  );

  const isHabitDue = useCallback((habit: Habit): boolean => {
    if (!habit.last_done_date) return true;

    const lastDone = new Date(habit.last_done_date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastDone.getTime()) / (1000 * 60 * 60 * 24));

    switch (habit.interval_type) {
      case "day":
        return diffDays >= 1;
      case "week":
        return diffDays >= 7;
      case "month":
        return diffDays >= 30;
      case "quarter":
        return diffDays >= 90;
      case "half":
        return diffDays >= 180;
      case "year":
        return diffDays >= 365;
      default:
        return true;
    }
  }, []);

  return {
    habits,
    loading,
    error,
    fetchHabits,
    addHabit,
    updateHabit,
    deleteHabit,
    toggleHabit,
    getHabitCompletionStatus,
    isHabitDue,
    isLoaded: !loading,
  };
}

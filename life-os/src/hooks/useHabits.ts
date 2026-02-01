"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Habit } from "@/types";
import { getStoredHabits, saveHabits } from "@/lib/storage";
import { getDateKey } from "@/lib/utils";
import { useAuthContext } from "@/components/providers/AuthProvider";

export function useHabits() {
  const { user } = useAuthContext();
  const userId = user?.id;

  const [habits, setHabits] = useState<Habit[]>(() => getStoredHabits([], userId));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" && navigator.onLine);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 로컬과 서버의 데이터를 updated_at 기준으로 병합
  const mergeDataByTimestamp = useCallback((local: Habit[], server: Habit[]): Habit[] => {
    const merged = new Map<string, Habit>();

    // 로컬 데이터 추가
    local.forEach((h) => merged.set(h.id, h));

    // 서버 데이터: updated_at이 더 최신이면 덮어쓰기
    server.forEach((s) => {
      const existing = merged.get(s.id);
      if (!existing || new Date(s.updated_at) > new Date(existing.updated_at)) {
        merged.set(s.id, s);
      }
    });

    return Array.from(merged.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, []);

  const fetchHabits = useCallback(async () => {
    if (!userId) {
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

      if (data) {
        const local = getStoredHabits([], userId);
        const merged = mergeDataByTimestamp(local, data as Habit[]);
        setHabits(merged);
        if (typeof window !== "undefined") saveHabits(merged, userId);
      }
    } catch (err) {
      console.error("Failed to fetch habits from Supabase:", err);
      try {
        const stored = getStoredHabits([], userId);
        setHabits(stored);
      } catch (fallbackErr) {
        console.error("Failed to load habits from localStorage:", fallbackErr);
        setHabits([]);
      }
      setError(err instanceof Error ? err : new Error("Failed to fetch habits"));
    } finally {
      setLoading(false);
    }
  }, [userId, mergeDataByTimestamp]);

  // 오프라인 중인 변경사항을 온라인 상태에서 Supabase에 upsert
  const syncLocalChanges = useCallback(async () => {
    if (!isOnline || !userId) return;

    try {
      const localHabits = getStoredHabits([], userId);
      if (localHabits.length === 0) return;

      for (const habit of localHabits) {
        try {
          const { data: serverHabit, error } = await supabase
            .from("habits")
            .select("*")
            .eq("id", habit.id)
            .single();

          if (!error && serverHabit && new Date(habit.updated_at) <= new Date(serverHabit.updated_at)) {
            continue;
          }

          const { error: upsertError } = await supabase.from("habits").upsert([habit], { onConflict: "id" });
          if (upsertError) console.error(`Failed to sync habit ${habit.id}:`, upsertError);
        } catch (err) {
          console.error(`Failed to check/sync habit ${habit.id}:`, err);
        }
      }

      await fetchHabits();
    } catch (err) {
      console.error("Failed to sync local changes:", err);
    }
  }, [isOnline, userId, fetchHabits]);

  // 온라인/오프라인 상태 감지
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        syncLocalChanges();
      }, 1000);
    };

    const handleOffline = () => setIsOnline(false);

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      };
    }
  }, [syncLocalChanges]);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const addHabit = useCallback(
    async (habit: Omit<Habit, "id" | "created_at" | "updated_at">) => {
      if (!userId) return { data: null, error: new Error("Not authenticated") };
      try {
        const now = new Date().toISOString();
        const payload = { ...habit, user_id: userId, created_at: now, updated_at: now };
        const { data, error } = await supabase.from("habits").insert([payload]).select().single();
        if (error) throw error;

        const newHabits = data ? [data as Habit, ...habits] : [{ ...(habit as Habit), id: Date.now().toString(), user_id: userId, created_at: now, updated_at: now }, ...habits];
        setHabits(newHabits);
        if (typeof window !== "undefined") saveHabits(newHabits, userId);
        return { data, error: null };
      } catch (err) {
        const now = new Date().toISOString();
        const newHabit: Habit = { ...(habit as Habit), id: Date.now().toString(), user_id: userId, created_at: now, updated_at: now };
        const updated = [newHabit, ...habits];
        setHabits(updated);
        if (typeof window !== "undefined") saveHabits(updated, userId);
        return { data: newHabit, error: null };
      }
    },
    [userId, habits]
  );

  const updateHabit = useCallback(async (id: string, updates: Partial<Habit>) => {
    try {
      const now = new Date().toISOString();
      const updatesWithTimestamp = { ...updates, updated_at: now };

      const updated = habits.map((habit) =>
        habit.id === id ? { ...habit, ...updatesWithTimestamp } : habit
      );
      setHabits(updated);
      if (typeof window !== "undefined") saveHabits(updated, userId);

      const { error } = await supabase.from("habits").update(updatesWithTimestamp).eq("id", id);
      if (error) throw error;
      return { data: updated.find((h) => h.id === id) ?? null, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err : new Error("Failed to update habit") };
    }
  }, [habits, userId]);

  const deleteHabit = useCallback(async (id: string) => {
    try {
      const updated = habits.filter((habit) => habit.id !== id);
      setHabits(updated);
      if (typeof window !== "undefined") saveHabits(updated, userId);

      const { error } = await supabase.from("habits").delete().eq("id", id);
      if (error) throw error;
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error("Failed to delete habit") };
    }
  }, [habits, userId]);

  const toggleHabit = useCallback(
    (id: string, dateStr?: string) => {
      const habit = habits.find((h) => h.id === id);
      if (!habit) return;

      const date = dateStr || getDateKey();
      const records = { ...habit.completion_records };
      const isCompleted = records[date];
      records[date] = !isCompleted;

      const completedDates = Object.entries(records)
        .filter(([_, completed]) => completed)
        .map(([dateKey]) => dateKey)
        .sort()
        .reverse();

      updateHabit(id, {
        last_done_date: completedDates.length > 0 ? completedDates[0] : null,
        completion_records: records,
      });
    },
    [habits, updateHabit]
  );

  const getHabitCompletionStatus = useCallback(
    (habitId: string, dateStr?: string): boolean => {
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return false;
      const date = dateStr || getDateKey();
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
    isOnline,
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

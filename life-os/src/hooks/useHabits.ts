"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Habit, QuarterHalfYearConfig } from "@/types";
import { getStoredHabits, saveHabits } from "@/lib/storage";
import { getDateKey } from "@/lib/utils";
import { useAuthContext } from "@/components/providers/AuthProvider";

// DB row → Habit
function fromDB(row: Record<string, unknown>): Habit {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    title: row.title as string,
    interval_type: row.interval_type as Habit["interval_type"],
    interval_days: (row.interval_days as number[]) || undefined,
    quarterHalfYearConfig:
      (row.quarter_half_year_config as QuarterHalfYearConfig) || undefined,
    last_done_date: (row.last_done_date as string) || null,
    completion_records:
      (row.completion_records as Record<string, boolean>) || {},
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

// Habit → DB row
function toDB(habit: Partial<Habit>): Record<string, unknown> {
  const row: Record<string, unknown> = { ...habit };
  if ("quarterHalfYearConfig" in habit) {
    row.quarter_half_year_config = habit.quarterHalfYearConfig;
    delete row.quarterHalfYearConfig;
  }
  return row;
}

// completion_records 합집합 병합 (두 기기에서 다른 날짜 완료 시 둘 다 보존)
function mergeCompletionRecords(
  local: Record<string, boolean>,
  server: Record<string, boolean>
): Record<string, boolean> {
  const merged = { ...server };
  for (const [key, val] of Object.entries(local)) {
    if (val === true) merged[key] = true;
    else if (!(key in merged)) merged[key] = val;
  }
  return merged;
}

export function useHabits() {
  const { user } = useAuthContext();
  const userId = user?.id;

  const [habits, setHabits] = useState<Habit[]>(() =>
    getStoredHabits([], userId)
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" && navigator.onLine
  );
  const fetchingRef = useRef(false);

  const fetchHabits = useCallback(async () => {
    if (!userId || fetchingRef.current) {
      setLoading(false);
      return;
    }
    fetchingRef.current = true;

    try {
      setLoading(true);

      // 1) 서버 데이터
      const { data: serverData, error: fetchError } = await supabase
        .from("habits")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      const serverRows = serverData || [];
      const serverMap = new Map(serverRows.map((r) => [r.id as string, r]));

      // 2) 로컬 변경분 push (completion_records는 합집합 병합)
      const local = getStoredHabits([], userId);
      const toPush = local.filter((h) => {
        const server = serverMap.get(h.id);
        if (!server) return true;
        return new Date(h.updated_at) > new Date(server.updated_at as string);
      });

      if (toPush.length > 0) {
        for (const habit of toPush) {
          const serverRow = serverMap.get(habit.id);
          let pushHabit = { ...habit };
          if (serverRow) {
            // completion_records 합집합 병합
            pushHabit.completion_records = mergeCompletionRecords(
              habit.completion_records || {},
              (serverRow.completion_records as Record<string, boolean>) || {}
            );
          }
          const { error: upsertErr } = await supabase
            .from("habits")
            .upsert([toDB(pushHabit)], { onConflict: "id" });
          if (upsertErr)
            console.error(`Failed to push habit ${habit.id}:`, upsertErr);
        }
        // re-fetch
        const { data: freshData } = await supabase
          .from("habits")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        const freshHabits = (freshData || []).map((r) =>
          fromDB(r as Record<string, unknown>)
        );
        setHabits(freshHabits);
        if (typeof window !== "undefined") saveHabits(freshHabits, userId);
      } else {
        // 3) 서버 = 진실
        const serverHabits = serverRows.map((r) =>
          fromDB(r as Record<string, unknown>)
        );
        setHabits(serverHabits);
        if (typeof window !== "undefined") saveHabits(serverHabits, userId);
      }
    } catch (err) {
      console.error("Failed to fetch habits:", err);
      try {
        const stored = getStoredHabits([], userId);
        setHabits(stored);
      } catch {
        setHabits([]);
      }
      setError(
        err instanceof Error ? err : new Error("Failed to fetch habits")
      );
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [userId]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      fetchHabits();
    };
    const handleOffline = () => setIsOnline(false);
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        fetchHabits();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      document.addEventListener("visibilitychange", handleVisibility);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        document.removeEventListener("visibilitychange", handleVisibility);
      };
    }
  }, [fetchHabits]);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const addHabit = useCallback(
    async (habit: Omit<Habit, "id" | "created_at" | "updated_at">) => {
      if (!userId) return { data: null, error: new Error("Not authenticated") };
      const now = new Date().toISOString();
      try {
        const payload = toDB({
          ...habit,
          user_id: userId,
          created_at: now,
          updated_at: now,
        });
        const { data, error } = await supabase
          .from("habits")
          .insert([payload])
          .select()
          .single();
        if (error) throw error;

        const newHabit = fromDB(data as Record<string, unknown>);
        const newHabits = [newHabit, ...habits];
        setHabits(newHabits);
        if (typeof window !== "undefined") saveHabits(newHabits, userId);
        return { data: newHabit, error: null };
      } catch {
        const newHabit: Habit = {
          ...(habit as Habit),
          id: Date.now().toString(),
          user_id: userId,
          created_at: now,
          updated_at: now,
        };
        const updated = [newHabit, ...habits];
        setHabits(updated);
        if (typeof window !== "undefined") saveHabits(updated, userId);
        return { data: newHabit, error: null };
      }
    },
    [userId, habits]
  );

  const updateHabit = useCallback(
    async (id: string, updates: Partial<Habit>) => {
      const now = new Date().toISOString();
      const updatesWithTimestamp = { ...updates, updated_at: now };

      const updated = habits.map((habit) =>
        habit.id === id ? { ...habit, ...updatesWithTimestamp } : habit
      );
      setHabits(updated);
      if (typeof window !== "undefined") saveHabits(updated, userId);

      try {
        const dbUpdates = toDB(updatesWithTimestamp);
        const { error } = await supabase
          .from("habits")
          .update(dbUpdates)
          .eq("id", id);
        if (error) throw error;
        return {
          data: updated.find((h) => h.id === id) ?? null,
          error: null,
        };
      } catch (err) {
        return {
          data: null,
          error:
            err instanceof Error ? err : new Error("Failed to update habit"),
        };
      }
    },
    [habits, userId]
  );

  const deleteHabit = useCallback(
    async (id: string) => {
      const updated = habits.filter((habit) => habit.id !== id);
      setHabits(updated);
      if (typeof window !== "undefined") saveHabits(updated, userId);

      try {
        const { error } = await supabase.from("habits").delete().eq("id", id);
        if (error) throw error;
        return { error: null };
      } catch (err) {
        return {
          error:
            err instanceof Error ? err : new Error("Failed to delete habit"),
        };
      }
    },
    [habits, userId]
  );

  const toggleHabit = useCallback(
    (id: string, dateStr?: string) => {
      const habit = habits.find((h) => h.id === id);
      if (!habit) return;

      const date = dateStr || getDateKey();
      const records = { ...habit.completion_records };
      records[date] = !records[date];

      const completedDates = Object.entries(records)
        .filter(([, completed]) => completed)
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
    const diffDays = Math.floor(
      (now.getTime() - lastDone.getTime()) / (1000 * 60 * 60 * 24)
    );
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

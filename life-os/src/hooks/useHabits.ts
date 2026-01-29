"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Habit } from "@/types";

export function useHabits(userId?: string) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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
      setHabits(data as Habit[]);
    } catch (err) {
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
      if (!userId) return { error: new Error("User not authenticated") };

      try {
        const { data, error } = await supabase
          .from("habits")
          .insert([{ ...habit, user_id: userId }])
          .select()
          .single();

        if (error) throw error;
        setHabits((prev) => [data as Habit, ...prev]);
        return { data, error: null };
      } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error("Failed to add habit") };
      }
    },
    [userId]
  );

  const updateHabit = useCallback(async (id: string, updates: Partial<Habit>) => {
    try {
      const { data, error } = await supabase
        .from("habits")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      setHabits((prev) => prev.map((habit) => (habit.id === id ? (data as Habit) : habit)));
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err : new Error("Failed to update habit") };
    }
  }, []);

  const deleteHabit = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from("habits").delete().eq("id", id);

      if (error) throw error;
      setHabits((prev) => prev.filter((habit) => habit.id !== id));
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error("Failed to delete habit") };
    }
  }, []);

  const completeHabit = useCallback(
    async (id: string) => {
      const today = new Date().toISOString().split("T")[0];
      return updateHabit(id, { last_done_date: today });
    },
    [updateHabit]
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
    completeHabit,
    isHabitDue,
  };
}

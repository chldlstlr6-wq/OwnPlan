"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Task } from "@/types";

export function useTasks(userId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data as Task[]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch tasks"));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = useCallback(
    async (task: Omit<Task, "id" | "created_at">) => {
      if (!userId) return { error: new Error("User not authenticated") };

      try {
        const { data, error } = await supabase
          .from("tasks")
          .insert([{ ...task, user_id: userId }])
          .select()
          .single();

        if (error) throw error;
        setTasks((prev) => [data as Task, ...prev]);
        return { data, error: null };
      } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error("Failed to add task") };
      }
    },
    [userId]
  );

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      setTasks((prev) => prev.map((task) => (task.id === id ? (data as Task) : task)));
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err : new Error("Failed to update task") };
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", id);

      if (error) throw error;
      setTasks((prev) => prev.filter((task) => task.id !== id));
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error("Failed to delete task") };
    }
  }, []);

  const toggleTask = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return { error: new Error("Task not found") };

      const newStatus = task.status === "completed" ? "pending" : "completed";
      return updateTask(id, { status: newStatus });
    },
    [tasks, updateTask]
  );

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
  };
}

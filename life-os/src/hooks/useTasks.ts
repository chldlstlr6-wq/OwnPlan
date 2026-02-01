"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Task } from "@/types";
import { getStoredTasks, saveTasks } from "@/lib/storage";
import { useAuthContext } from "@/components/providers/AuthProvider";

// DB row → Task (snake_case → camelCase)
function fromDB(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    title: row.title as string,
    deadline: (row.deadline as string) || null,
    status: (row.status as "pending" | "completed") || "pending",
    category: (row.category as string) || null,
    comment: (row.comment as string) || null,
    completed_at: (row.completed_at as string) || null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    isEvent: (row.is_event as boolean) || false,
  };
}

// Task → DB row (camelCase → snake_case)
function toDB(task: Partial<Task>): Record<string, unknown> {
  const row: Record<string, unknown> = { ...task };
  if ("isEvent" in task) {
    row.is_event = task.isEvent;
    delete row.isEvent;
  }
  return row;
}

export function useTasks() {
  const { user } = useAuthContext();
  const userId = user?.id;

  const [tasks, setTasks] = useState<Task[]>(() => getStoredTasks([], userId));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" && navigator.onLine
  );
  const fetchingRef = useRef(false);

  // 서버 기준 동기화: 로컬 변경분 push → 서버 데이터로 교체
  const fetchTasks = useCallback(async () => {
    if (!userId || fetchingRef.current) {
      setLoading(false);
      return;
    }
    fetchingRef.current = true;

    try {
      setLoading(true);

      // 1) 서버 데이터 가져오기
      const { data: serverData, error: fetchError } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      const serverRows = serverData || [];
      const serverMap = new Map(serverRows.map((r) => [r.id as string, r]));

      // 2) 로컬에만 있거나 로컬이 더 최신인 항목 → 서버로 push
      const local = getStoredTasks([], userId);
      const toPush = local.filter((t) => {
        const server = serverMap.get(t.id);
        if (!server) return true; // 로컬에만 있음
        return new Date(t.updated_at) > new Date(server.updated_at as string);
      });

      if (toPush.length > 0) {
        for (const task of toPush) {
          const { error: upsertErr } = await supabase
            .from("tasks")
            .upsert([toDB(task)], { onConflict: "id" });
          if (upsertErr)
            console.error(`Failed to push task ${task.id}:`, upsertErr);
        }
        // push 후 다시 가져오기
        const { data: freshData } = await supabase
          .from("tasks")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        const freshTasks = (freshData || []).map((r) =>
          fromDB(r as Record<string, unknown>)
        );
        setTasks(freshTasks);
        if (typeof window !== "undefined") saveTasks(freshTasks, userId);
      } else {
        // 3) 서버 데이터 = 진실 (삭제된 항목은 로컬에서도 사라짐)
        const serverTasks = serverRows.map((r) =>
          fromDB(r as Record<string, unknown>)
        );
        setTasks(serverTasks);
        if (typeof window !== "undefined") saveTasks(serverTasks, userId);
      }
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
      // 오프라인 등 실패 시 로컬 폴백
      try {
        const stored = getStoredTasks([], userId);
        setTasks(stored);
      } catch {
        setTasks([]);
      }
      setError(
        err instanceof Error ? err : new Error("Failed to fetch tasks")
      );
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [userId]);

  // 온라인/오프라인 + 앱 복귀 감지
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      fetchTasks();
    };
    const handleOffline = () => setIsOnline(false);
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        fetchTasks();
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
  }, [fetchTasks]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = useCallback(
    async (task: Omit<Task, "id" | "created_at" | "updated_at">) => {
      if (!userId) return { error: new Error("User not authenticated") };

      const now = new Date().toISOString();
      try {
        const dbPayload = toDB({
          ...task,
          user_id: userId,
          created_at: now,
          updated_at: now,
        });
        const { data, error } = await supabase
          .from("tasks")
          .insert([dbPayload])
          .select()
          .single();

        if (error) throw error;

        const newTask = fromDB(data as Record<string, unknown>);
        const newTasks = [newTask, ...tasks];
        setTasks(newTasks);
        if (typeof window !== "undefined") saveTasks(newTasks, userId);
        return { data: newTask, error: null };
      } catch {
        // 오프라인 폴백
        const newTask: Task = {
          ...(task as Task),
          id: Date.now().toString(),
          user_id: userId,
          created_at: now,
          updated_at: now,
        };
        const updated = [newTask, ...tasks];
        setTasks(updated);
        if (typeof window !== "undefined") saveTasks(updated, userId);
        return { data: newTask, error: null };
      }
    },
    [userId, tasks]
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<Task>) => {
      const now = new Date().toISOString();
      const updatesWithTimestamp = { ...updates, updated_at: now };

      // 즉시 로컬 반영
      const updated = tasks.map((task) =>
        task.id === id ? { ...task, ...updatesWithTimestamp } : task
      );
      setTasks(updated);
      if (typeof window !== "undefined") saveTasks(updated, userId);

      try {
        const dbUpdates = toDB(updatesWithTimestamp);
        const { error } = await supabase
          .from("tasks")
          .update(dbUpdates)
          .eq("id", id);
        if (error) throw error;
        return {
          data: updated.find((t) => t.id === id) ?? null,
          error: null,
        };
      } catch (err) {
        return {
          data: null,
          error:
            err instanceof Error ? err : new Error("Failed to update task"),
        };
      }
    },
    [tasks, userId]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      // 즉시 로컬 반영
      const updated = tasks.filter((task) => task.id !== id);
      setTasks(updated);
      if (typeof window !== "undefined") saveTasks(updated, userId);

      try {
        const { error } = await supabase.from("tasks").delete().eq("id", id);
        if (error) throw error;
        return { error: null };
      } catch (err) {
        return {
          error:
            err instanceof Error ? err : new Error("Failed to delete task"),
        };
      }
    },
    [tasks, userId]
  );

  const toggleTask = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return { error: new Error("Task not found") };

      const newStatus =
        task.status === "completed" ? "pending" : "completed";
      const completed_at =
        newStatus === "completed" ? new Date().toISOString() : null;
      return updateTask(id, { status: newStatus, completed_at });
    },
    [tasks, updateTask]
  );

  return {
    tasks,
    loading,
    error,
    isOnline,
    fetchTasks,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    isLoaded: !loading,
  };
}

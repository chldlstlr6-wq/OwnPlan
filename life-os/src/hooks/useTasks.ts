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
    status: (row.status as 'pending' | 'completed') || 'pending',
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
  if ('isEvent' in task) {
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
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" && navigator.onLine);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 로컬과 서버의 데이터를 updated_at 기준으로 병합
  const mergeDataByTimestamp = useCallback((local: Task[], server: Task[]): Task[] => {
    const merged = new Map<string, Task>();

    // 로컬 데이터 추가
    local.forEach((t) => merged.set(t.id, t));

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

      const serverTasks = (data || []).map(fromDB);
      const local = getStoredTasks([], userId);
      const merged = mergeDataByTimestamp(local, serverTasks);
      setTasks(merged);
      if (typeof window !== "undefined") saveTasks(merged, userId);
    } catch (err) {
      console.error("Failed to fetch tasks from Supabase:", err);
      try {
        const stored = getStoredTasks([], userId);
        setTasks(stored);
      } catch (fallbackErr) {
        console.error("Failed to load tasks from localStorage:", fallbackErr);
        setTasks([]);
      }
      setError(err instanceof Error ? err : new Error("Failed to fetch tasks"));
    } finally {
      setLoading(false);
    }
  }, [userId, mergeDataByTimestamp]);

  // 오프라인 중인 변경사항을 온라인 상태에서 Supabase에 upsert
  const syncLocalChanges = useCallback(async () => {
    if (!isOnline || !userId) return;

    try {
      const localTasks = getStoredTasks([], userId);
      if (localTasks.length === 0) return;

      for (const task of localTasks) {
        try {
          const { data: serverTask, error } = await supabase
            .from("tasks")
            .select("*")
            .eq("id", task.id)
            .single();

          if (!error && serverTask && new Date(task.updated_at) <= new Date(serverTask.updated_at as string)) {
            continue;
          }

          const dbRow = toDB(task);
          const { error: upsertError } = await supabase.from("tasks").upsert([dbRow], { onConflict: "id" });
          if (upsertError) console.error(`Failed to sync task ${task.id}:`, upsertError);
        } catch (err) {
          console.error(`Failed to check/sync task ${task.id}:`, err);
        }
      }

      await fetchTasks();
    } catch (err) {
      console.error("Failed to sync local changes:", err);
    }
  }, [isOnline, userId, fetchTasks]);

  // 온라인/오프라인 상태 감지 + 앱 복귀 시 자동 재조회
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        syncLocalChanges();
      }, 1000);
    };

    const handleOffline = () => setIsOnline(false);

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        fetchTasks();
      }
    };

    const handleFocus = () => {
      if (navigator.onLine) fetchTasks();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      document.addEventListener("visibilitychange", handleVisibility);
      window.addEventListener("focus", handleFocus);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        document.removeEventListener("visibilitychange", handleVisibility);
        window.removeEventListener("focus", handleFocus);
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      };
    }
  }, [syncLocalChanges, fetchTasks]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = useCallback(
    async (task: Omit<Task, "id" | "created_at" | "updated_at">) => {
      if (!userId) return { error: new Error("User not authenticated") };

      try {
        const now = new Date().toISOString();
        const dbPayload = toDB({ ...task, user_id: userId, created_at: now, updated_at: now });
        const { data, error } = await supabase
          .from("tasks")
          .insert([dbPayload])
          .select()
          .single();

        if (error) throw error;

        const newTask = fromDB(data);
        const newTasks = [newTask, ...tasks];
        setTasks(newTasks);
        if (typeof window !== "undefined") saveTasks(newTasks, userId);
        return { data: newTask, error: null };
      } catch (err) {
        const now = new Date().toISOString();
        const newTask: Task = { ...(task as Task), id: Date.now().toString(), user_id: userId, created_at: now, updated_at: now };
        const updated = [newTask, ...tasks];
        setTasks(updated);
        if (typeof window !== "undefined") saveTasks(updated, userId);
        return { data: newTask, error: null };
      }
    },
    [userId, tasks]
  );

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    try {
      const now = new Date().toISOString();
      const updatesWithTimestamp = { ...updates, updated_at: now };

      const updated = tasks.map((task) =>
        task.id === id ? { ...task, ...updatesWithTimestamp } : task
      );
      setTasks(updated);
      if (typeof window !== "undefined") saveTasks(updated, userId);

      const dbUpdates = toDB(updatesWithTimestamp);
      const { error } = await supabase
        .from("tasks")
        .update(dbUpdates)
        .eq("id", id);

      if (error) throw error;
      return { data: updated.find((t) => t.id === id) ?? null, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err : new Error("Failed to update task") };
    }
  }, [tasks, userId]);

  const deleteTask = useCallback(async (id: string) => {
    try {
      const updated = tasks.filter((task) => task.id !== id);
      setTasks(updated);
      if (typeof window !== "undefined") saveTasks(updated, userId);

      const { error } = await supabase.from("tasks").delete().eq("id", id);

      if (error) throw error;
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error("Failed to delete task") };
    }
  }, [tasks, userId]);

  const toggleTask = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return { error: new Error("Task not found") };

      const newStatus = task.status === "completed" ? "pending" : "completed";
      const completed_at = newStatus === "completed" ? new Date().toISOString() : null;
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

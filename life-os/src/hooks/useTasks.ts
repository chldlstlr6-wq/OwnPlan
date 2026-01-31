"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Task } from "@/types";
import { getStoredTasks, saveTasks } from "@/lib/storage";

export function useTasks(userId?: string) {
  const [tasks, setTasks] = useState<Task[]>(() => getStoredTasks([]));
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

  // 오프라인 중인 변경사항을 온라인 상태에서 Supabase에 upsert
  const syncLocalChanges = useCallback(async () => {
    if (!isOnline) return;

    try {
      const localTasks = getStoredTasks([]);
      if (localTasks.length === 0) return;

      for (const task of localTasks) {
        try {
          const { data: serverTask, error } = await supabase
            .from("tasks")
            .select("*")
            .eq("id", task.id)
            .single();

          if (!error && serverTask && new Date(task.updated_at) <= new Date(serverTask.updated_at)) {
            // 서버 데이터가 더 최신이면 스킵
            continue;
          }

          // 로컬이 더 최신이거나 서버에 없으면 upsert
          const { error: upsertError } = await supabase.from("tasks").upsert([task], { onConflict: "id" });
          if (upsertError) console.error(`Failed to sync task ${task.id}:`, upsertError);
        } catch (err) {
          console.error(`Failed to check/sync task ${task.id}:`, err);
        }
      }

      // 동기화 완료 후 서버에서 최신 데이터 다시 가져오기
      await fetchTasks();
    } catch (err) {
      console.error("Failed to sync local changes:", err);
    }
  }, [isOnline]);

  // 온라인/오프라인 상태 감지
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // 온라인 복구 시 로컬 변경사항 동기화
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        syncLocalChanges();
      }, 1000); // 1초 후 동기화 시작
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
      
      // 로컬 데이터와 서버 데이터 병합 (updated_at 기준)
      const local = getStoredTasks([]);
      const merged = mergeDataByTimestamp(local, data as Task[]);
      setTasks(merged);
      if (typeof window !== "undefined") saveTasks(merged);
    } catch (err) {
      console.error("Failed to fetch tasks from Supabase:", err);
      // Supabase 실패 시 로컬스토리지에서 폴백
      try {
        const stored = getStoredTasks([]);
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

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = useCallback(
    async (task: Omit<Task, "id" | "created_at" | "updated_at">) => {
      if (!userId) return { error: new Error("User not authenticated") };

      try {
        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from("tasks")
          .insert([{ ...task, user_id: userId, created_at: now, updated_at: now }])
          .select()
          .single();

        if (error) throw error;
        
        const newTasks = [data as Task, ...tasks];
        setTasks(newTasks);
        if (typeof window !== "undefined") saveTasks(newTasks);
        return { data, error: null };
      } catch (err) {
        // Supabase 실패 시 로컬 저장
        const now = new Date().toISOString();
        const newTask: Task = { ...(task as Task), id: Date.now().toString(), created_at: now, updated_at: now };
        const updated = [newTask, ...tasks];
        setTasks(updated);
        if (typeof window !== "undefined") saveTasks(updated);
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
      if (typeof window !== "undefined") saveTasks(updated);

      const { error } = await supabase
        .from("tasks")
        .update(updatesWithTimestamp)
        .eq("id", id);

      if (error) throw error;
      return { data: updated.find((t) => t.id === id) ?? null, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err : new Error("Failed to update task") };
    }
  }, [tasks]);

  const deleteTask = useCallback(async (id: string) => {
    try {
      const updated = tasks.filter((task) => task.id !== id);
      setTasks(updated);
      if (typeof window !== "undefined") saveTasks(updated);

      const { error } = await supabase.from("tasks").delete().eq("id", id);

      if (error) throw error;
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error("Failed to delete task") };
    }
  }, [tasks]);

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
    isOnline,
    fetchTasks,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    isLoaded: !loading,
  };
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Account } from "@/types";
import { getStoredAccounts, saveAccounts } from "@/lib/storage";
import { useAuthContext } from "@/components/providers/AuthProvider";

export function useAccounts() {
  const { user } = useAuthContext();
  const userId = user?.id;

  const [accounts, setAccounts] = useState<Account[]>(() =>
    getStoredAccounts([], userId) as Account[]
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" && navigator.onLine
  );
  const fetchingRef = useRef(false);

  const fetchAccounts = useCallback(async () => {
    if (!userId || fetchingRef.current) {
      setLoading(false);
      return;
    }
    fetchingRef.current = true;

    try {
      setLoading(true);

      const { data: serverData, error: fetchError } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (fetchError) throw fetchError;

      const serverRows = serverData || [];
      const serverMap = new Map(serverRows.map((r) => [r.id as string, r]));

      const local = getStoredAccounts([], userId) as Account[];
      const toPush = local.filter((a) => {
        const server = serverMap.get(a.id);
        if (!server) return true;
        return (
          a.updated_at &&
          new Date(a.updated_at) > new Date(server.updated_at as string)
        );
      });

      if (toPush.length > 0) {
        for (const account of toPush) {
          const payload = { ...account, user_id: userId };
          const { error: upsertErr } = await supabase
            .from("accounts")
            .upsert([payload], { onConflict: "id" });
          if (upsertErr)
            console.error(
              `Failed to push account ${account.id}:`,
              upsertErr
            );
        }
        const { data: freshData } = await supabase
          .from("accounts")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: true });
        const freshAccounts = (freshData || []) as Account[];
        setAccounts(freshAccounts);
        if (typeof window !== "undefined")
          saveAccounts(freshAccounts, userId);
      } else {
        const serverAccounts = serverRows as Account[];
        setAccounts(serverAccounts);
        if (typeof window !== "undefined")
          saveAccounts(serverAccounts, userId);
      }
    } catch (err) {
      console.error("Failed to fetch accounts:", err);
      try {
        const stored = getStoredAccounts([], userId) as Account[];
        setAccounts(stored);
      } catch {
        setAccounts([]);
      }
      setError(
        err instanceof Error ? err : new Error("Failed to fetch accounts")
      );
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [userId]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      fetchAccounts();
    };
    const handleOffline = () => setIsOnline(false);
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        fetchAccounts();
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
  }, [fetchAccounts]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const addAccount = useCallback(
    async (account: Omit<Account, "id" | "created_at" | "updated_at">) => {
      if (!userId) return { data: null, error: new Error("Not authenticated") };
      const now = new Date().toISOString();
      try {
        const payload = {
          ...account,
          user_id: userId,
          created_at: now,
          updated_at: now,
        };
        const { data, error } = await supabase
          .from("accounts")
          .insert([payload])
          .select()
          .single();
        if (error) throw error;

        const newAccount = data as Account;
        const updated = [...accounts, newAccount];
        setAccounts(updated);
        if (typeof window !== "undefined") saveAccounts(updated, userId);
        return { data: newAccount, error: null };
      } catch {
        const newAccount: Account = {
          ...account,
          id: Date.now().toString(),
          user_id: userId,
          created_at: now,
          updated_at: now,
        };
        const updated = [...accounts, newAccount];
        setAccounts(updated);
        if (typeof window !== "undefined") saveAccounts(updated, userId);
        return { data: newAccount, error: null };
      }
    },
    [userId, accounts]
  );

  const updateAccount = useCallback(
    async (id: string, updates: Partial<Account>) => {
      const now = new Date().toISOString();
      const updatesWithTimestamp = { ...updates, updated_at: now };

      const updated = accounts.map((account) =>
        account.id === id
          ? { ...account, ...updatesWithTimestamp }
          : account
      );
      setAccounts(updated);
      if (typeof window !== "undefined") saveAccounts(updated, userId);

      try {
        const { error } = await supabase
          .from("accounts")
          .update(updatesWithTimestamp)
          .eq("id", id);
        if (error) throw error;
        return {
          data: updated.find((a) => a.id === id) ?? null,
          error: null,
        };
      } catch (err) {
        return {
          data: null,
          error:
            err instanceof Error
              ? err
              : new Error("Failed to update account"),
        };
      }
    },
    [accounts, userId]
  );

  const deleteAccount = useCallback(
    async (id: string) => {
      const updated = accounts.filter((account) => account.id !== id);
      setAccounts(updated);
      if (typeof window !== "undefined") saveAccounts(updated, userId);

      try {
        const { error } = await supabase
          .from("accounts")
          .delete()
          .eq("id", id);
        if (error) throw error;
        return { error: null };
      } catch (err) {
        return {
          error:
            err instanceof Error
              ? err
              : new Error("Failed to delete account"),
        };
      }
    },
    [accounts, userId]
  );

  return {
    accounts,
    loading,
    error,
    isOnline,
    fetchAccounts,
    addAccount,
    updateAccount,
    deleteAccount,
    isLoaded: !loading,
  };
}

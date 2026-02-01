"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Account } from "@/types";
import { getStoredAccounts, saveAccounts } from "@/lib/storage";
import { useAuthContext } from "@/components/providers/AuthProvider";

export function useAccounts() {
  const { user } = useAuthContext();
  const userId = user?.id;

  const [accounts, setAccounts] = useState<Account[]>(() => getStoredAccounts([], userId));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" && navigator.onLine);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const mergeDataByTimestamp = useCallback((local: Account[], server: Account[]): Account[] => {
    const merged = new Map<string, Account>();

    local.forEach((a) => merged.set(a.id, a));

    server.forEach((s) => {
      const existing = merged.get(s.id);
      if (!existing || !existing.updated_at || !s.updated_at || new Date(s.updated_at) > new Date(existing.updated_at)) {
        merged.set(s.id, s);
      }
    });

    return Array.from(merged.values());
  }, []);

  const fetchAccounts = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const serverAccounts = (data || []) as Account[];
      const local = getStoredAccounts([], userId) as Account[];
      const merged = mergeDataByTimestamp(local, serverAccounts);
      setAccounts(merged);
      if (typeof window !== "undefined") saveAccounts(merged, userId);
    } catch (err) {
      console.error("Failed to fetch accounts from Supabase:", err);
      try {
        const stored = getStoredAccounts([], userId) as Account[];
        setAccounts(stored);
      } catch (fallbackErr) {
        console.error("Failed to load accounts from localStorage:", fallbackErr);
        setAccounts([]);
      }
      setError(err instanceof Error ? err : new Error("Failed to fetch accounts"));
    } finally {
      setLoading(false);
    }
  }, [userId, mergeDataByTimestamp]);

  const syncLocalChanges = useCallback(async () => {
    if (!isOnline || !userId) return;
    try {
      const localAccounts = getStoredAccounts([], userId) as Account[];
      if (localAccounts.length === 0) return;

      for (const account of localAccounts) {
        try {
          const { data: serverAccount, error } = await supabase
            .from("accounts")
            .select("*")
            .eq("id", account.id)
            .single();

          if (!error && serverAccount && account.updated_at && new Date(account.updated_at) <= new Date(serverAccount.updated_at as string)) {
            continue;
          }

          const payload = { ...account, user_id: userId };
          const { error: upsertError } = await supabase.from("accounts").upsert([payload], { onConflict: "id" });
          if (upsertError) console.error(`Failed to sync account ${account.id}:`, upsertError);
        } catch (err) {
          console.error(`Failed to check/sync account ${account.id}:`, err);
        }
      }

      await fetchAccounts();
    } catch (err) {
      console.error("Failed to sync local changes:", err);
    }
  }, [isOnline, userId, fetchAccounts]);

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
    fetchAccounts();
  }, [fetchAccounts]);

  const addAccount = useCallback(
    async (account: Omit<Account, "id" | "created_at" | "updated_at">) => {
      if (!userId) return { data: null, error: new Error("Not authenticated") };
      try {
        const now = new Date().toISOString();
        const payload = { ...account, user_id: userId, created_at: now, updated_at: now };
        const { data, error } = await supabase.from("accounts").insert([payload]).select().single();
        if (error) throw error;

        const newAccount = data as Account;
        const updated = [...accounts, newAccount];
        setAccounts(updated);
        if (typeof window !== "undefined") saveAccounts(updated, userId);
        return { data: newAccount, error: null };
      } catch (err) {
        const now = new Date().toISOString();
        const newAccount: Account = { ...account, id: Date.now().toString(), user_id: userId, created_at: now, updated_at: now };
        const updated = [...accounts, newAccount];
        setAccounts(updated);
        if (typeof window !== "undefined") saveAccounts(updated, userId);
        return { data: newAccount, error: null };
      }
    },
    [userId, accounts]
  );

  const updateAccount = useCallback(async (id: string, updates: Partial<Account>) => {
    try {
      const now = new Date().toISOString();
      const updatesWithTimestamp = { ...updates, updated_at: now };

      const updated = accounts.map((account) =>
        account.id === id ? { ...account, ...updatesWithTimestamp } : account
      );
      setAccounts(updated);
      if (typeof window !== "undefined") saveAccounts(updated, userId);

      const { error } = await supabase.from("accounts").update(updatesWithTimestamp).eq("id", id);
      if (error) throw error;
      return { data: updated.find((a) => a.id === id) ?? null, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err : new Error("Failed to update account") };
    }
  }, [accounts, userId]);

  const deleteAccount = useCallback(async (id: string) => {
    try {
      const updated = accounts.filter((account) => account.id !== id);
      setAccounts(updated);
      if (typeof window !== "undefined") saveAccounts(updated, userId);

      const { error } = await supabase.from("accounts").delete().eq("id", id);
      if (error) throw error;
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error("Failed to delete account") };
    }
  }, [accounts, userId]);

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

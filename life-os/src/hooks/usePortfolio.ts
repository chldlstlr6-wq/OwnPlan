"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { PortfolioItem } from "@/types";
import { getStoredPortfolio, savePortfolio } from "@/lib/storage";
import { useAuthContext } from "@/components/providers/AuthProvider";

// DB row → PortfolioItem
function fromDB(row: Record<string, unknown>): PortfolioItem {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    account_id: (row.account_id as string) || "",
    ticker: row.ticker as string,
    name: (row.name as string) || undefined,
    market: (row.market as PortfolioItem["market"]) || "KR",
    target_ratio: Number(row.target_ratio) || 0,
    current_quantity: Number(row.current_quantity) || 0,
    avg_price: Number(row.avg_price) || 0,
    created_at: row.created_at as string,
    updated_at: (row.updated_at as string) || undefined,
  };
}

// PortfolioItem → DB row (exclude current_price which is runtime only)
function toDB(item: Partial<PortfolioItem>): Record<string, unknown> {
  const row: Record<string, unknown> = { ...item };
  delete row.current_price; // runtime only, not synced
  return row;
}

export function usePortfolio() {
  const { user } = useAuthContext();
  const userId = user?.id;

  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(() => getStoredPortfolio([], userId));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" && navigator.onLine);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const mergeDataByTimestamp = useCallback((local: PortfolioItem[], server: PortfolioItem[]): PortfolioItem[] => {
    const merged = new Map<string, PortfolioItem>();

    local.forEach((p) => merged.set(p.id, p));

    server.forEach((s) => {
      const existing = merged.get(s.id);
      if (!existing || !existing.updated_at || !s.updated_at || new Date(s.updated_at) > new Date(existing.updated_at)) {
        merged.set(s.id, s);
      }
    });

    return Array.from(merged.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, []);

  const fetchPortfolio = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("portfolio")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const serverItems = (data || []).map((row) => fromDB(row as Record<string, unknown>));
      const local = getStoredPortfolio([], userId) as PortfolioItem[];
      const merged = mergeDataByTimestamp(local, serverItems);
      setPortfolio(merged);
      if (typeof window !== "undefined") savePortfolio(merged, userId);
    } catch (err) {
      console.error("Failed to fetch portfolio from Supabase:", err);
      try {
        const stored = getStoredPortfolio([], userId) as PortfolioItem[];
        setPortfolio(stored);
      } catch (fallbackErr) {
        console.error("Failed to load portfolio from localStorage:", fallbackErr);
        setPortfolio([]);
      }
      setError(err instanceof Error ? err : new Error("Failed to fetch portfolio"));
    } finally {
      setLoading(false);
    }
  }, [userId, mergeDataByTimestamp]);

  const syncLocalChanges = useCallback(async () => {
    if (!isOnline || !userId) return;
    try {
      const localItems = getStoredPortfolio([], userId) as PortfolioItem[];
      if (localItems.length === 0) return;

      for (const item of localItems) {
        try {
          const { data: serverItem, error } = await supabase
            .from("portfolio")
            .select("*")
            .eq("id", item.id)
            .single();

          if (!error && serverItem && item.updated_at && new Date(item.updated_at) <= new Date(serverItem.updated_at as string)) {
            continue;
          }

          const dbRow = toDB(item);
          const { error: upsertError } = await supabase.from("portfolio").upsert([dbRow], { onConflict: "id" });
          if (upsertError) console.error(`Failed to sync portfolio item ${item.id}:`, upsertError);
        } catch (err) {
          console.error(`Failed to check/sync portfolio item ${item.id}:`, err);
        }
      }

      await fetchPortfolio();
    } catch (err) {
      console.error("Failed to sync local changes:", err);
    }
  }, [isOnline, userId, fetchPortfolio]);

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
        fetchPortfolio();
      }
    };

    const handleFocus = () => {
      if (navigator.onLine) fetchPortfolio();
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
  }, [syncLocalChanges, fetchPortfolio]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const addPortfolioItem = useCallback(
    async (item: Omit<PortfolioItem, "id" | "created_at" | "updated_at">) => {
      if (!userId) return { data: null, error: new Error("Not authenticated") };
      try {
        const now = new Date().toISOString();
        const dbPayload = toDB({ ...item, user_id: userId, created_at: now, updated_at: now });
        const { data, error } = await supabase.from("portfolio").insert([dbPayload]).select().single();
        if (error) throw error;

        const newItem = fromDB(data as Record<string, unknown>);
        const updated = [...portfolio, newItem];
        setPortfolio(updated);
        if (typeof window !== "undefined") savePortfolio(updated, userId);
        return { data: newItem, error: null };
      } catch (err) {
        const now = new Date().toISOString();
        const newItem: PortfolioItem = { ...(item as PortfolioItem), id: Date.now().toString(), user_id: userId, created_at: now, updated_at: now };
        const updated = [...portfolio, newItem];
        setPortfolio(updated);
        if (typeof window !== "undefined") savePortfolio(updated, userId);
        return { data: newItem, error: null };
      }
    },
    [userId, portfolio]
  );

  const updatePortfolioItem = useCallback(async (id: string, updates: Partial<PortfolioItem>) => {
    try {
      const now = new Date().toISOString();
      const updatesWithTimestamp = { ...updates, updated_at: now };

      const updated = portfolio.map((item) =>
        item.id === id ? { ...item, ...updatesWithTimestamp } : item
      );
      setPortfolio(updated);
      if (typeof window !== "undefined") savePortfolio(updated, userId);

      const dbUpdates = toDB(updatesWithTimestamp);
      const { error } = await supabase.from("portfolio").update(dbUpdates).eq("id", id);
      if (error) throw error;
      return { data: updated.find((p) => p.id === id) ?? null, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err : new Error("Failed to update portfolio item") };
    }
  }, [portfolio, userId]);

  const deletePortfolioItem = useCallback(async (id: string) => {
    try {
      const updated = portfolio.filter((item) => item.id !== id);
      setPortfolio(updated);
      if (typeof window !== "undefined") savePortfolio(updated, userId);

      const { error } = await supabase.from("portfolio").delete().eq("id", id);
      if (error) throw error;
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error("Failed to delete portfolio item") };
    }
  }, [portfolio, userId]);

  const deletePortfolioItemsByAccount = useCallback(async (accountId: string) => {
    try {
      const updated = portfolio.filter((p) => p.account_id !== accountId);
      setPortfolio(updated);
      if (typeof window !== "undefined") savePortfolio(updated, userId);

      const { error } = await supabase.from("portfolio").delete().eq("account_id", accountId);
      if (error) throw error;
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error("Failed to delete portfolio items") };
    }
  }, [portfolio, userId]);

  // Update current_price locally (not synced to DB)
  const updateCurrentPrices = useCallback((prices: Record<string, { price: number }>) => {
    setPortfolio((prev) =>
      prev.map((item) => ({
        ...item,
        current_price: prices[item.ticker]?.price || item.current_price,
      }))
    );
  }, []);

  return {
    portfolio,
    loading,
    error,
    isOnline,
    fetchPortfolio,
    addPortfolioItem,
    updatePortfolioItem,
    deletePortfolioItem,
    deletePortfolioItemsByAccount,
    updateCurrentPrices,
    setPortfolio,
    isLoaded: !loading,
  };
}

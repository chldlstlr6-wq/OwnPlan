"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { PortfolioItem } from "@/types";
import { getStoredPortfolio, savePortfolio } from "@/lib/storage";
import { useAuthContext } from "@/components/providers/AuthProvider";

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

function toDB(item: Partial<PortfolioItem>): Record<string, unknown> {
  const row: Record<string, unknown> = { ...item };
  delete row.current_price;
  return row;
}

export function usePortfolio() {
  const { user } = useAuthContext();
  const userId = user?.id;

  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(() =>
    getStoredPortfolio([], userId) as PortfolioItem[]
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" && navigator.onLine
  );
  const fetchingRef = useRef(false);

  const fetchPortfolio = useCallback(async () => {
    if (!userId || fetchingRef.current) {
      setLoading(false);
      return;
    }
    fetchingRef.current = true;

    try {
      setLoading(true);

      const { data: serverData, error: fetchError } = await supabase
        .from("portfolio")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      const serverRows = serverData || [];
      const serverMap = new Map(serverRows.map((r) => [r.id as string, r]));

      const local = getStoredPortfolio([], userId) as PortfolioItem[];
      const toPush = local.filter((p) => {
        const server = serverMap.get(p.id);
        if (!server) return true;
        return (
          p.updated_at &&
          new Date(p.updated_at) > new Date(server.updated_at as string)
        );
      });

      if (toPush.length > 0) {
        for (const item of toPush) {
          const { error: upsertErr } = await supabase
            .from("portfolio")
            .upsert([toDB(item)], { onConflict: "id" });
          if (upsertErr)
            console.error(`Failed to push portfolio ${item.id}:`, upsertErr);
        }
        const { data: freshData } = await supabase
          .from("portfolio")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        const freshItems = (freshData || []).map((r) =>
          fromDB(r as Record<string, unknown>)
        );
        setPortfolio(freshItems);
        if (typeof window !== "undefined") savePortfolio(freshItems, userId);
      } else {
        const serverItems = serverRows.map((r) =>
          fromDB(r as Record<string, unknown>)
        );
        setPortfolio(serverItems);
        if (typeof window !== "undefined") savePortfolio(serverItems, userId);
      }
    } catch (err) {
      console.error("Failed to fetch portfolio:", err);
      try {
        const stored = getStoredPortfolio([], userId) as PortfolioItem[];
        setPortfolio(stored);
      } catch {
        setPortfolio([]);
      }
      setError(
        err instanceof Error ? err : new Error("Failed to fetch portfolio")
      );
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [userId]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      fetchPortfolio();
    };
    const handleOffline = () => setIsOnline(false);
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        fetchPortfolio();
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
  }, [fetchPortfolio]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const addPortfolioItem = useCallback(
    async (item: Omit<PortfolioItem, "id" | "created_at" | "updated_at">) => {
      if (!userId) return { data: null, error: new Error("Not authenticated") };
      const now = new Date().toISOString();
      try {
        const dbPayload = toDB({
          ...item,
          user_id: userId,
          created_at: now,
          updated_at: now,
        });
        const { data, error } = await supabase
          .from("portfolio")
          .insert([dbPayload])
          .select()
          .single();
        if (error) throw error;

        const newItem = fromDB(data as Record<string, unknown>);
        const updated = [...portfolio, newItem];
        setPortfolio(updated);
        if (typeof window !== "undefined") savePortfolio(updated, userId);
        return { data: newItem, error: null };
      } catch {
        const newItem: PortfolioItem = {
          ...(item as PortfolioItem),
          id: Date.now().toString(),
          user_id: userId,
          created_at: now,
          updated_at: now,
        };
        const updated = [...portfolio, newItem];
        setPortfolio(updated);
        if (typeof window !== "undefined") savePortfolio(updated, userId);
        return { data: newItem, error: null };
      }
    },
    [userId, portfolio]
  );

  const updatePortfolioItem = useCallback(
    async (id: string, updates: Partial<PortfolioItem>) => {
      const now = new Date().toISOString();
      const updatesWithTimestamp = { ...updates, updated_at: now };

      const updated = portfolio.map((item) =>
        item.id === id ? { ...item, ...updatesWithTimestamp } : item
      );
      setPortfolio(updated);
      if (typeof window !== "undefined") savePortfolio(updated, userId);

      try {
        const dbUpdates = toDB(updatesWithTimestamp);
        const { error } = await supabase
          .from("portfolio")
          .update(dbUpdates)
          .eq("id", id);
        if (error) throw error;
        return {
          data: updated.find((p) => p.id === id) ?? null,
          error: null,
        };
      } catch (err) {
        return {
          data: null,
          error:
            err instanceof Error
              ? err
              : new Error("Failed to update portfolio item"),
        };
      }
    },
    [portfolio, userId]
  );

  const deletePortfolioItem = useCallback(
    async (id: string) => {
      const updated = portfolio.filter((item) => item.id !== id);
      setPortfolio(updated);
      if (typeof window !== "undefined") savePortfolio(updated, userId);

      try {
        const { error } = await supabase
          .from("portfolio")
          .delete()
          .eq("id", id);
        if (error) throw error;
        return { error: null };
      } catch (err) {
        return {
          error:
            err instanceof Error
              ? err
              : new Error("Failed to delete portfolio item"),
        };
      }
    },
    [portfolio, userId]
  );

  const deletePortfolioItemsByAccount = useCallback(
    async (accountId: string) => {
      const updated = portfolio.filter((p) => p.account_id !== accountId);
      setPortfolio(updated);
      if (typeof window !== "undefined") savePortfolio(updated, userId);

      try {
        const { error } = await supabase
          .from("portfolio")
          .delete()
          .eq("account_id", accountId);
        if (error) throw error;
        return { error: null };
      } catch (err) {
        return {
          error:
            err instanceof Error
              ? err
              : new Error("Failed to delete portfolio items"),
        };
      }
    },
    [portfolio, userId]
  );

  const updateCurrentPrices = useCallback(
    (prices: Record<string, { price: number }>) => {
      setPortfolio((prev) =>
        prev.map((item) => ({
          ...item,
          current_price: prices[item.ticker]?.price || item.current_price,
        }))
      );
    },
    []
  );

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

"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { BottomNavigation, PageHeader } from "@/components/layout";
import { Button, BottomSheet, Input, Card } from "@/components/ui";
import { PortfolioItem, MarketType, ExchangeRate, Account } from "@/types";
import { cn } from "@/lib/utils";
import { getStoredPortfolio, savePortfolio, getStoredAccounts, saveAccounts } from "@/lib/storage";

const CASH_TICKER = "__CASH__";

export const initialAccounts: Account[] = [
  { id: "acc1", name: "키움증권", cash: 500000 },
  { id: "acc2", name: "토스증권", cash: 300000 },
];

export const initialPortfolio: PortfolioItem[] = [
  // 현금 항목
  {
    id: "cash1",
    user_id: "user1",
    account_id: "acc1",
    ticker: CASH_TICKER,
    name: "현금",
    market: "KR" as MarketType,
    target_ratio: 10,
    current_quantity: 0,
    avg_price: 500000,
    current_price: undefined,
    created_at: new Date().toISOString(),
  },
  {
    id: "cash2",
    user_id: "user1",
    account_id: "acc1",
    ticker: CASH_TICKER,
    name: "현금",
    market: "US" as MarketType,
    target_ratio: 5,
    current_quantity: 0,
    avg_price: 10000,
    current_price: undefined,
    created_at: new Date().toISOString(),
  },
  {
    id: "cash3",
    user_id: "user1",
    account_id: "acc2",
    ticker: CASH_TICKER,
    name: "현금",
    market: "KR" as MarketType,
    target_ratio: 5,
    current_quantity: 0,
    avg_price: 300000,
    current_price: undefined,
    created_at: new Date().toISOString(),
  },
  {
    id: "1",
    user_id: "user1",
    account_id: "acc1",
    ticker: "005930.KS",
    name: "삼성전자",
    market: "KR",
    target_ratio: 30,
    current_quantity: 100,
    avg_price: 65000,
    current_price: undefined,
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    user_id: "user1",
    account_id: "acc2",
    ticker: "AAPL",
    name: "Apple",
    market: "US",
    target_ratio: 40,
    current_quantity: 10,
    avg_price: 150,
    current_price: undefined,
    created_at: new Date().toISOString(),
  },
  {
    id: "3",
    user_id: "user1",
    account_id: "acc1",
    ticker: "069500.KS",
    name: "KODEX 200",
    market: "KR",
    target_ratio: 20,
    current_quantity: 30,
    avg_price: 32000,
    current_price: undefined,
    created_at: new Date().toISOString(),
  },
  {
    id: "4",
    user_id: "user1",
    account_id: "acc2",
    ticker: "MSFT",
    name: "Microsoft",
    market: "US",
    target_ratio: 10,
    current_quantity: 5,
    avg_price: 380,
    current_price: undefined,
    created_at: new Date().toISOString(),
  },
];

const ACCOUNT_COLORS: Record<string, { bg: string; text: string; bar: string; badge: string }> = {};
const COLOR_PALETTE = [
  { bg: "bg-indigo-50", text: "text-indigo-700", bar: "bg-indigo-500", badge: "bg-indigo-100 text-indigo-700" },
  { bg: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700" },
  { bg: "bg-amber-50", text: "text-amber-700", bar: "bg-amber-500", badge: "bg-amber-100 text-amber-700" },
  { bg: "bg-rose-50", text: "text-rose-700", bar: "bg-rose-500", badge: "bg-rose-100 text-rose-700" },
  { bg: "bg-cyan-50", text: "text-cyan-700", bar: "bg-cyan-500", badge: "bg-cyan-100 text-cyan-700" },
];

function getAccountColor(accountId: string, index: number) {
  if (!ACCOUNT_COLORS[accountId]) {
    ACCOUNT_COLORS[accountId] = COLOR_PALETTE[index % COLOR_PALETTE.length];
  }
  return ACCOUNT_COLORS[accountId];
}

export default function PortfolioPage() {
  const [accounts, setAccounts] = useState<Account[]>(() => getStoredAccounts(initialAccounts));
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(() => getStoredPortfolio(initialPortfolio));
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountCash, setNewAccountCash] = useState("");
  const [isCashMode, setIsCashMode] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState<"KRW" | "USD">("KRW");
  const [newItem, setNewItem] = useState({
    account_id: accounts[0]?.id || "",
    ticker: "",
    name: "",
    market: "KR" as MarketType,
    target_ratio: "",
    current_quantity: "",
    avg_price: "",
  });

  // --- 가격/환율 조회 ---
  const fetchPrices = useCallback(async () => {
    if (portfolio.length === 0) return;
    setIsLoading(true);
    try {
      const exchangeRes = await fetch("/api/exchange");
      const exchangeData = await exchangeRes.json();
      setExchangeRate(exchangeData);

      const symbols = [...new Set(portfolio.map((p) => p.ticker))].join(",");
      const stockRes = await fetch(`/api/stock?symbols=${encodeURIComponent(symbols)}`);
      const stockData = await stockRes.json();

      if (stockData.prices) {
        setPortfolio((prev) =>
          prev.map((item) => ({
            ...item,
            current_price: stockData.prices[item.ticker]?.price || item.current_price,
          }))
        );
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch prices:", err);
    } finally {
      setIsLoading(false);
    }
  }, [portfolio.length]);

  useEffect(() => {
    fetchPrices();
  }, []);

  // --- 계산 유틸 ---
  const getItemValueKRW = useCallback(
    (item: PortfolioItem) => {
      if (item.ticker === CASH_TICKER) {
        // 현금이 달러면 환율을 곱해서 원으로 변환
        if (item.market === "US" && exchangeRate) {
          return item.avg_price * exchangeRate.usd_krw;
        }
        // 현금이 원이면 그대로 반환
        return item.avg_price;
      }
      const price = item.current_price || item.avg_price;
      const value = price * item.current_quantity;
      return item.market === "US" && exchangeRate ? value * exchangeRate.usd_krw : value;
    },
    [exchangeRate]
  );

  // 값을 선택된 통화로 변환
  const convertToDisplayCurrency = useCallback(
    (valueKRW: number): number => {
      if (displayCurrency === "KRW") return valueKRW;
      return exchangeRate ? valueKRW / exchangeRate.usd_krw : valueKRW;
    },
    [displayCurrency, exchangeRate]
  );

  const formatCurrency = (value: number, isCash = false): string => {
    const displayValue = convertToDisplayCurrency(value);
    const symbol = displayCurrency === "USD" ? "$" : "₩";
    if (isCash || displayCurrency === "KRW") {
      return `${symbol}${Math.round(displayValue).toLocaleString()}`;
    } else {
      return `${symbol}${displayValue.toFixed(2)}`;
    }
  };

  const totalValueKRW = useMemo(
    () => portfolio.reduce((sum, item) => sum + getItemValueKRW(item), 0),
    [portfolio, getItemValueKRW]
  );

  const getGlobalRatio = (item: PortfolioItem) => {
    if (totalValueKRW === 0) return 0;
    return (getItemValueKRW(item) / totalValueKRW) * 100;
  };

  const getProfitPercent = (item: PortfolioItem) => {
    if (item.ticker === CASH_TICKER) {
      return 0; // 현금은 수익률이 없음
    }
    const currentPrice = item.current_price || item.avg_price;
    return item.avg_price > 0 ? ((currentPrice - item.avg_price) / item.avg_price) * 100 : 0;
  };

  // --- 종목별 비율 (전체 포트폴리오 기준) ---
  const tickerRatios = useMemo(() => {
    if (totalValueKRW === 0) return [];
    const tickerMap = new Map<string, { name: string; value: number; items: PortfolioItem[]; targetRatio: number }>();
    for (const item of portfolio) {
      // 현금은 종목별 비율에서 제외
      if (item.ticker === CASH_TICKER) continue;
      
      const value = getItemValueKRW(item);
      const existing = tickerMap.get(item.ticker);
      if (existing) {
        existing.value += value;
        existing.items.push(item);
      } else {
        tickerMap.set(item.ticker, {
          name: item.name || item.ticker,
          value,
          items: [item],
          targetRatio: item.target_ratio,
        });
      }
    }
    return [...tickerMap.entries()]
      .map(([ticker, data]) => ({
        ticker,
        name: data.name,
        value: data.value,
        ratio: (data.value / totalValueKRW) * 100,
        targetRatio: data.targetRatio,
        accountCount: data.items.length,
        items: data.items,
      }))
      .sort((a, b) => b.ratio - a.ratio);
  }, [portfolio, totalValueKRW, getItemValueKRW]);

  // --- 계좌별 종목 비율 ---
  const accountTickerRatios = useMemo(() => {
    const result = new Map<string, Array<{ name: string; ratio: number; value: number; item: PortfolioItem }>>();
    for (const account of accounts) {
      const items = portfolio.filter((p) => p.account_id === account.id);
      const accountTotal = items.reduce((sum, item) => sum + getItemValueKRW(item), 0);
      if (accountTotal > 0) {
        const ratios = items.map((item) => {
          const value = getItemValueKRW(item);
          return {
            name: item.name || item.ticker,
            ratio: (value / accountTotal) * 100,
            value,
            item,
          };
        });
        result.set(account.id, ratios.sort((a, b) => b.ratio - a.ratio));
      }
    }
    return result;
  }, [accounts, portfolio, getItemValueKRW]);

  // --- 계좌별 그룹 ---
  const accountGroups = useMemo(() => {
    return accounts.map((account, idx) => {
      const items = portfolio.filter((p) => p.account_id === account.id);
      const totalKRW = items.reduce((sum, item) => sum + getItemValueKRW(item), 0);
      const totalCost = items
        .filter((item) => item.ticker !== CASH_TICKER)
        .reduce((sum, item) => {
          const cost = item.avg_price * item.current_quantity;
          return sum + (item.market === "US" && exchangeRate ? cost * exchangeRate.usd_krw : cost);
        }, 0);
      const profitKRW = totalKRW - totalCost;
      const profitPercent = totalCost > 0 ? (profitKRW / totalCost) * 100 : 0;
      const ratioOfTotal = totalValueKRW > 0 ? (totalKRW / totalValueKRW) * 100 : 0;
      const color = getAccountColor(account.id, idx);

      // 현금 분리 (KRW/USD)
      const cashKRW = items
        .filter((p) => p.ticker === CASH_TICKER && p.market === "KR")
        .reduce((sum, item) => sum + item.avg_price, 0);
      const cashUSD = items
        .filter((p) => p.ticker === CASH_TICKER && p.market === "US")
        .reduce((sum, item) => sum + item.avg_price, 0);

      return { account, items, totalKRW, profitKRW, profitPercent, ratioOfTotal, color, cashKRW, cashUSD };
    });
  }, [accounts, portfolio, getItemValueKRW, exchangeRate, totalValueKRW]);

  // --- 전체 비중 기준 리밸런싱 (같은 ticker 합산) ---
  const rebalanceSuggestions = useMemo(() => {
    if (!exchangeRate) return [];
    const tickerMap = new Map<string, { name: string; target: number; currentRatio: number }>();
    for (const item of portfolio) {
      const key = item.ticker;
      const ratio = getGlobalRatio(item);
      const existing = tickerMap.get(key);
      if (existing) {
        existing.currentRatio += ratio;
      } else {
        tickerMap.set(key, {
          name: item.name || item.ticker,
          target: item.target_ratio,
          currentRatio: ratio,
        });
      }
    }
    return [...tickerMap.entries()]
      .map(([ticker, data]) => ({
        ticker,
        name: data.name,
        target: data.target,
        currentRatio: data.currentRatio,
        deviation: data.currentRatio - data.target,
      }))
      .filter((s) => Math.abs(s.deviation) > 2);
  }, [portfolio, exchangeRate, totalValueKRW]);

  const targetRatioSum = useMemo(() => {
    const seen = new Set<string>();
    let sum = 0;
    for (const item of portfolio) {
      if (!seen.has(item.ticker)) {
        seen.add(item.ticker);
        sum += item.target_ratio;
      }
    }
    return sum;
  }, [portfolio]);

  // --- CRUD ---
  const handleDelete = (id: string) => {
    setPortfolio((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      savePortfolio(updated);
      return updated;
    });
  };

  const handleEdit = (item: PortfolioItem) => {
    setEditingItem(item);
    const isCash = item.ticker === CASH_TICKER;
    setIsCashMode(isCash);
    setNewItem({
      account_id: item.account_id,
      ticker: item.ticker,
      name: item.name || "",
      market: item.market,
      target_ratio: item.target_ratio.toString(),
      current_quantity: item.current_quantity.toString(),
      avg_price: item.avg_price.toString(),
    });
    setIsAddSheetOpen(true);
  };

  const handleSave = () => {
    const avgPrice = parseFloat(newItem.avg_price);
    const targetRatio = parseFloat(newItem.target_ratio);
    
    // 현금 모드: ticker 체크 불필요, 가격과 목표비중만 확인
    // 종목 모드: ticker 필수
    if (!newItem.account_id || !newItem.target_ratio) return;
    if (!isCashMode && !newItem.ticker.trim()) return;
    if (isNaN(avgPrice) || isNaN(targetRatio)) return;

    if (editingItem) {
      setPortfolio((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                account_id: newItem.account_id,
                ticker: isCashMode ? CASH_TICKER : newItem.ticker,
                name: isCashMode ? "현금" : newItem.name || undefined,
                market: newItem.market,
                target_ratio: targetRatio,
                current_quantity: isCashMode ? 0 : parseInt(newItem.current_quantity) || 0,
                avg_price: avgPrice,
              }
            : item
        )
      );
    } else {
      const item: PortfolioItem = {
        id: Date.now().toString(),
        user_id: "user1",
        account_id: newItem.account_id,
        ticker: isCashMode ? CASH_TICKER : newItem.ticker,
        name: isCashMode ? "현금" : newItem.name || undefined,
        market: newItem.market,
        target_ratio: targetRatio,
        current_quantity: isCashMode ? 0 : parseInt(newItem.current_quantity) || 0,
        avg_price: avgPrice,
        created_at: new Date().toISOString(),
      };
      setPortfolio((prev) => {
        const updated = [...prev, item];
        savePortfolio(updated);
        return updated;
      });
    }

    resetForm();
    setTimeout(fetchPrices, 500);
  };

  const handleAddAccount = () => {
    if (!newAccountName.trim()) return;
    const account: Account = { 
      id: Date.now().toString(), 
      name: newAccountName.trim(),
      cash: parseFloat(newAccountCash) || 0,
    };
    setAccounts((prev) => {
      const updated = [...prev, account];
      saveAccounts(updated);
      return updated;
    });
    setNewAccountName("");
    setNewAccountCash("");
    setIsAccountSheetOpen(false);
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setNewAccountName(account.name);
    setNewAccountCash(account.cash.toString());
  };

  const handleSaveAccount = () => {
    if (!editingAccount || !newAccountName.trim()) return;
    setAccounts((prev) => {
      const updated = prev.map((a) =>
        a.id === editingAccount.id
          ? { ...a, name: newAccountName.trim(), cash: parseFloat(newAccountCash) || 0 }
          : a
      );
      saveAccounts(updated);
      return updated;
    });
    setEditingAccount(null);
    setNewAccountName("");
    setNewAccountCash("");
  };

  const handleDeleteAccount = (id: string) => {
    setAccounts((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      saveAccounts(updated);
      return updated;
    });
    setPortfolio((prev) => {
      const updated = prev.filter((p) => p.account_id !== id);
      savePortfolio(updated);
      return updated;
    });
  };

  const resetForm = () => {
    setNewItem({
      account_id: accounts[0]?.id || "",
      ticker: "",
      name: "",
      market: "KR",
      target_ratio: "",
      current_quantity: "",
      avg_price: "",
    });
    setEditingItem(null);
    setIsAddSheetOpen(false);
    setEditingAccount(null);
    setNewAccountName("");
    setNewAccountCash("");
    setIsCashMode(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <PageHeader
        title="자산 관리"
        subtitle={formatCurrency(totalValueKRW)}
        action={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={fetchPrices} disabled={isLoading}>
              {isLoading ? "..." : "새로고침"}
            </Button>
            <Button size="sm" onClick={() => setIsAddSheetOpen(true)}>
              + 종목
            </Button>
          </div>
        }
      />

      <main className="px-4 space-y-6">
        {/* 환율 & 업데이트 시간 & 통화 선택 */}
        <div className="flex items-center justify-between text-sm">
          <div className="text-slate-500">
            환율: <span className="text-slate-900 font-medium">$1 = ₩{exchangeRate?.usd_krw?.toLocaleString() || "-"}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDisplayCurrency("KRW")}
              className={cn(
                "px-2 py-1 rounded text-xs font-medium transition-colors",
                displayCurrency === "KRW"
                  ? "bg-indigo-500 text-white"
                  : "bg-slate-200 text-slate-600 hover:bg-slate-300"
              )}
            >
              KRW
            </button>
            <button
              onClick={() => setDisplayCurrency("USD")}
              className={cn(
                "px-2 py-1 rounded text-xs font-medium transition-colors",
                displayCurrency === "USD"
                  ? "bg-indigo-500 text-white"
                  : "bg-slate-200 text-slate-600 hover:bg-slate-300"
              )}
            >
              USD
            </button>
          </div>
          {lastUpdated && (
            <div className="text-slate-400">
              {lastUpdated.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 업데이트
            </div>
          )}
        </div>

        {/* 전체 포트폴리오 요약 */}
        <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">전체 포트폴리오</h3>
            {targetRatioSum !== 100 && (
              <span className="text-xs px-2 py-1 rounded-full bg-white/20">
                목표 합계: {targetRatioSum}%
              </span>
            )}
          </div>

          {/* 종목별 비율 바 */}
          <div className="h-3 bg-white/20 rounded-full overflow-hidden flex">
            {tickerRatios.map((t, idx) => {
              const colors = [
                "bg-red-400", "bg-orange-400", "bg-amber-400", "bg-yellow-300", "bg-lime-400",
                "bg-green-400", "bg-emerald-400", "bg-teal-400", "bg-cyan-400", "bg-sky-400",
                "bg-blue-400", "bg-indigo-400", "bg-violet-400", "bg-purple-400", "bg-pink-400",
              ];
              return (
                <div
                  key={t.ticker}
                  className={colors[idx % colors.length]}
                  style={{ width: `${t.ratio}%` }}
                  title={`${t.name}: ${t.ratio.toFixed(1)}% (${t.accountCount}계좌)`}
                />
              );
            })}
            {totalValueKRW > 0 && (
              <div
                className="bg-white/30"
                style={{ width: `${(portfolio.filter(p => p.ticker === CASH_TICKER).reduce((sum, item) => sum + getItemValueKRW(item), 0) / totalValueKRW) * 100}%` }}
                title={`현금: ${((portfolio.filter(p => p.ticker === CASH_TICKER).reduce((sum, item) => sum + getItemValueKRW(item), 0) / totalValueKRW) * 100).toFixed(1)}%`}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            {tickerRatios.map((t, idx) => {
              const colors = [
                "bg-red-400", "bg-orange-400", "bg-amber-400", "bg-yellow-300", "bg-lime-400",
                "bg-green-400", "bg-emerald-400", "bg-teal-400", "bg-cyan-400", "bg-sky-400",
                "bg-blue-400", "bg-indigo-400", "bg-violet-400", "bg-purple-400", "bg-pink-400",
              ];
              return (
                <div key={t.ticker} className="flex items-center gap-2">
                  <div className={cn("w-2.5 h-2.5 rounded-full", colors[idx % colors.length])} />
                  <span className="text-xs text-white/90">
                    {t.name} {t.ratio.toFixed(1)}%
                  </span>
                </div>
              );
            })}
            {totalValueKRW > 0 && portfolio.filter(p => p.ticker === CASH_TICKER).length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
                <span className="text-xs text-white/90">
                  현금 {((portfolio.filter(p => p.ticker === CASH_TICKER).reduce((sum, item) => sum + getItemValueKRW(item), 0) / totalValueKRW) * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>

          {/* 다중 계좌에 있는 종목 경고 */}
          {tickerRatios.some(t => t.accountCount > 1) && (
            <div className="mt-4 pt-4 border-t border-white/20 text-xs text-white/80">
              <span className="block">📌 다음 종목들은 여러 계좌에 있습니다:</span>
              <div className="mt-2 space-y-1">
                {tickerRatios.filter(t => t.accountCount > 1).map(t => (
                  <div key={t.ticker} className="text-white/70">
                    • {t.name}: {t.items.map(item => {
                      const acc = accounts.find(a => a.id === item.account_id);
                      return `${acc?.name}(목표 ${item.target_ratio}%)`;
                    }).join(", ")}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* 리밸런싱 경고 (전체 비율 기준) */}
        {rebalanceSuggestions.length > 0 && (
          <Card variant="outlined" className="border-amber-200 bg-amber-50">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-amber-800 font-medium">리밸런싱 필요</h4>
                <p className="text-sm text-amber-700 mt-1">전체 포트폴리오 기준 목표 비중에서 2% 이상 벗어난 종목이 있습니다.</p>
                <div className="mt-3 space-y-2">
                  {rebalanceSuggestions.map((s) => (
                    <div
                      key={s.ticker}
                      className={cn(
                        "text-sm px-3 py-2 rounded-lg",
                        s.deviation > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                      )}
                    >
                      {s.name}: 현재 {s.currentRatio.toFixed(1)}% / 목표 {s.target}%
                      <span className="font-medium ml-1">
                        ({s.deviation > 0 ? "+" : ""}{s.deviation.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* 계좌 관리 */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">계좌별 자산</h2>
          <Button size="sm" variant="ghost" onClick={() => setIsAccountSheetOpen(true)}>
            + 계좌
          </Button>
        </div>

        {/* 계좌별 섹션 */}
        {accountGroups.map((group) => (
          <section key={group.account.id}>
            {/* 계좌 헤더 카드 */}
            <Card variant="outlined" className={cn("mb-3", group.color.bg)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", group.color.bar)} />
                  <h3 className={cn("font-semibold", group.color.text)}>{group.account.name}</h3>
                  <span className="text-xs text-slate-400">
                    {group.items.length}종목
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteAccount(group.account.id)}
                  className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                <div>
                  <span className="text-slate-400">평가금액</span>
                  <p className="text-slate-900 font-semibold">{formatCurrency(group.totalKRW)}</p>
                </div>
                <div>
                  <span className="text-slate-400">수익금</span>
                  <p className={cn(
                    "font-semibold",
                    group.profitKRW > 0 ? "text-red-500" : group.profitKRW < 0 ? "text-blue-500" : "text-slate-500"
                  )}>
                    {group.profitKRW > 0 ? "+" : ""}{formatCurrency(Math.abs(group.profitKRW))}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">수익률</span>
                  <p className={cn(
                    "font-semibold",
                    group.profitPercent > 0 ? "text-red-500" : group.profitPercent < 0 ? "text-blue-500" : "text-slate-500"
                  )}>
                    {group.profitPercent > 0 ? "+" : ""}{group.profitPercent.toFixed(2)}%
                  </p>
                </div>
              </div>

              {/* 현금 표시 */}
              {(group.cashKRW > 0 || group.cashUSD > 0) && (
                <div className="mt-3 pt-3 border-t border-slate-200/50">
                  <div className="text-xs text-slate-400 mb-2">현금</div>
                  <div className="flex gap-3">
                    {group.cashKRW > 0 && (
                      <div className="text-sm">
                        <span className="text-slate-500">₩</span>
                        <span className="text-slate-900 font-semibold">{group.cashKRW.toLocaleString()}</span>
                      </div>
                    )}
                    {group.cashUSD > 0 && (
                      <div className="text-sm">
                        <span className="text-slate-500">$</span>
                        <span className="text-slate-900 font-semibold">{group.cashUSD.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            {/* 전체 대비 비중 */}
              <div className="mt-3 pt-3 border-t border-slate-200/50">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>전체 대비</span>
                  <span>{group.ratioOfTotal.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", group.color.bar)} style={{ width: `${group.ratioOfTotal}%` }} />
                </div>
              </div>
            </Card>

            {/* 계좌 내 종목 비율 */}
            {group.items.length > 0 && (
              <Card variant="outlined" className={cn("mb-3 ml-2", group.color.bg)}>
                <h4 className={cn("text-sm font-semibold mb-3", group.color.text)}>종목별 비중</h4>
                {(() => {
                  const accountRatios = accountTickerRatios.get(group.account.id) || [];
                  const colors = [
                    "bg-red-400", "bg-orange-400", "bg-amber-400", "bg-yellow-300", "bg-lime-400",
                    "bg-green-400", "bg-emerald-400", "bg-teal-400", "bg-cyan-400", "bg-sky-400",
                  ];
                  return (
                    <div className="space-y-3">
                      {/* 비율 바 */}
                      <div className="h-6 bg-slate-200/50 rounded-full overflow-hidden flex">
                        {accountRatios.map((t, idx) => (
                          <div
                            key={t.item ? t.item.id : 'cash'}
                            className={colors[idx % colors.length]}
                            style={{ width: `${t.ratio}%` }}
                            title={`${t.name}: ${t.ratio.toFixed(1)}%`}
                          />
                        ))}
                      </div>
                      {/* 범례 */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {accountRatios.map((t, idx) => (
                          <div key={t.item ? t.item.id : 'cash'} className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", colors[idx % colors.length])} />
                            <span className="text-slate-600">
                              {t.name} {t.ratio.toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </Card>
            )}

            {/* 계좌 내 종목 목록 */}
            {group.items.length > 0 ? (
              <div className="space-y-2 ml-2 pl-3 border-l-2 border-slate-100">
                {group.items.map((item) => {
                  const globalRatio = getGlobalRatio(item);
                  const profitPercent = getProfitPercent(item);
                  const price = item.current_price || item.avg_price;
                  const valueKRW = getItemValueKRW(item);
                  const isCash = item.ticker === CASH_TICKER;

                  return (
                    <Card
                      key={item.id}
                      variant="outlined"
                      onClick={() => handleEdit(item)}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-slate-900">{item.name || item.ticker}</h4>
                            {!isCash && (
                              <span className={cn(
                                "text-xs px-1.5 py-0.5 rounded font-medium",
                                item.market === "US" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                              )}>
                                {item.market}
                              </span>
                            )}
                            {isCash && (
                              <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-green-100 text-green-700">
                                현금
                              </span>
                            )}
                          </div>
                          {!isCash && <p className="text-xs text-slate-400">{item.ticker}</p>}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                          className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {isCash ? (
                        <div className="grid grid-cols-1 gap-2 text-sm">
                          <div>
                            <span className="text-slate-400 text-xs">현금액</span>
                            <p className="text-slate-900 font-medium">
                              {item.market === "US" ? "$" : "₩"}{item.avg_price.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-slate-400 text-xs">현재가</span>
                            <p className="text-slate-900 font-medium">
                              {item.market === "US" ? "$" : "₩"}{price?.toLocaleString() || "-"}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-400 text-xs">수량 / 평단</span>
                            <p className="text-slate-900 font-medium">
                              {item.current_quantity}주 / {item.market === "US" ? "$" : "₩"}{item.avg_price.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-sm">
                        <span className="text-slate-400">
                          {formatCurrency(valueKRW, isCash)}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400 text-xs">
                            비중 {globalRatio.toFixed(1)}% / 목표 {item.target_ratio}%
                          </span>
                          {!isCash && (
                            <span className={cn(
                              "font-semibold",
                              profitPercent > 0 ? "text-red-500" : profitPercent < 0 ? "text-blue-500" : "text-slate-500"
                            )}>
                              {profitPercent > 0 ? "+" : ""}{profitPercent.toFixed(2)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="text-center py-6 ml-2">
                <p className="text-slate-400 text-sm">이 계좌에 종목이 없습니다</p>
              </Card>
            )}
          </section>
        ))}

        {accounts.length === 0 && (
          <Card className="text-center py-12">
            <p className="text-slate-400">계좌를 먼저 추가하세요</p>
            <Button variant="ghost" className="mt-2" onClick={() => setIsAccountSheetOpen(true)}>
              + 계좌 추가하기
            </Button>
          </Card>
        )}
      </main>

      {/* 계좌 추가 시트 */}
      <BottomSheet
        isOpen={isAccountSheetOpen}
        onClose={() => { setIsAccountSheetOpen(false); setEditingAccount(null); setNewAccountName(""); setNewAccountCash(""); }}
        title={editingAccount ? "계좌 수정" : "계좌 추가"}
      >
        <div className="space-y-4">
          <div className="space-y-3">
            <Input
              label="계좌명"
              placeholder="키움증권"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
            />
            <Input
              label="현금 (₩)"
              type="number"
              placeholder="500000"
              value={newAccountCash}
              onChange={(e) => setNewAccountCash(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            {editingAccount && (
              <Button variant="secondary" className="flex-1" onClick={() => { setEditingAccount(null); setNewAccountName(""); setNewAccountCash(""); }}>
                취소
              </Button>
            )}
            <Button className="flex-1" onClick={editingAccount ? handleSaveAccount : handleAddAccount}>
              {editingAccount ? "저장" : "추가"}
            </Button>
          </div>

          {accounts.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <h4 className="text-sm font-medium text-slate-700">계좌 목록</h4>
              {accounts.map((account, idx) => {
                const color = getAccountColor(account.id, idx);
                return (
                  <div key={account.id} className="flex items-center justify-between py-3 px-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-2 flex-1">
                      <div className={cn("w-3 h-3 rounded-full", color.bar)} />
                      <div className="flex-1">
                        <div className="text-slate-700 font-medium">{account.name}</div>
                        <div className="text-xs text-slate-400">
                          현금 ₩{(account.cash || 0).toLocaleString()} • {portfolio.filter((p) => p.account_id === account.id).length}종목
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditAccount(account)}
                        className="text-sm text-indigo-500 hover:text-indigo-700 font-medium"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(account.id)}
                        className="text-sm text-slate-400 hover:text-red-500"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* 종목 추가/수정 시트 */}
      <BottomSheet
        isOpen={isAddSheetOpen}
        onClose={resetForm}
        title={editingItem ? (isCashMode ? "현금 수정" : "종목 수정") : "새로 추가"}
      >
        <div className="space-y-4">
          {/* 타입 선택 (새로 추가할 때만) */}
          {!editingItem && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">타입</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsCashMode(false)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-sm font-medium transition-all",
                    !isCashMode
                      ? "bg-indigo-500 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  종목
                </button>
                <button
                  onClick={() => setIsCashMode(true)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-sm font-medium transition-all",
                    isCashMode
                      ? "bg-indigo-500 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  현금
                </button>
              </div>
            </div>
          )}

          {/* 계좌 선택 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">계좌</label>
            <div className="flex gap-2 flex-wrap">
              {accounts.map((account, idx) => {
                const color = getAccountColor(account.id, idx);
                return (
                  <button
                    key={account.id}
                    onClick={() => setNewItem({ ...newItem, account_id: account.id })}
                    className={cn(
                      "px-3 py-2 rounded-xl text-sm font-medium transition-all",
                      newItem.account_id === account.id
                        ? cn("shadow-sm", color.badge)
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {account.name}
                  </button>
                );
              })}
            </div>
          </div>

          {isCashMode ? (
            <>
              {/* 현금 모드 */}
              {/* 통화 선택 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">통화</label>
                <div className="flex gap-2">
                  {(["KR", "US"] as MarketType[]).map((market) => (
                    <button
                      key={market}
                      onClick={() => setNewItem({ ...newItem, market })}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-sm font-medium transition-all",
                        newItem.market === market
                          ? "bg-indigo-500 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      {market === "KR" ? "원 (KRW)" : "달러 (USD)"}
                    </button>
                  ))}
                </div>
              </div>

              <Input
                type="number"
                label={`현금액 (${newItem.market === "US" ? "$" : "₩"})`}
                placeholder={newItem.market === "US" ? "10000" : "500000"}
                value={newItem.avg_price}
                onChange={(e) => setNewItem({ ...newItem, avg_price: e.target.value })}
              />
              <Input
                type="number"
                label="목표 비중 (%)"
                placeholder="10"
                value={newItem.target_ratio}
                onChange={(e) => setNewItem({ ...newItem, target_ratio: e.target.value })}
              />
            </>
          ) : (
            <>
              {/* 종목 모드 */}
              {/* 시장 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">시장</label>
                <div className="flex gap-2">
                  {(["KR", "US"] as MarketType[]).map((market) => (
                    <button
                      key={market}
                      onClick={() => setNewItem({ ...newItem, market })}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-sm font-medium transition-all",
                        newItem.market === market
                          ? "bg-indigo-500 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      {market === "KR" ? "한국" : "미국"}
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label="종목코드 (Yahoo Finance)"
                placeholder={newItem.market === "KR" ? "005930.KS" : "AAPL"}
                value={newItem.ticker}
                onChange={(e) => setNewItem({ ...newItem, ticker: e.target.value })}
              />
              <Input
                label="종목명 (선택)"
                placeholder="삼성전자"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              />
              <Input
                type="number"
                label="목표 비중 (%, 전체 기준)"
                placeholder="30"
                value={newItem.target_ratio}
                onChange={(e) => setNewItem({ ...newItem, target_ratio: e.target.value })}
              />
              <Input
                type="number"
                label="보유 수량"
                placeholder="100"
                value={newItem.current_quantity}
                onChange={(e) => setNewItem({ ...newItem, current_quantity: e.target.value })}
              />
              <Input
                type="number"
                label={`평균 매수가 (${newItem.market === "US" ? "$" : "₩"})`}
                placeholder={newItem.market === "US" ? "150" : "65000"}
                value={newItem.avg_price}
                onChange={(e) => setNewItem({ ...newItem, avg_price: e.target.value })}
              />
              <p className="text-xs text-slate-400">
                한국 주식: .KS (코스피) 또는 .KQ (코스닥). 예: 005930.KS
              </p>
            </>
          )}

          <div className="pt-2 flex gap-2">
            {editingItem && (
              <Button variant="secondary" className="flex-1" onClick={resetForm}>
                취소
              </Button>
            )}
            <Button className="flex-1" onClick={handleSave}>
              {editingItem ? "저장" : "추가하기"}
            </Button>
          </div>
        </div>
      </BottomSheet>

      <BottomNavigation />
    </div>
  );
}

"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { BottomNavigation, PageHeader } from "@/components/layout";
import { Button, BottomSheet, Input, Card } from "@/components/ui";
import { PortfolioItem, MarketType, ExchangeRate } from "@/types";
import { cn } from "@/lib/utils";

const initialPortfolio: PortfolioItem[] = [
  {
    id: "1",
    user_id: "user1",
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
    ticker: "069500.KS",
    name: "KODEX 200",
    market: "KR",
    target_ratio: 20,
    current_quantity: 30,
    avg_price: 32000,
    current_price: undefined,
    created_at: new Date().toISOString(),
  },
];

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(initialPortfolio);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [newItem, setNewItem] = useState({
    ticker: "",
    name: "",
    market: "KR" as MarketType,
    target_ratio: "",
    current_quantity: "",
    avg_price: "",
  });

  const fetchPrices = useCallback(async () => {
    if (portfolio.length === 0) return;

    setIsLoading(true);
    try {
      const exchangeRes = await fetch("/api/exchange");
      const exchangeData = await exchangeRes.json();
      setExchangeRate(exchangeData);

      const symbols = portfolio.map((p) => p.ticker).join(",");
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

  const totalValueKRW = useMemo(() => {
    if (!exchangeRate) return 0;
    return portfolio.reduce((sum, item) => {
      const price = item.current_price || item.avg_price;
      const value = price * item.current_quantity;
      return sum + (item.market === "US" ? value * exchangeRate.usd_krw : value);
    }, 0);
  }, [portfolio, exchangeRate]);

  const calculateCurrentRatio = (item: PortfolioItem) => {
    if (totalValueKRW === 0 || !exchangeRate) return 0;
    const price = item.current_price || item.avg_price;
    const value = price * item.current_quantity;
    const valueKRW = item.market === "US" ? value * exchangeRate.usd_krw : value;
    return (valueKRW / totalValueKRW) * 100;
  };

  const calculateProfitLoss = (item: PortfolioItem) => {
    const currentPrice = item.current_price || item.avg_price;
    const profitPercent = item.avg_price > 0 ? ((currentPrice - item.avg_price) / item.avg_price) * 100 : 0;
    return { profitPercent };
  };

  const handleDelete = (id: string) => {
    setPortfolio((prev) => prev.filter((item) => item.id !== id));
  };

  const handleEdit = (item: PortfolioItem) => {
    setEditingItem(item);
    setNewItem({
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
    if (!newItem.ticker.trim() || !newItem.target_ratio) return;

    if (editingItem) {
      setPortfolio((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                ticker: newItem.ticker,
                name: newItem.name || undefined,
                market: newItem.market,
                target_ratio: parseFloat(newItem.target_ratio),
                current_quantity: parseInt(newItem.current_quantity) || 0,
                avg_price: parseFloat(newItem.avg_price) || 0,
              }
            : item
        )
      );
    } else {
      const item: PortfolioItem = {
        id: Date.now().toString(),
        user_id: "user1",
        ticker: newItem.ticker,
        name: newItem.name || undefined,
        market: newItem.market,
        target_ratio: parseFloat(newItem.target_ratio),
        current_quantity: parseInt(newItem.current_quantity) || 0,
        avg_price: parseFloat(newItem.avg_price) || 0,
        created_at: new Date().toISOString(),
      };
      setPortfolio((prev) => [...prev, item]);
    }

    resetForm();
    setTimeout(fetchPrices, 500);
  };

  const resetForm = () => {
    setNewItem({
      ticker: "",
      name: "",
      market: "KR",
      target_ratio: "",
      current_quantity: "",
      avg_price: "",
    });
    setEditingItem(null);
    setIsAddSheetOpen(false);
  };

  const targetRatioSum = portfolio.reduce((sum, item) => sum + item.target_ratio, 0);

  const rebalanceSuggestions = useMemo(() => {
    if (!exchangeRate) return [];
    return portfolio
      .map((item) => {
        const currentRatio = calculateCurrentRatio(item);
        const deviation = currentRatio - item.target_ratio;
        return { ...item, currentRatio, deviation };
      })
      .filter((item) => Math.abs(item.deviation) > 2);
  }, [portfolio, exchangeRate, totalValueKRW]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <PageHeader
        title="자산 관리"
        subtitle={`총 ${Math.round(totalValueKRW).toLocaleString()}원`}
        action={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={fetchPrices}
              disabled={isLoading}
            >
              {isLoading ? "..." : "새로고침"}
            </Button>
            <Button size="sm" onClick={() => setIsAddSheetOpen(true)}>
              + 추가
            </Button>
          </div>
        }
      />

      <main className="px-4 space-y-6">
        <div className="flex items-center justify-between text-sm">
          <div className="text-slate-500">
            환율: <span className="text-slate-900 font-medium">$1 = ₩{exchangeRate?.usd_krw?.toLocaleString() || "-"}</span>
          </div>
          {lastUpdated && (
            <div className="text-slate-400">
              {lastUpdated.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 업데이트
            </div>
          )}
        </div>

        <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">포트폴리오 요약</h3>
            {targetRatioSum !== 100 && (
              <span className="text-xs px-2 py-1 rounded-full bg-white/20">
                목표 합계: {targetRatioSum}%
              </span>
            )}
          </div>

          <div className="h-3 bg-white/20 rounded-full overflow-hidden flex">
            {portfolio.map((item, index) => {
              const ratio = calculateCurrentRatio(item);
              const colors = [
                "bg-white",
                "bg-indigo-200",
                "bg-purple-200",
                "bg-pink-200",
                "bg-blue-200",
              ];
              return (
                <div
                  key={item.id}
                  className={colors[index % colors.length]}
                  style={{ width: `${ratio}%` }}
                />
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 mt-4">
            {portfolio.map((item, index) => {
              const colors = ["bg-white", "bg-indigo-200", "bg-purple-200", "bg-pink-200", "bg-blue-200"];
              return (
                <div key={item.id} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${colors[index % colors.length]}`} />
                  <span className="text-sm text-white/90">{item.name || item.ticker}</span>
                </div>
              );
            })}
          </div>
        </Card>

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
                <p className="text-sm text-amber-700 mt-1">목표 비중에서 2% 이상 벗어난 자산이 있습니다.</p>
                <div className="mt-3 space-y-2">
                  {rebalanceSuggestions.map((s) => (
                    <div
                      key={s.id}
                      className={cn(
                        "text-sm px-3 py-2 rounded-lg",
                        s.deviation > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                      )}
                    >
                      {s.name || s.ticker}: {s.deviation > 0 ? "비중 초과" : "비중 부족"} ({s.deviation > 0 ? "+" : ""}{s.deviation.toFixed(1)}%)
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">보유 자산</h2>
          {portfolio.length > 0 ? (
            <div className="space-y-3">
              {portfolio.map((item) => {
                const currentRatio = calculateCurrentRatio(item);
                const { profitPercent } = calculateProfitLoss(item);
                const price = item.current_price || item.avg_price;
                const valueKRW =
                  item.market === "US" && exchangeRate
                    ? price * item.current_quantity * exchangeRate.usd_krw
                    : price * item.current_quantity;

                return (
                  <Card key={item.id} variant="outlined" onClick={() => handleEdit(item)} className="cursor-pointer hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-900">{item.name || item.ticker}</h3>
                          <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded font-medium",
                            item.market === "US" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                          )}>
                            {item.market}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400">{item.ticker}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-400">현재가</span>
                        <p className="text-slate-900 font-medium">
                          {item.market === "US" ? "$" : "₩"}
                          {price?.toLocaleString() || "-"}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">보유수량</span>
                        <p className="text-slate-900 font-medium">{item.current_quantity}주</p>
                      </div>
                      <div>
                        <span className="text-slate-400">평균매수가</span>
                        <p className="text-slate-700">
                          {item.market === "US" ? "$" : "₩"}
                          {item.avg_price.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">수익률</span>
                        <p className={cn(
                          "font-medium",
                          profitPercent > 0 ? "text-red-500" : profitPercent < 0 ? "text-blue-500" : "text-slate-500"
                        )}>
                          {profitPercent > 0 ? "+" : ""}{profitPercent.toFixed(2)}%
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-400">
                          현재 {currentRatio.toFixed(1)}% / 목표 {item.target_ratio}%
                        </span>
                        <span className="text-slate-600 font-medium">₩{Math.round(valueKRW).toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden relative">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${Math.min(currentRatio, 100)}%` }}
                        />
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-slate-400"
                          style={{ left: `${item.target_ratio}%` }}
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="text-center py-12">
              <p className="text-slate-400">등록된 자산이 없습니다</p>
              <Button
                variant="ghost"
                className="mt-2"
                onClick={() => setIsAddSheetOpen(true)}
              >
                + 자산 추가하기
              </Button>
            </Card>
          )}
        </section>
      </main>

      <BottomSheet
        isOpen={isAddSheetOpen}
        onClose={resetForm}
        title={editingItem ? "자산 수정" : "새 자산 추가"}
      >
        <div className="space-y-4">
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
            label="목표 비중 (%)"
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
            한국 주식은 .KS (코스피) 또는 .KQ (코스닥)를 붙여주세요. 예: 005930.KS
          </p>
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

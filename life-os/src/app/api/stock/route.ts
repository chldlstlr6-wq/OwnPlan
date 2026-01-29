import { NextRequest, NextResponse } from "next/server";

// Yahoo Finance 비공식 API를 사용하여 주식 가격 조회
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get("symbols");

  if (!symbols) {
    return NextResponse.json({ error: "symbols parameter required" }, { status: 400 });
  }

  try {
    const symbolList = symbols.split(",");
    const prices: Record<string, { price: number; change: number; changePercent: number; currency: string }> = {};

    for (const symbol of symbolList) {
      const trimmedSymbol = symbol.trim();
      // Yahoo Finance API 형식으로 심볼 변환
      // 한국 주식: 005930.KS (삼성전자), 미국 주식: AAPL
      const yahooSymbol = trimmedSymbol.includes(".") ? trimmedSymbol : trimmedSymbol;

      try {
        const response = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`,
          {
            headers: {
              "User-Agent": "Mozilla/5.0",
            },
            next: { revalidate: 60 }, // 1분 캐시
          }
        );

        if (response.ok) {
          const data = await response.json();
          const result = data.chart?.result?.[0];
          if (result) {
            const meta = result.meta;
            const currentPrice = meta.regularMarketPrice || 0;
            const previousClose = meta.previousClose || currentPrice;
            const change = currentPrice - previousClose;
            const changePercent = previousClose ? (change / previousClose) * 100 : 0;

            prices[trimmedSymbol] = {
              price: currentPrice,
              change: Math.round(change * 100) / 100,
              changePercent: Math.round(changePercent * 100) / 100,
              currency: meta.currency || "KRW",
            };
          }
        }
      } catch (err) {
        console.error(`Failed to fetch ${trimmedSymbol}:`, err);
      }
    }

    return NextResponse.json({ prices, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("Stock API error:", error);
    return NextResponse.json({ error: "Failed to fetch stock prices" }, { status: 500 });
  }
}

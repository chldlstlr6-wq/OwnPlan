import { NextResponse } from "next/server";

// 환율 정보 조회 (USD/KRW)
export async function GET() {
  try {
    // 무료 환율 API 사용
    const response = await fetch(
      "https://api.exchangerate-api.com/v4/latest/USD",
      {
        next: { revalidate: 3600 }, // 1시간 캐시
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch exchange rate");
    }

    const data = await response.json();
    const usdKrw = data.rates?.KRW || 1300;

    return NextResponse.json({
      usd_krw: Math.round(usdKrw * 100) / 100,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Exchange API error:", error);
    // 실패 시 기본값 반환
    return NextResponse.json({
      usd_krw: 1350,
      updated_at: new Date().toISOString(),
      error: "Using fallback rate",
    });
  }
}

"use client";

import { cn } from "@/lib/utils";
import { PortfolioItem } from "@/types";
import { Card } from "../ui";

interface PortfolioCardProps {
  item: PortfolioItem;
  currentRatio: number;
  totalValue: number;
  onEdit?: (item: PortfolioItem) => void;
  onDelete?: (id: string) => void;
}

export default function PortfolioCard({
  item,
  currentRatio,
  totalValue,
  onEdit,
  onDelete,
}: PortfolioCardProps) {
  const deviation = currentRatio - item.target_ratio;
  const deviationPercent = Math.abs(deviation);
  const currentValue = (item.current_price || 0) * item.current_quantity;

  return (
    <Card onClick={() => onEdit?.(item)} className="cursor-pointer">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{item.ticker}</h3>
          <p className="text-sm text-slate-400">{item.current_quantity}주</p>
        </div>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">현재 비중</span>
          <span className="text-white">{currentRatio.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">목표 비중</span>
          <span className="text-white">{item.target_ratio}%</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">괴리율</span>
          <span className={cn(
            "font-medium",
            deviation > 2 ? "text-red-400" :
            deviation < -2 ? "text-green-400" :
            "text-slate-300"
          )}>
            {deviation > 0 ? "+" : ""}{deviation.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-700">
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              deviationPercent > 5 ? "bg-red-500" :
              deviationPercent > 2 ? "bg-orange-500" :
              "bg-green-500"
            )}
            style={{ width: `${Math.min(currentRatio, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          <span>평가금액: {currentValue.toLocaleString()}원</span>
          <span>총자산의 {((currentValue / totalValue) * 100).toFixed(1)}%</span>
        </div>
      </div>
    </Card>
  );
}

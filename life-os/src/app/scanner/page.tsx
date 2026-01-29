"use client";

import { useState } from "react";
import { BottomNavigation, PageHeader } from "@/components/layout";
import { Button, BottomSheet, Input, Card } from "@/components/ui";
import { ScrapingTarget } from "@/types";
import { cn } from "@/lib/utils";

const initialTargets: ScrapingTarget[] = [
  {
    id: "1",
    user_id: "user1",
    target_url: "https://example.com/product/123",
    selector: ".price",
    last_content_hash: "abc123",
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    user_id: "user1",
    target_url: "https://news.example.com/tech",
    selector: ".headline",
    last_content_hash: null,
    created_at: new Date().toISOString(),
  },
];

export default function ScannerPage() {
  const [targets, setTargets] = useState<ScrapingTarget[]>(initialTargets);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [newTarget, setNewTarget] = useState({
    target_url: "",
    selector: "",
  });

  const handleDelete = (id: string) => {
    setTargets((prev) => prev.filter((target) => target.id !== id));
  };

  const handleAddTarget = () => {
    if (!newTarget.target_url.trim()) return;

    const target: ScrapingTarget = {
      id: Date.now().toString(),
      user_id: "user1",
      target_url: newTarget.target_url,
      selector: newTarget.selector || null,
      last_content_hash: null,
      created_at: new Date().toISOString(),
    };

    setTargets((prev) => [target, ...prev]);
    setNewTarget({ target_url: "", selector: "" });
    setIsAddSheetOpen(false);
  };

  const handleRefresh = (id: string) => {
    console.log("Refreshing target:", id);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <PageHeader
        title="정보 스캐너"
        subtitle={`${targets.length}개 URL 모니터링 중`}
        action={
          <Button size="sm" onClick={() => setIsAddSheetOpen(true)}>
            + 추가
          </Button>
        }
      />

      <main className="px-4 space-y-6">
        <Card variant="outlined" className="border-indigo-200 bg-indigo-50">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-indigo-800 font-medium">정보 스캐너란?</h4>
              <p className="text-sm text-indigo-700 mt-1">
                등록된 URL을 주기적으로 확인하여 내용이 변경되면 알림을 보내드립니다.
              </p>
            </div>
          </div>
        </Card>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">모니터링 URL</h2>
          {targets.length > 0 ? (
            <div className="space-y-3">
              {targets.map((target) => (
                <Card key={target.id} variant="outlined">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                      target.last_content_hash ? "bg-emerald-100" : "bg-slate-100"
                    )}>
                      <svg className={cn(
                        "w-5 h-5",
                        target.last_content_hash ? "text-emerald-600" : "text-slate-400"
                      )} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 font-medium truncate">{target.target_url}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {target.selector && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {target.selector}
                          </span>
                        )}
                        <span className={cn(
                          "text-xs",
                          target.last_content_hash ? "text-emerald-600" : "text-slate-400"
                        )}>
                          {target.last_content_hash ? "모니터링 중" : "대기 중"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRefresh(target.id)}
                        className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(target.id)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <p className="text-slate-400">모니터링 중인 URL이 없습니다</p>
              <Button
                variant="ghost"
                className="mt-2"
                onClick={() => setIsAddSheetOpen(true)}
              >
                + URL 추가하기
              </Button>
            </Card>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">작동 방식</h2>
          <div className="space-y-3">
            <Card variant="outlined" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                1
              </div>
              <p className="text-slate-600 text-sm">모니터링할 URL과 CSS 선택자를 등록합니다</p>
            </Card>
            <Card variant="outlined" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                2
              </div>
              <p className="text-slate-600 text-sm">서버가 주기적으로 해당 페이지를 확인합니다</p>
            </Card>
            <Card variant="outlined" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                3
              </div>
              <p className="text-slate-600 text-sm">내용 변경 시 푸시 알림으로 알려드립니다</p>
            </Card>
          </div>
        </section>
      </main>

      <BottomSheet
        isOpen={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
        title="URL 추가"
      >
        <div className="space-y-4">
          <Input
            label="URL"
            placeholder="https://example.com/page"
            value={newTarget.target_url}
            onChange={(e) => setNewTarget({ ...newTarget, target_url: e.target.value })}
          />
          <Input
            label="CSS 선택자 (선택)"
            placeholder=".price, #content 등"
            value={newTarget.selector}
            onChange={(e) => setNewTarget({ ...newTarget, selector: e.target.value })}
          />
          <p className="text-xs text-slate-400">
            CSS 선택자를 지정하면 해당 요소의 변경만 감지합니다.
            비워두면 전체 페이지 변경을 감지합니다.
          </p>
          <div className="pt-2">
            <Button className="w-full" onClick={handleAddTarget}>
              추가하기
            </Button>
          </div>
        </div>
      </BottomSheet>

      <BottomNavigation />
    </div>
  );
}

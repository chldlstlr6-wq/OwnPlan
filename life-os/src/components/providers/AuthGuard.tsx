"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthContext } from "./AuthProvider";

const PUBLIC_PATHS = ["/login"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, error } = useAuthContext();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (loading) {
      console.log("[AuthGuard] 로딩 중...");
      return;
    }

    console.log("[AuthGuard] 상태 확인:", {
      user: user ? user.email : "없음",
      isPublicPath,
      error: error?.message,
    });

    if (!user && !isPublicPath) {
      console.log("[AuthGuard] 미인증 상태 - 로그인 페이지로 리다이렉트");
      router.replace("/login");
    } else if (user && isPublicPath) {
      console.log("[AuthGuard] 인증된 상태 - 홈으로 리다이렉트");
      router.replace("/");
    }
  }, [user, loading, isPublicPath, router, error]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Life OS</h1>
          <p className="text-indigo-200 mt-2">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user && !isPublicPath) {
    return null;
  }

  return <>{children}</>;
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<{
    connected: boolean;
    message: string;
    details?: string;
  } | null>(null);
  const { signIn } = useAuthContext();
  const router = useRouter();

  // Supabase 연결 상태 확인
  useEffect(() => {
    const checkSupabaseConnection = async () => {
      try {
        // 환경변수 확인
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!url || !key) {
          setSupabaseStatus({
            connected: false,
            message: "환경변수 설정 오류",
            details: `URL: ${url ? "설정됨" : "미설정"}, KEY: ${key ? "설정됨" : "미설정"}`,
          });
          return;
        }

        // Supabase 상태 확인
        const { data, error } = await supabase.auth.getSession();
        
        if (error && error.message.includes("fetch")) {
          setSupabaseStatus({
            connected: false,
            message: "Supabase 서버 연결 실패",
            details: "네트워크 연결을 확인해주세요.",
          });
        } else {
          setSupabaseStatus({
            connected: true,
            message: "Supabase 연결 정상",
          });
        }
      } catch (err) {
        setSupabaseStatus({
          connected: false,
          message: "연결 확인 중 오류 발생",
          details: err instanceof Error ? err.message : String(err),
        });
      }
    };

    checkSupabaseConnection();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setErrorMessage(null);

    if (isSignUp) {
      if (password !== passwordConfirm) {
        setErrorMessage("비밀번호가 일치하지 않습니다.");
        return;
      }
      if (password.length < 6) {
        setErrorMessage("비밀번호는 최소 6자 이상이어야 합니다.");
        return;
      }

      setIsSubmitting(true);
      try {
        const { error } = await supabase.auth.signUp({ email, password });
        
        if (error) {
          console.error("[회원가입 오류]", error);
          // 일반적인 에러 메시지를 더 자세하게 표시
          if (error.message.includes("already exists")) {
            setErrorMessage("이미 가입된 이메일입니다.");
          } else if (error.message.includes("fetch")) {
            setErrorMessage("서버 연결 실패. 인터넷 연결을 확인해주세요.");
          } else {
            setErrorMessage(`가입 실패: ${error.message}`);
          }
        } else {
          // 가입 후 자동 로그인 방지 - 세션을 바로 끊음
          await supabase.auth.signOut();
          setSignUpSuccess(true);
        }
      } catch (err) {
        console.error("[회원가입 예외]", err);
        setErrorMessage("예상치 못한 오류가 발생했습니다. 다시 시도해주세요.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setIsSubmitting(true);
      try {
        const { error } = await signIn(email, password);

        if (error) {
          console.error("[로그인 오류]", error);
          // 구체적인 오류 메시지
          if (error.message.includes("Invalid login")) {
            setErrorMessage("이메일 또는 비밀번호가 올바르지 않습니다.");
          } else if (error.message.includes("not confirmed")) {
            setErrorMessage("이메일 인증이 필요합니다. 이메일을 확인해주세요.");
          } else if (error.message.includes("fetch") || error.message.includes("network")) {
            setErrorMessage("서버 연결 실패. 인터넷 연결을 확인해주세요.");
          } else if (error.message.includes("timeout")) {
            setErrorMessage("요청 시간 초과. 다시 시도해주세요.");
          } else {
            setErrorMessage(`로그인 실패: ${error.message}`);
          }
        } else {
          router.replace("/");
        }
      } catch (err) {
        console.error("[로그인 예외]", err);
        setErrorMessage("예상치 못한 오류가 발생했습니다. 다시 시도해주세요.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (signUpSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white">Life OS</h1>
            <p className="text-indigo-200 mt-2">나만의 라이프 매니저</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">가입 완료</h2>
            <p className="text-sm text-slate-600 mb-6">
              확인 이메일이 발송되었습니다.<br />
              이메일을 확인한 후 로그인해주세요.
            </p>
            <button
              onClick={() => {
                setSignUpSuccess(false);
                setIsSignUp(false);
                setPassword("");
                setPasswordConfirm("");
                setErrorMessage(null);
              }}
              className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl transition-colors"
            >
              로그인하러 가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Life OS</h1>
          <p className="text-indigo-200 mt-2">나만의 라이프 매니저</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-6 text-center">
            {isSignUp ? "회원가입" : "로그인"}
          </h2>

          {/* Supabase 연결 상태 표시 */}
          {supabaseStatus && (
            <div
              className={`mb-4 px-4 py-3 rounded-xl border ${
                supabaseStatus.connected
                  ? "bg-green-50 border-green-200"
                  : "bg-yellow-50 border-yellow-200"
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  supabaseStatus.connected
                    ? "text-green-700"
                    : "text-yellow-700"
                }`}
              >
                {supabaseStatus.message}
              </p>
              {supabaseStatus.details && (
                <p className="text-xs text-gray-600 mt-1">
                  {supabaseStatus.details}
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
                minLength={6}
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
            </div>

            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="비밀번호를 다시 입력하세요"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            )}

            {errorMessage && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600">{errorMessage}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white font-semibold rounded-xl transition-colors"
            >
              {isSubmitting ? "처리 중..." : isSignUp ? "가입하기" : "로그인"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMessage(null);
                setPassword("");
                setPasswordConfirm("");
              }}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {isSignUp
                ? "이미 계정이 있으신가요? 로그인"
                : "계정이 없으신가요? 회원가입"}
            </button>
          </div>

          {/* 디버그 정보 */}
          <details className="mt-6 text-xs text-slate-500">
            <summary className="cursor-pointer hover:text-slate-600">
              📋 디버그 정보 (문제 해결용)
            </summary>
            <div className="mt-2 space-y-1 bg-slate-50 p-2 rounded border border-slate-200">
              <div>
                <strong>Supabase URL:</strong>
                <br />
                {process.env.NEXT_PUBLIC_SUPABASE_URL
                  ? "✓ 설정됨"
                  : "✗ 미설정"}
              </div>
              <div>
                <strong>Supabase Key:</strong>
                <br />
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                  ? "✓ 설정됨"
                  : "✗ 미설정"}
              </div>
              <div>
                <strong>브라우저 콘솔:</strong>
                <br />
                F12를 눌러 콘솔에서 자세한 오류 메시지를 확인하세요.
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

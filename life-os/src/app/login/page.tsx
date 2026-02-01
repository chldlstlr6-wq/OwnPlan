"use client";

import { useState } from "react";
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
  const { signIn } = useAuthContext();
  const router = useRouter();

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
      const { error } = await supabase.auth.signUp({ email, password });
      setIsSubmitting(false);

      if (error) {
        setErrorMessage(error.message);
      } else {
        // 가입 후 자동 로그인 방지 - 세션을 바로 끊음
        await supabase.auth.signOut();
        setSignUpSuccess(true);
      }
    } else {
      setIsSubmitting(true);
      const { error } = await signIn(email, password);
      setIsSubmitting(false);

      if (error) {
        setErrorMessage(error.message);
      } else {
        router.replace("/");
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
        </div>
      </div>
    </div>
  );
}

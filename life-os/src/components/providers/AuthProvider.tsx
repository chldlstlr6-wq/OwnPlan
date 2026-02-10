"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | null;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("[AuthProvider] 세션 조회 오류:", error);
        setError(error);
      }
      setUser(session?.user ?? null);
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log(`[AuthProvider] 로그인 시도: ${email}`);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error("[AuthProvider] 로그인 실패:", error);
        setError(error);
      } else {
        console.log("[AuthProvider] 로그인 성공");
        setUser(data.user);
        setSession(data.session);
      }
      setLoading(false);
      return { error };
    } catch (err) {
      console.error("[AuthProvider] 로그인 예외:", err);
      const authError = new Error("로그인 중 예상치 못한 오류가 발생했습니다.") as any;
      setError(authError);
      setLoading(false);
      return { error: authError };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log(`[AuthProvider] 회원가입 시도: ${email}`);
      const { data, error } = await supabase.auth.signUp({ email, password });
      
      if (error) {
        console.error("[AuthProvider] 회원가입 실패:", error);
        setError(error);
      } else {
        console.log("[AuthProvider] 회원가입 성공");
        setUser(data.user);
        setSession(data.session);
      }
      setLoading(false);
      return { error };
    } catch (err) {
      console.error("[AuthProvider] 회원가입 예외:", err);
      const authError = new Error("회원가입 중 예상치 못한 오류가 발생했습니다.") as any;
      setError(authError);
      setLoading(false);
      return { error: authError };
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("[AuthProvider] 로그아웃 진행");
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("[AuthProvider] 로그아웃 실패:", error);
        setError(error);
      } else {
        console.log("[AuthProvider] 로그아웃 성공");
      }
      setUser(null);
      setSession(null);
      setLoading(false);
      return { error };
    } catch (err) {
      console.error("[AuthProvider] 로그아웃 예외:", err);
      setLoading(false);
      setUser(null);
      setSession(null);
      return { error: null };
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, error, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}

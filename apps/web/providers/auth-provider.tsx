"use client";

import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/queryKeys";

type SessionUser = {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  image?: string | null;
};

type SessionData = { user: SessionUser; session: unknown } | null;

type AuthContextValue = {
  user: SessionUser | null;
  session: unknown | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: unknown;
};

const AuthCtx = createContext<AuthContextValue>({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => {
      try {
        const res = await api.get("/api/me");
        return res.data as { user: SessionUser; session: unknown };
      } catch (e: unknown) {
        const err = e as { response?: { status?: number } };
        if (err.response?.status === 401) return null as unknown as SessionData;
        throw e;
      }
    },
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
  });

  const value: AuthContextValue = {
    user: (data as { user?: SessionUser })?.user ?? null,
    session: (data as { session?: unknown })?.session ?? null,
    isLoading,
    isAuthenticated: Boolean((data as { user?: unknown })?.user),
    error,
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}

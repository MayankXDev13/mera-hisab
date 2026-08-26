"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/queryKeys";

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      // better-auth expects { email, password }
      const res = await api.post("/api/auth/sign-in/email", data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.me }),
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { email: string; password: string; name: string }) => {
      const res = await api.post("/api/auth/sign-up/email", data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.me }),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post("/api/auth/sign-out");
    },
    onSuccess: () => {
      qc.setQueryData(queryKeys.me, null);
      qc.clear();
    },
  });
}

"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/queryKeys";
import type { Account } from "@/lib/api/types";

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; type?: "savings" | "current"; openingBalancePaise: number }) => {
      const res = await api.post<{ account: Account }>("/api/accounts", data);
      return res.data.account;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.accounts.all }),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{ name: string; type: "savings" | "current"; status: "active" | "deactivated" }> }) => {
      const res = await api.patch<{ account: Account }>(`/api/accounts/${id}`, data);
      return res.data.account;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.accounts.all });
      qc.invalidateQueries({ queryKey: queryKeys.accounts.detail(vars.id) });
    },
  });
}

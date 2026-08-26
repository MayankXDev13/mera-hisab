"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/queryKeys";
import type { Card } from "@/lib/api/types";

export function useCreateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { issuer: string; last4: string; totalLimitPaise: number }) => {
      const res = await api.post<{ card: Card }>("/api/cards", data);
      return res.data.card;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cards.all }),
  });
}

export function useUpdateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{ issuer: string; last4: string; totalLimitPaise: number; status: "active" | "deactivated" }> }) => {
      const res = await api.patch<{ card: Card }>(`/api/cards/${id}`, data);
      return res.data.card;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.cards.all });
      qc.invalidateQueries({ queryKey: queryKeys.cards.detail(vars.id) });
    },
  });
}

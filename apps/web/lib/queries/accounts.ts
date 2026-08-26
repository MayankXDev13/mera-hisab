"use client";
import { useQuery } from "@tanstack/react-query";
import { httpHisabData, queryKeys } from "@/lib/hisab";

export function useAccounts() {
  return useQuery({
    queryKey: queryKeys.accounts.all,
    queryFn: () => httpHisabData.listAccounts(),
    staleTime: 0,
  });
}

export function useAccount(id: string) {
  return useQuery({
    queryKey: queryKeys.accounts.detail(id),
    queryFn: async () => {
      const all = await httpHisabData.listAccounts();
      const found = all.find((a) => a.id === id);
      if (!found) throw new Error("account not found");
      return found;
    },
    enabled: Boolean(id),
    staleTime: 0,
  });
}

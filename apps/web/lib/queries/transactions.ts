"use client";
import { useQuery } from "@tanstack/react-query";
import { httpHisabData, queryKeys } from "@/lib/hisab";
import type { TransactionFilters } from "@/lib/hisab";

export type { TransactionFilters } from "@/lib/hisab";

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: queryKeys.transactions.list(filters as Record<string, unknown>),
    queryFn: () => httpHisabData.listTransactions(filters),
    staleTime: 0,
  });
}

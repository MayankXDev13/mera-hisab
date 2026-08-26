"use client";
import { useQuery } from "@tanstack/react-query";
import { httpHisabData, queryKeys } from "@/lib/hisab";
import type { HisabCustomer as Customer, Outstanding } from "@/lib/hisab";

export function useCustomers() {
  return useQuery({
    queryKey: queryKeys.customers.all,
    queryFn: () => httpHisabData.listCustomers(),
    staleTime: 0,
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: async () => {
      const all = await httpHisabData.listCustomers();
      const found = all.find((c) => c.id === id);
      if (!found) throw new Error("customer not found");
      return found;
    },
    enabled: Boolean(id),
    staleTime: 0,
  });
}

export function useOutstanding(id: string) {
  return useQuery({
    queryKey: queryKeys.customers.outstanding(id),
    queryFn: () => httpHisabData.getOutstanding(id),
    enabled: Boolean(id),
    staleTime: 0,
  });
}

export function useOutstandings(ids: string[]) {
  return useQuery({
    queryKey: queryKeys.customers.outstandings(ids),
    queryFn: () => httpHisabData.getOutstandings(ids),
    enabled: ids.length > 0,
    staleTime: 0,
  });
}

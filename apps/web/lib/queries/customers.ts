"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/queryKeys";
import type { Customer, Outstanding } from "@/lib/api/types";

export function useCustomers() {
  return useQuery({
    queryKey: queryKeys.customers.all,
    queryFn: async () => {
      const res = await api.get<{ customers: Customer[] }>("/api/customers");
      return res.data.customers;
    },
    staleTime: 0,
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: async () => {
      const res = await api.get<{ customer: Customer }>(`/api/customers/${id}`);
      return res.data.customer;
    },
    enabled: Boolean(id),
    staleTime: 0,
  });
}

export function useOutstanding(id: string) {
  return useQuery({
    queryKey: queryKeys.customers.outstanding(id),
    queryFn: async () => {
      const res = await api.get<Outstanding>(`/api/customers/${id}/outstanding`);
      return res.data;
    },
    enabled: Boolean(id),
    staleTime: 0,
  });
}

export function useOutstandings(ids: string[]) {
  return useQuery({
    queryKey: queryKeys.customers.outstandings(ids),
    queryFn: async () => {
      if (ids.length === 0) return {} as Record<string, number>;
      const res = await api.get<{ outstandings: Record<string, number> }>("/api/customers/outstanding", { params: { ids: ids.join(",") } });
      return res.data.outstandings;
    },
    enabled: ids.length > 0,
    staleTime: 0,
  });
}

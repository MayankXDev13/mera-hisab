"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/queryKeys";
import type { Customer } from "@/lib/api/types";

type CreateCustomerPayload = {
  name: string;
  username: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  monthlyRateBps: number;
  status?: "active" | "deactivated";
};

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateCustomerPayload) => {
      const res = await api.post<{ customer: Customer }>("/api/customers", data);
      return res.data.customer;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.customers.all }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateCustomerPayload> }) => {
      
      const res = await api.patch<{ customer: Customer }>(`/api/customers/${id}`, data);
      return res.data.customer;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.customers.all });
      qc.invalidateQueries({ queryKey: queryKeys.customers.detail(vars.id) });
      qc.invalidateQueries({ queryKey: queryKeys.customers.outstanding(vars.id) });
    },
  });
}

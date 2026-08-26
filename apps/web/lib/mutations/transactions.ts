"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { httpHisabData, queryKeys, type CreateRepaymentPayload } from "@/lib/hisab";
import { invalidationForTransaction } from "@/lib/hisab";

type CreateTxnPayload = {
  direction: "debit";
  customerId: string;
  sourceType?: "account" | "credit_card";
  sourceId: string;
  amountPaise: number;
  occurredAt?: string;
  note?: string | null;
};

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTxnPayload) => httpHisabData.createTransaction(data),
    onSuccess: (created, vars) => {
      const kind = vars.sourceType === "credit_card" ? "credit_card" : "account";
      for (const key of invalidationForTransaction({ sourceType: kind, customerId: vars.customerId, sourceId: vars.sourceId })) {
        qc.invalidateQueries({ queryKey: key });
      }
    },
  });
}

/** One credit transaction + allocations across sources. */
export function useCreateRepayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRepaymentPayload) => httpHisabData.createRepayment(data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
      qc.invalidateQueries({ queryKey: queryKeys.customers.outstanding(vars.customerId) });
      qc.invalidateQueries({ queryKey: queryKeys.accounts.all });
      qc.invalidateQueries({ queryKey: queryKeys.cards.all });
    },
  });
}

"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { httpHisabData } from "@/lib/hisab";
import { invalidationForTransaction, queryKeys } from "@/lib/hisab";
import type { HisabTransaction as Transaction } from "@/lib/hisab";

type CreateTxnPayload = {
  direction: "debit" | "credit";
  customerId: string;
  sourceType: "account" | "credit_card";
  sourceId: string;
  amountPaise: number;
  occurredAt?: string;
  note?: string | null;
};

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTxnPayload) => httpHisabData.createTransaction(data),
    onSuccess: (_data, vars) => {
      for (const key of invalidationForTransaction(vars)) {
        qc.invalidateQueries({ queryKey: key });
      }
      // customers.all no longer invalidated on ledger write — list not affected
    },
  });
}

export function useReverseTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => httpHisabData.reverseTransaction(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
      // precise: only the source type that was reversed
      const sourceKey = data.sourceType === "account" ? queryKeys.accounts.all : queryKeys.cards.all;
      qc.invalidateQueries({ queryKey: sourceKey });
      qc.invalidateQueries({ queryKey: queryKeys.customers.outstanding(data.customerId) });
    },
  });
}

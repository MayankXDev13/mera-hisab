"use client";
/* eslint-disable react-hooks/set-state-in-effect -- transaction form needs prop sync and source auto-select */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AmountInput,
  amountToPaiseOrNull,
} from "@/components/app/AmountInput";
import { useCreateTransaction } from "@/lib/mutations/transactions";
import { useCustomers } from "@/lib/queries/customers";
import { useAccounts } from "@/lib/queries/accounts";
import { useCards } from "@/lib/queries/cards";
import { toast } from "@/components/ui/toast";
import { formatRupees } from "@/lib/utils/format";

function errorMsg(e: unknown): string {
  const err = e as {
    response?: {
      data?: {
        error?: string;
        details?: { fieldErrors?: Record<string, string[]> };
      };
    };
    message?: string;
  };
  if (err.response?.data?.error) return err.response.data.error;
  const fe = err.response?.data?.details?.fieldErrors;
  if (fe)
    return Object.entries(fe)
      .map(([k, v]) => `${k}: ${v.join(", ")}`)
      .join(" | ");
  return err.message || "Failed";
}

export function TransactionForm({
  onDone,
  defaultCustomerId,
}: {
  onDone?: () => void;
  defaultCustomerId?: string;
}) {
  const customers = useCustomers();
  const accounts = useAccounts();
  const cards = useCards();
  const create = useCreateTransaction();

  const [customerId, setCustomerId] = useState(defaultCustomerId ?? "");
  const direction = "debit" as const;
  const [sourceType, setSourceType] = useState<"account" | "credit_card">(
    "account",
  );
  const [sourceId, setSourceId] = useState("");
  const [amountRupees, setAmountRupees] = useState("");
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState("");

  useEffect(() => {
    if (defaultCustomerId) setCustomerId(defaultCustomerId);
  }, [defaultCustomerId]);

  // auto-pick first source when type switches
  useEffect(() => {
    if (sourceType === "account" && accounts.data?.length)
      setSourceId(accounts.data[0].id);
    else if (sourceType === "credit_card" && cards.data?.length)
      setSourceId(cards.data[0].id);
  }, [sourceType, accounts.data, cards.data]);

  const sources =
    sourceType === "account" ? (accounts.data ?? []) : (cards.data ?? []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const paise = amountToPaiseOrNull(amountRupees);
    if (!paise) {
      toast.add({
        title: "Invalid amount",
        description: "Check rupee input (max 2 decimals, >0)",
        type: "error",
      });
      return;
    }
    if (!customerId || !sourceId) {
      toast.add({
        title: "Missing fields",
        description: "Select customer and source",
        type: "error",
      });
      return;
    }
    // client-side guard for limits
    if (sourceType === "account") {
      const acc = accounts.data?.find((a) => a.id === sourceId);
      if (direction === "debit" && acc && acc.currentBalancePaise < paise) {
        toast.add({
          title: "Insufficient balance",
          description: `Account ${acc.name} has ${formatRupees(acc.currentBalancePaise)}`,
          type: "error",
        });
        return;
      }
    } else {
      const card = cards.data?.find((c) => c.id === sourceId);
      if (direction === "debit" && card) {
        const avail =
          card.availablePaise ?? card.totalLimitPaise - card.usedPaise;
        if (avail < paise) {
          toast.add({
            title: "Card limit exceeded",
            description: `Available ${formatRupees(avail)}`,
            type: "error",
          });
          return;
        }
      }
    }

    try {
      await create.mutateAsync({
        customerId,
        direction,
        sourceType,
        sourceId,
        amountPaise: paise,
        note: note || null,
        occurredAt: occurredAt ? new Date(occurredAt).toISOString() : undefined,
      });
      toast.add({
        title: "Entry recorded",
        description: `Debit ${formatRupees(paise)} recorded`,
        type: "success",
      });
      setAmountRupees("");
      setNote("");
      onDone?.();
    } catch (err) {
      toast.add({
        title: "Failed to create",
        description: errorMsg(err),
        type: "error",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Customer *</Label>
          <Select
            value={customerId}
            onValueChange={(v) => setCustomerId(v ?? "")}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  customers.isLoading ? "Loading…" : "Select customer"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {customers.data?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} @{c.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Direction</Label>
          <Input value="Debit — money given" readOnly className="bg-muted" />
          <input type="hidden" value="debit" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Source type</Label>
          <Select
            value={sourceType}
            onValueChange={(v) => setSourceType(v as "account" | "credit_card")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="account">Account</SelectItem>
              <SelectItem value="credit_card">Credit card</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Source *</Label>
          <Select value={sourceId} onValueChange={(v) => setSourceId(v ?? "")}>
            <SelectTrigger>
              <SelectValue
                placeholder={sources.length ? "Select source" : "No sources"}
              />
            </SelectTrigger>
            <SelectContent>
              {sourceType === "account"
                ? (accounts.data ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} — {formatRupees(a.currentBalancePaise)}{" "}
                    {a.status !== "active" ? "(deactivated)" : ""}
                  </SelectItem>
                ))
                : (cards.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.issuer} ••{c.last4} — avail{" "}
                    {formatRupees(
                      c.availablePaise ?? c.totalLimitPaise - c.usedPaise,
                    )}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <AmountInput value={amountRupees} onChange={setAmountRupees} />

      <div className="space-y-2">
        <Label htmlFor="occurredAt">
          Occurred at (optional, defaults to now)
        </Label>
        <Input
          id="occurredAt"
          type="datetime-local"
          value={occurredAt}
          onChange={(e) => setOccurredAt(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Note</Label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Chai advance, etc. (max 2000)"
          maxLength={2000}
        />
      </div>

      <Button
        type="submit"
        className="w-full rounded-full h-10"
        disabled={create.isPending}
      >
        {create.isPending ? "Saving…" : "Record entry"}
      </Button>
    </form>
  );
}

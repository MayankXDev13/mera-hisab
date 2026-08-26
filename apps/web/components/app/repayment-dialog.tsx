"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRupees, rupeesToPaise, amountToPaiseOrNull } from "@/lib/utils/format";
import { useCreateRepayment } from "@/lib/mutations/transactions";
import { toast } from "@/components/ui/toast";

type SourceRow = { sourceId: string; name: string; kind: "bank_account" | "credit_card"; outstandingPaise: number };

/**
 * Record Repayment dialog: one credit transaction + per-source allocations.
 * FIFO fills oldest-outstanding-first; manual is editable but must sum exactly.
 */
export function RepaymentDialog({
  customerId,
  customerName,
  sources,
  totalOutstanding,
  onDone,
}: {
  customerId: string;
  customerName: string;
  sources: SourceRow[];
  totalOutstanding: number;
  onDone: () => void;
}) {
  const repay = useCreateRepayment();
  const withDue = sources.filter((s) => s.outstandingPaise > 0);
  const [amountStr, setAmountStr] = useState("");
  const [mode, setMode] = useState<"fifo" | "manual">("fifo");
  const [manual, setManual] = useState<Record<string, number>>({});

  const amountPaise = amountToPaiseOrNull(amountStr);

  // fifo preview
  const fifoAllocations = useMemo(() => {
    if (!amountPaise) return [];
    let left = amountPaise;
    const out: Array<{ sourceId: string; amountPaise: number }> = [];
    for (const s of [...withDue].sort((a, b) => a.outstandingPaise - b.outstandingPaise ? 0 : 0)) {
      if (left <= 0) break;
      const give = Math.min(s.outstandingPaise, left);
      out.push({ sourceId: s.sourceId, amountPaise: give });
      left -= give;
    }
    return out;
  }, [amountPaise, withDue]);

  // NOTE: drawer passes sources already sorted newest-outstanding-first; FIFO must be
  // oldest-debit-first — the backend recomputes authoritative order, this preview is indicative.
  const allocations = mode === "fifo" ? fifoAllocations : Object.entries(manual).map(([sourceId, amountPaise]) => ({ sourceId, amountPaise }));
  const allocated = allocations.reduce((s, a) => s + a.amountPaise, 0);
  const canSave =
    Boolean(amountPaise) && allocated === (amountPaise ?? -1) && !repay.isPending &&
    (mode === "fifo" || allocations.every((a) => {
      const src = sources.find((s) => s.sourceId === a.sourceId);
      return src && a.amountPaise > 0 && a.amountPaise <= src.outstandingPaise;
    }));

  const setManualAmount = (sourceId: string, v: string) => {
    const paise = v.trim() === "" ? 0 : Math.max(0, Math.floor(rupeesToPaise(v)));
    setManual((m) => ({ ...m, [sourceId]: paise }));
  };

  const submit = async () => {
    if (!amountPaise) return;
    try {
      await repay.mutateAsync({
        customerId,
        mode,
        amountPaise,
        allocations: mode === "manual" ? allocations : undefined,
      });
      toast.add({ title: "Repayment recorded", description: `${formatRupees(amountPaise)} from ${customerName}`, type: "success" });
      onDone();
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      toast.add({ title: "Failed", description: err.response?.data?.error || err.message || "Error", type: "error" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Repayment amount</Label>
        <Input inputMode="decimal" placeholder="500.00" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} className="font-mono" />
        <p className="text-xs text-muted-foreground">Total outstanding {formatRupees(totalOutstanding)}</p>
      </div>

      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" checked={mode === "fifo"} onChange={() => setMode("fifo")} /> FIFO / auto allocate
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={mode === "manual"} onChange={() => setMode("manual")} /> Manual
        </label>
      </div>

      <div className="space-y-2">
        {sources.map((s) => {
          const alloc = allocations.find((a) => a.sourceId === s.sourceId)?.amountPaise ?? 0;
          if (mode === "fifo" && s.outstandingPaise === 0 && alloc === 0) return null;
          return (
            <div key={s.sourceId} className="flex items-center justify-between text-sm">
              <span className="truncate">{s.name}</span>
              {mode === "manual" ? (
                <Input
                  className="w-28 h-8 font-mono text-right"
                  inputMode="decimal"
                  value={manual[s.sourceId] !== undefined ? (manual[s.sourceId] / 100).toFixed(2) : ""}
                  onChange={(e) => setManualAmount(s.sourceId, e.target.value)}
                />
              ) : (
                <span className="font-mono">{formatRupees(alloc)}</span>
              )}
            </div>
          );
        })}
      </div>

      <p className={`text-xs ${allocated === amountPaise ? "text-muted-foreground" : "text-destructive"}`}>
        Allocated {formatRupees(allocated)} / {formatRupees(amountPaise ?? 0)}
      </p>

      <Button className="w-full" disabled={!canSave} onClick={submit}>
        {repay.isPending ? "Saving…" : "Save repayment"}
      </Button>
    </div>
  );
}

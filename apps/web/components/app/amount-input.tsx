"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rupeesToPaise, formatRupees, amountToPaiseOrNull as sharedAmountToPaiseOrNull, MAX_PAISE_INT32, RUPEE_AMOUNT_REGEX } from "@/lib/utils/format";

export function AmountInput({
  value,
  onChange,
  label = "Amount (₹)",
  placeholder = "500.00",
  id = "amount",
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
  id?: string;
  error?: string;
}) {
  const parsed = useMemo(() => {
    if (!value.trim()) return { paise: 0, valid: false, display: "" };
    const ok = RUPEE_AMOUNT_REGEX.test(value.trim());
    if (!ok) return { paise: NaN, valid: false, display: "Invalid format (max 2 decimals)" };
    const paise = rupeesToPaise(value);
    if (!Number.isFinite(paise) || paise <= 0) return { paise, valid: false, display: paise === 0 ? "Must be > 0" : "Invalid amount" };
    if (paise > MAX_PAISE_INT32) return { paise, valid: false, display: "Exceeds ₹2,14,74,836 limit (int32 paise)" };
    return { paise, valid: true, display: `${formatRupees(paise)} • ${paise.toLocaleString("en-IN")} paise` };
  }, [value]);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
        <Input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            // allow empty, digits, dot
            if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) onChange(v);
          }}
          placeholder={placeholder}
          className="pl-7 font-mono"
        />
      </div>
      {value.trim() && (
        <p className={`text-xs ${parsed.valid ? "text-muted-foreground" : "text-destructive"}`}>{parsed.display}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function amountToPaiseOrNull(v: string): number | null {
  return sharedAmountToPaiseOrNull(v);
}

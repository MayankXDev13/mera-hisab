"use client";
import { Button } from "./Button";
export function ConfirmDialog({ open, title, desc, confirmLabel="Confirm", tone="primary", onConfirm, onClose }: { open: boolean; title: string; desc: string; confirmLabel?: string; tone?: "primary"|"danger"; onConfirm: ()=>void; onClose: ()=>void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-paper border border-line rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="display font-semibold text-lg">{title}</h3>
        <p className="mt-2 text-sm text-muted leading-relaxed">{desc}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant={tone==="danger"?"danger":"primary"} onClick={()=>{ onConfirm(); onClose(); }}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

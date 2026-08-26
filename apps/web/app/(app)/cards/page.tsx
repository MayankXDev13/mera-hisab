"use client";

import { useState } from "react";
import { useCards } from "@/lib/queries/cards";
import { useCreateCard, useUpdateCard } from "@/lib/mutations/cards";
import { Card as UICard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { formatRupees } from "@/lib/utils/format";
import { AmountInput, amountToPaiseOrNull } from "@/components/app/amount-input";
import { toast } from "@/components/ui/toast";
import { RiAddLine, RiEditLine } from "@remixicon/react";

function errMsg(e: unknown) {
  const err = e as { response?: { data?: { error?: string; details?: unknown } }; message?: string };
  return err.response?.data?.error || err.message || "Error";
}

export default function CardsPage() {
  const { data, isLoading } = useCards();
  const create = useCreateCard();
  const update = useUpdateCard();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ issuer: "", last4: "", limitRupees: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ issuer: string; last4: string; limitRupees: string; status: "active" | "deactivated" }>({ issuer: "", last4: "", limitRupees: "", status: "active" });

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const paise = amountToPaiseOrNull(form.limitRupees);
    if (!paise) { toast.add({ title: "Invalid limit", type: "error" }); return; }
    if (!/^\d{4}$/.test(form.last4)) { toast.add({ title: "last4 must be 4 digits", type: "error" }); return; }
    try {
      await create.mutateAsync({ issuer: form.issuer, last4: form.last4, totalLimitPaise: paise });
      toast.add({ title: "Card created", type: "success" });
      setForm({ issuer: "", last4: "", limitRupees: "" });
      setOpen(false);
    } catch (err) { toast.add({ title: "Failed", description: errMsg(err), type: "error" }); }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const patch: Record<string, unknown> = {};
    if (editForm.issuer) patch.issuer = editForm.issuer;
    if (editForm.last4) {
      if (!/^\d{4}$/.test(editForm.last4)) { toast.add({ title: "last4 4 digits", type: "error" }); return; }
      patch.last4 = editForm.last4;
    }
    if (editForm.limitRupees) {
      const paise = amountToPaiseOrNull(editForm.limitRupees);
      if (!paise) { toast.add({ title: "Invalid limit", type: "error" }); return; }
      patch.totalLimitPaise = paise;
    }
    patch.status = editForm.status;
    try {
      await update.mutateAsync({ id: editingId, data: patch as never });
      toast.add({ title: "Card updated", type: "success" });
      setEditingId(null);
    } catch (err) { toast.add({ title: "Failed", description: errMsg(err), type: "error" }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cards</h1>
          <p className="text-sm text-muted-foreground">Manage your credit cards and track utilization.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button><RiAddLine /> New card</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>New card</DialogTitle><DialogDescription>Add a new credit card to track.</DialogDescription></DialogHeader>
            <form onSubmit={submitCreate} className="space-y-4">
              <div className="space-y-2"><Label>Issuer *</Label><Input required value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} placeholder="HDFC" /></div>
              <div className="space-y-2"><Label>Last 4 *</Label><Input required value={form.last4} onChange={(e) => setForm({ ...form, last4: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="4521" maxLength={4} className="font-mono" /></div>
              <AmountInput value={form.limitRupees} onChange={(v) => setForm({ ...form, limitRupees: v })} label="Total limit (₹) *" placeholder="200000.00" />
              <Button type="submit" className="w-full" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <UICard>
        <CardHeader className="pb-2"><CardTitle className="text-sm">All cards</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? <div className="p-4"><Skeleton className="h-10 w-full" /></div> : !data?.length ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No cards yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Issuer</TableHead>
                  <TableHead>Last4</TableHead>
                  <TableHead>Total limit</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Utilization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((c) => {
                  const avail = c.availablePaise ?? c.totalLimitPaise - c.usedPaise;
                  const pct = c.totalLimitPaise ? Math.min(100, Math.round((c.usedPaise / c.totalLimitPaise) * 100)) : 0;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.issuer}</TableCell>
                      <TableCell className="font-mono text-xs">•• {c.last4}</TableCell>
                      <TableCell className="font-mono text-xs">{formatRupees(c.totalLimitPaise)}</TableCell>
                      <TableCell className="font-mono text-xs">{formatRupees(c.usedPaise)}</TableCell>
                      <TableCell className="font-mono text-sm">{formatRupees(avail)}</TableCell>
                      <TableCell className="w-32"><Progress value={pct} className="h-2" /></TableCell>
                      <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"} className="capitalize">{c.status}</Badge></TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => {
                          setEditingId(c.id);
                          setEditForm({ issuer: c.issuer, last4: c.last4, limitRupees: "", status: c.status });
                        }}><RiEditLine /> Edit</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </UICard>

      <Dialog open={Boolean(editingId)} onOpenChange={(v) => !v && setEditingId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit card</DialogTitle><DialogDescription>Update card details.</DialogDescription></DialogHeader>
          {editingId && (
            <form onSubmit={submitEdit} className="space-y-3">
              <div className="space-y-2"><Label>Issuer</Label><Input value={editForm.issuer} onChange={(e) => setEditForm({ ...editForm, issuer: e.target.value })} /></div>
              <div className="space-y-2"><Label>Last 4</Label><Input value={editForm.last4} onChange={(e) => setEditForm({ ...editForm, last4: e.target.value.replace(/\D/g, "").slice(0, 4) })} maxLength={4} className="font-mono" /></div>
              <AmountInput value={editForm.limitRupees} onChange={(v) => setEditForm({ ...editForm, limitRupees: v })} label="New total limit (₹) — leave blank to keep" placeholder="" />
              <div className="space-y-2"><Label>Status</Label><Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: (v ?? "active") as "active" | "deactivated" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">active</SelectItem><SelectItem value="deactivated">deactivated</SelectItem></SelectContent></Select></div>
              <Button type="submit" className="w-full" disabled={update.isPending}>{update.isPending ? "Saving…" : "Save"}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

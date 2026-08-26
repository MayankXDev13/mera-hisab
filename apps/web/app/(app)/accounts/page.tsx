"use client";

import { useState } from "react";
import { useAccounts } from "@/lib/queries/accounts";
import { useCreateAccount, useUpdateAccount } from "@/lib/mutations/accounts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { formatRupees } from "@/lib/utils/format";
import { AmountInput, amountToPaiseOrNull } from "@/components/app/amount-input";
import { toast } from "@/components/ui/toast";
import { RiAddLine, RiEditLine } from "@remixicon/react";

function errMsg(e: unknown) {
  const err = e as { response?: { data?: { error?: string } }; message?: string };
  return err.response?.data?.error || err.message || "Error";
}

export default function AccountsPage() {
  const { data, isLoading } = useAccounts();
  const create = useCreateAccount();
  const update = useUpdateAccount();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; type: "savings" | "current"; opening: string }>({ name: "", type: "savings", opening: "" });
  const [editForm, setEditForm] = useState<{ name: string; type: "savings" | "current"; status: "active" | "deactivated" }>({ name: "", type: "savings", status: "active" });

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const paise = amountToPaiseOrNull(form.opening);
    // opening can be 0
    if (form.opening.trim() && paise === null) { toast.add({ title: "Invalid amount", type: "error" }); return; }
    const openingBalancePaise = form.opening.trim() === "" ? 0 : paise ?? 0;
    try {
      await create.mutateAsync({ name: form.name, type: form.type, openingBalancePaise });
      toast.add({ title: "Account created", description: formatRupees(openingBalancePaise), type: "success" });
      setForm({ name: "", type: "savings", opening: "" });
      setOpen(false);
    } catch (err) { toast.add({ title: "Failed", description: errMsg(err), type: "error" }); }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    try {
      await update.mutateAsync({ id: editingId, data: editForm });
      toast.add({ title: "Account updated", type: "success" });
      setEditingId(null);
    } catch (err) { toast.add({ title: "Failed", description: errMsg(err), type: "error" }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Accounts</h1>
          <p className="text-sm text-muted-foreground">Funding sources • opening = current at birth • only ledger mutates current</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button><RiAddLine /> New account</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>New account</DialogTitle><DialogDescription>Type defaults to savings • amount as ₹ (single input)</DialogDescription></DialogHeader>
            <form onSubmit={submitCreate} className="space-y-4">
              <div className="space-y-2"><Label>Name *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="HDFC Savings" /></div>
              <div className="space-y-2"><Label>Type</Label><Select value={form.type} onValueChange={(v) => setForm({ ...form, type: (v ?? "savings") as "savings" | "current" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="savings">savings</SelectItem><SelectItem value="current">current</SelectItem></SelectContent></Select></div>
              <AmountInput value={form.opening} onChange={(v) => setForm({ ...form, opening: v })} label="Opening balance (₹) — can be 0" placeholder="5000.00" />
              <Button type="submit" className="w-full" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">All accounts</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? <div className="p-4"><Skeleton className="h-10 w-full" /></div> : !data?.length ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No accounts yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Opening</TableHead>
                  <TableHead>Current</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{a.type}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{formatRupees(a.openingBalancePaise)}</TableCell>
                    <TableCell className="font-mono text-sm">{formatRupees(a.currentBalancePaise)}</TableCell>
                    <TableCell><Badge variant={a.status === "active" ? "default" : "secondary"} className="capitalize">{a.status}</Badge></TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingId(a.id); setEditForm({ name: a.name, type: a.type, status: a.status }); }}>
                        <RiEditLine /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(editingId)} onOpenChange={(v) => !v && setEditingId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit account</DialogTitle><DialogDescription>Patch name/type/status</DialogDescription></DialogHeader>
          {editingId && (
            <form onSubmit={submitEdit} className="space-y-3">
              <div className="space-y-2"><Label>Name</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Type</Label><Select value={editForm.type} onValueChange={(v) => setEditForm({ ...editForm, type: (v ?? "savings") as "savings" | "current" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="savings">savings</SelectItem><SelectItem value="current">current</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Status</Label><Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: (v ?? "active") as "active" | "deactivated" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">active</SelectItem><SelectItem value="deactivated">deactivated</SelectItem></SelectContent></Select></div>
              <Button type="submit" className="w-full" disabled={update.isPending}>{update.isPending ? "Saving…" : "Save"}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <p className="text-xs text-muted-foreground">Single write path: only ledger mutates balances. Direct balance edits disabled.</p>
    </div>
  );
}

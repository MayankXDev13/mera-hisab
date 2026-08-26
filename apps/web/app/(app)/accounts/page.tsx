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
import { RiAddLine, RiEditLine, RiWallet3Line } from "@remixicon/react";

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] tracking-[0.16em] uppercase font-medium text-muted-foreground">
            <span className="size-1 rounded-full bg-primary" />
            Funding
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight leading-none mt-2">Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Where your money lives.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="rounded-full shadow-sm"><RiAddLine /> New account</Button>} />
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader><DialogTitle>New account</DialogTitle><DialogDescription>Add a bank or cash account.</DialogDescription></DialogHeader>
            <form onSubmit={submitCreate} className="space-y-4">
              <div className="space-y-2"><Label>Name *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="HDFC Savings" /></div>
              <div className="space-y-2"><Label>Type</Label><Select value={form.type} onValueChange={(v) => setForm({ ...form, type: (v ?? "savings") as "savings" | "current" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="savings">Savings</SelectItem><SelectItem value="current">Current</SelectItem></SelectContent></Select></div>
              <AmountInput value={form.opening} onChange={(v) => setForm({ ...form, opening: v })} label="Opening balance" placeholder="5000.00" />
              <Button type="submit" className="w-full rounded-full h-10" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create account"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="py-4 border-b bg-card flex flex-row items-center justify-between">
          <CardTitle className="text-[13px] flex items-center gap-2"><span className="size-7 rounded-lg bg-muted grid place-items-center"><RiWallet3Line className="size-3.5" /></span> All accounts</CardTitle>
          <span className="text-xs text-muted-foreground">{data?.length ?? 0} accounts</span>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? <div className="p-4"><Skeleton className="h-10 w-full rounded-xl" /></div> : !data?.length ? (
            <div className="p-10 text-center">
              <div className="mx-auto size-12 rounded-2xl bg-muted grid place-items-center"><RiWallet3Line className="size-6 text-muted-foreground" /></div>
              <p className="text-sm font-medium mt-3">No accounts yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add your first funding source to start lending.</p>
              <Button onClick={() => setOpen(true)} size="sm" className="mt-4 rounded-full"><RiAddLine /> New account</Button>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-[11px] tracking-[0.08em] uppercase font-medium text-muted-foreground">Name</TableHead>
                    <TableHead className="text-[11px] tracking-[0.08em] uppercase font-medium text-muted-foreground">Type</TableHead>
                    <TableHead className="text-right text-[11px] tracking-[0.08em] uppercase font-medium text-muted-foreground">Opening</TableHead>
                    <TableHead className="text-right text-[11px] tracking-[0.08em] uppercase font-medium text-muted-foreground">Current</TableHead>
                    <TableHead className="text-[11px] tracking-[0.08em] uppercase font-medium text-muted-foreground">Status</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((a) => (
                    <TableRow key={a.id} className="group">
                      <TableCell className="font-medium text-sm">{a.name}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize rounded-full text-[11px]">{a.type}</Badge></TableCell>
                      <TableCell className="font-mono text-xs text-right text-muted-foreground">{formatRupees(a.openingBalancePaise)}</TableCell>
                      <TableCell className="font-mono text-sm text-right font-medium">{formatRupees(a.currentBalancePaise)}</TableCell>
                      <TableCell><Badge variant={a.status === "active" ? "default" : "secondary"} className="capitalize rounded-full text-[11px]">{a.status}</Badge></TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" className="h-7 rounded-full" onClick={() => { setEditingId(a.id); setEditForm({ name: a.name, type: a.type, status: a.status }); }}>
                          <RiEditLine /> Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(editingId)} onOpenChange={(v) => !v && setEditingId(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>Edit account</DialogTitle><DialogDescription>Update name, type or status.</DialogDescription></DialogHeader>
          {editingId && (
            <form onSubmit={submitEdit} className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Type</Label><Select value={editForm.type} onValueChange={(v) => setEditForm({ ...editForm, type: (v ?? "savings") as "savings" | "current" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="savings">Savings</SelectItem><SelectItem value="current">Current</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Status</Label><Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: (v ?? "active") as "active" | "deactivated" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="deactivated">Deactivated</SelectItem></SelectContent></Select></div>
              <Button type="submit" className="w-full rounded-full h-10" disabled={update.isPending}>{update.isPending ? "Saving…" : "Save changes"}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

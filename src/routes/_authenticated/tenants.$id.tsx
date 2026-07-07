import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusDot, computeTenantStatus } from "@/components/status-dot";
import { TenantFormSheet } from "@/components/tenant-form";
import { uploadFile, signedUrl } from "@/lib/storage";
import { inr, fmtDate, monthName } from "@/lib/format";
import { ArrowLeft, Edit, FileText, Plus, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tenants/$id")({
  head: () => ({ meta: [{ title: "Tenant — RentBook" }] }),
  component: TenantDetail,
});

function TenantDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const { data: tenant } = useQuery({
    queryKey: ["tenant", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants")
        .select("*, rooms(id, room_number, properties(id, name))").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
  const { data: agreements = [] } = useQuery({
    queryKey: ["tenant-agreements", id],
    queryFn: async () => (await supabase.from("agreements").select("*").eq("tenant_id", id).order("start_date", { ascending: false })).data ?? [],
  });
  const { data: rent = [] } = useQuery({
    queryKey: ["tenant-rent", id],
    queryFn: async () => (await supabase.from("rent_records").select("*").eq("tenant_id", id).order("period_year", { ascending: false }).order("period_month", { ascending: false })).data ?? [],
  });
  const { data: bills = [] } = useQuery({
    queryKey: ["tenant-bills", id],
    queryFn: async () => (await supabase.from("electricity_bills").select("*").eq("tenant_id", id).order("period_year", { ascending: false }).order("period_month", { ascending: false })).data ?? [],
  });
  const { data: timeline = [] } = useQuery({
    queryKey: ["tenant-timeline", id],
    queryFn: async () => (await supabase.from("timeline_events").select("*").eq("tenant_id", id).order("event_date", { ascending: false })).data ?? [],
  });

  const currentRent = rent[0];
  const totalDue = currentRent ? Number(currentRent.amount_due) + Number(currentRent.water_charges) : 0;
  const status = computeTenantStatus({
    agreementExpiry: tenant?.agreement_expiry,
    rentDueDate: currentRent?.due_date,
    amountDue: totalDue,
    amountPaid: currentRent ? Number(currentRent.amount_paid) : 0,
  });

  return (
    <div>
      <PageHeader
        title={tenant?.full_name ?? "Tenant"}
        description={tenant?.rooms ? `${tenant.rooms.properties?.name} · Room ${tenant.rooms.room_number}` : "No room assigned"}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild><Link to="/tenants"><ArrowLeft className="size-4" /> Back</Link></Button>
            <Button onClick={() => setEditOpen(true)}><Edit className="size-4" /> Edit</Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardContent className="p-5 flex flex-wrap items-center gap-6">
            <Avatar className="size-16"><AvatarImage src={tenant?.photo_url ?? undefined} /><AvatarFallback>{tenant?.full_name?.[0]}</AvatarFallback></Avatar>
            <Info label="Status"><StatusDot status={status} showLabel /></Info>
            <Info label="Mobile" value={tenant?.mobile} />
            <Info label="Alt" value={tenant?.alt_mobile || "—"} />
            <Info label="Joining" value={fmtDate(tenant?.joining_date)} />
            <Info label="Rent" value={inr(tenant?.monthly_rent)} />
            <Info label="Deposit" value={inr(tenant?.security_deposit)} />
            <Info label="Agreement expiry" value={fmtDate(tenant?.agreement_expiry)} />
          </CardContent>
        </Card>

        <Tabs defaultValue="rent">
          <TabsList>
            <TabsTrigger value="rent">Rent</TabsTrigger>
            <TabsTrigger value="electricity">Electricity</TabsTrigger>
            <TabsTrigger value="agreements">Agreements</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
          </TabsList>

          <TabsContent value="rent" className="mt-4">
            <RentTab tenantId={id} records={rent} onChange={() => qc.invalidateQueries({ queryKey: ["tenant-rent", id] })} />
          </TabsContent>
          <TabsContent value="electricity" className="mt-4">
            <ElectricityTab tenantId={id} tenant={tenant} bills={bills} onChange={() => qc.invalidateQueries({ queryKey: ["tenant-bills", id] })} />
          </TabsContent>
          <TabsContent value="agreements" className="mt-4">
            <AgreementsTab tenantId={id} agreements={agreements} onChange={() => qc.invalidateQueries({ queryKey: ["tenant-agreements", id] })} />
          </TabsContent>
          <TabsContent value="timeline" className="mt-4">
            <TimelineTab events={timeline} />
          </TabsContent>
          <TabsContent value="files" className="mt-4">
            <FilesTab tenant={tenant} agreements={agreements} bills={bills} />
          </TabsContent>
        </Tabs>
      </div>
      <TenantFormSheet open={editOpen} onOpenChange={setEditOpen} tenant={tenant as any} />
    </div>
  );
}

function Info({ label, value, children }: { label: string; value?: any; children?: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-0.5">{children ?? value ?? "—"}</div>
    </div>
  );
}

function RentTab({ tenantId, records, onChange }: { tenantId: string; records: any[]; onChange: () => void }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">Rent history</CardTitle></CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rent records yet. Records are auto-generated at the start of each month.</p>
        ) : (
          <div className="space-y-2">
            {records.map((r) => <RentRow key={r.id} r={r} tenantId={tenantId} onChange={onChange} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RentRow({ r, tenantId, onChange }: { r: any; tenantId: string; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("cash");
  const [txn, setTxn] = useState("");
  const [remarks, setRemarks] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const total = Number(r.amount_due) + Number(r.water_charges);
  const paid = Number(r.amount_paid);
  const balance = Math.max(0, total - paid);

  const pay = useMutation({
    mutationFn: async () => {
      const amt = Number(amount);
      if (amt <= 0) throw new Error("Enter an amount");
      const { error } = await supabase.from("payments").insert({
        rent_record_id: r.id, tenant_id: tenantId, amount: amt, mode, transaction_id: txn || null, remarks: remarks || null, payment_date: date,
      });
      if (error) throw error;
      await supabase.from("timeline_events").insert({
        tenant_id: tenantId, event_type: "payment",
        description: `Paid ${inr(amt)} for ${monthName(r.period_month)} ${r.period_year} (${mode})`,
      });
    },
    onSuccess: () => { toast.success("Payment recorded"); setOpen(false); onChange(); setAmount(""); setTxn(""); setRemarks(""); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="flex items-center justify-between border border-border/60 rounded-md px-3 py-2.5">
      <div>
        <div className="font-medium text-sm">{monthName(r.period_month)} {r.period_year}</div>
        <div className="text-xs text-muted-foreground">Due {fmtDate(r.due_date)} · {inr(total)}</div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant={r.status === "paid" ? "default" : r.status === "partial" ? "secondary" : "destructive"}>{r.status}</Badge>
        <div className="text-right text-xs">
          <div>{inr(paid)} paid</div>
          {balance > 0 && <div className="text-muted-foreground">{inr(balance)} left</div>}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" variant="outline">Pay</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <FF label="Amount"><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(balance)} /></FF>
              <FF label="Payment date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></FF>
              <FF label="Mode">
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["cash","upi","bank_transfer","cheque","card","other"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FF>
              <FF label="Transaction ID"><Input value={txn} onChange={(e) => setTxn(e.target.value)} /></FF>
              <FF label="Remarks"><Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></FF>
            </div>
            <DialogFooter><Button onClick={() => pay.mutate()} disabled={pay.isPending}>Save payment</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

function ElectricityTab({ tenantId, tenant, bills, onChange }: { tenantId: string; tenant: any; bills: any[]; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    period_month: new Date().getMonth() + 1,
    period_year: new Date().getFullYear(),
    previous_reading: bills[0]?.current_reading ?? 0,
    current_reading: 0,
    rate: tenant?.electricity_rate ?? 8,
    fixed_charge: 0,
  });
  const [pdf, setPdf] = useState<File | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      const units = Number(form.current_reading) - Number(form.previous_reading);
      const amount = units * Number(form.rate) + Number(form.fixed_charge);
      let pdf_url: string | null = null;
      if (pdf) pdf_url = await uploadFile("bills", pdf, `t/${tenantId}`);
      const { error } = await supabase.from("electricity_bills").insert({
        tenant_id: tenantId, ...form, amount, pdf_url,
      });
      if (error) throw error;
      await supabase.from("timeline_events").insert({
        tenant_id: tenantId, event_type: "electricity",
        description: `Electricity bill ${monthName(form.period_month)} ${form.period_year}: ${units} units, ${inr(amount)}`,
      });
    },
    onSuccess: () => { toast.success("Bill added"); setOpen(false); setPdf(null); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Electricity bills</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="size-4" /> New bill</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New electricity bill</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <FF label="Month"><Input type="number" min={1} max={12} value={form.period_month} onChange={(e) => setForm({ ...form, period_month: Number(e.target.value) })} /></FF>
              <FF label="Year"><Input type="number" value={form.period_year} onChange={(e) => setForm({ ...form, period_year: Number(e.target.value) })} /></FF>
              <FF label="Previous reading"><Input type="number" value={form.previous_reading} onChange={(e) => setForm({ ...form, previous_reading: Number(e.target.value) })} /></FF>
              <FF label="Current reading"><Input type="number" value={form.current_reading} onChange={(e) => setForm({ ...form, current_reading: Number(e.target.value) })} /></FF>
              <FF label="Rate (₹/unit)"><Input type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })} /></FF>
              <FF label="Fixed charge"><Input type="number" value={form.fixed_charge} onChange={(e) => setForm({ ...form, fixed_charge: Number(e.target.value) })} /></FF>
              <FF label="Bill PDF"><Input type="file" accept="application/pdf,image/*" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} /></FF>
              <div className="col-span-2 text-sm text-muted-foreground">
                Units: {Math.max(0, Number(form.current_reading) - Number(form.previous_reading))} · Amount ~ {inr(Math.max(0, Number(form.current_reading) - Number(form.previous_reading)) * Number(form.rate) + Number(form.fixed_charge))}
              </div>
            </div>
            <DialogFooter><Button onClick={() => create.mutate()} disabled={create.isPending}>Save bill</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {bills.length === 0 ? <p className="text-sm text-muted-foreground">No bills yet.</p> : (
          <div className="space-y-2">
            {bills.map((b) => (
              <div key={b.id} className="flex items-center justify-between border border-border/60 rounded-md px-3 py-2.5 text-sm">
                <div>
                  <div className="font-medium">{monthName(b.period_month)} {b.period_year}</div>
                  <div className="text-xs text-muted-foreground">{b.previous_reading} → {b.current_reading} · {b.units} units @ ₹{b.rate} · fixed {inr(b.fixed_charge)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={b.paid ? "default" : "secondary"}>{b.paid ? "Paid" : "Unpaid"}</Badge>
                  <span className="font-medium">{inr(b.amount)}</span>
                  <Button size="sm" variant="outline" onClick={async () => { await supabase.from("electricity_bills").update({ paid: !b.paid }).eq("id", b.id); onChange(); }}>
                    Mark {b.paid ? "unpaid" : "paid"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AgreementsTab({ tenantId, agreements, onChange }: { tenantId: string; agreements: any[]; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    rent: 0, deposit: 0, lock_in_months: 6, notice_period_days: 30, notes: "",
  });
  const [pdf, setPdf] = useState<File | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      let pdf_url: string | null = null;
      if (pdf) pdf_url = await uploadFile("agreements", pdf, `t/${tenantId}`);
      const { error } = await supabase.from("agreements").insert({ tenant_id: tenantId, ...form, pdf_url });
      if (error) throw error;
      await supabase.from("tenants").update({ agreement_expiry: form.end_date }).eq("id", tenantId);
      await supabase.from("timeline_events").insert({
        tenant_id: tenantId, event_type: "agreement",
        description: `Agreement uploaded (${fmtDate(form.start_date)} → ${fmtDate(form.end_date)})`,
      });
    },
    onSuccess: () => { toast.success("Agreement saved"); setOpen(false); setPdf(null); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Agreements</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="size-4" /> New agreement</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add / renew agreement</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <FF label="Start date"><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></FF>
              <FF label="End date"><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></FF>
              <FF label="Rent"><Input type="number" value={form.rent} onChange={(e) => setForm({ ...form, rent: Number(e.target.value) })} /></FF>
              <FF label="Deposit"><Input type="number" value={form.deposit} onChange={(e) => setForm({ ...form, deposit: Number(e.target.value) })} /></FF>
              <FF label="Lock-in (months)"><Input type="number" value={form.lock_in_months} onChange={(e) => setForm({ ...form, lock_in_months: Number(e.target.value) })} /></FF>
              <FF label="Notice period (days)"><Input type="number" value={form.notice_period_days} onChange={(e) => setForm({ ...form, notice_period_days: Number(e.target.value) })} /></FF>
              <div className="col-span-2"><FF label="Agreement PDF"><Input type="file" accept="application/pdf" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} /></FF></div>
              <div className="col-span-2"><FF label="Notes"><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></FF></div>
            </div>
            <DialogFooter><Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {agreements.length === 0 ? <p className="text-sm text-muted-foreground">No agreements yet.</p> : (
          <div className="space-y-2">
            {agreements.map((a) => <AgreementRow key={a.id} a={a} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AgreementRow({ a }: { a: any }) {
  const [url, setUrl] = useState<string | null>(null);
  async function open() {
    if (!a.pdf_url) return;
    const u = await signedUrl("agreements", a.pdf_url);
    setUrl(u); if (u) window.open(u, "_blank");
  }
  return (
    <div className="flex items-center justify-between border border-border/60 rounded-md px-3 py-2.5 text-sm">
      <div>
        <div className="font-medium">{fmtDate(a.start_date)} → {fmtDate(a.end_date)}</div>
        <div className="text-xs text-muted-foreground">Rent {inr(a.rent)} · Deposit {inr(a.deposit)} · Lock-in {a.lock_in_months}mo · Notice {a.notice_period_days}d</div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{a.status}</Badge>
        {a.pdf_url && <Button size="sm" variant="outline" onClick={open}><FileText className="size-4" /> PDF</Button>}
      </div>
    </div>
  );
}

function TimelineTab({ events }: { events: any[] }) {
  if (events.length === 0) return <Card><CardContent className="p-6 text-sm text-muted-foreground">No activity yet.</CardContent></Card>;
  return (
    <Card><CardContent className="p-5">
      <ol className="relative border-l border-border/60 ml-3 space-y-4">
        {events.map((e) => (
          <li key={e.id} className="ml-4">
            <div className="absolute -left-[6px] mt-1.5 size-3 rounded-full bg-primary ring-4 ring-background" />
            <div className="text-xs text-muted-foreground">{fmtDate(e.event_date)} · {e.event_type}</div>
            <div className="text-sm">{e.description}</div>
          </li>
        ))}
      </ol>
    </CardContent></Card>
  );
}

function FilesTab({ tenant, agreements, bills }: { tenant: any; agreements: any[]; bills: any[] }) {
  const files: Array<{ label: string; bucket: string; path: string; kind: string }> = [];
  if (tenant?.photo_url) files.push({ label: "Profile photo", bucket: "tenant-photos", path: tenant.photo_url, kind: "photo" });
  if (tenant?.aadhaar_url) files.push({ label: "Aadhaar", bucket: "documents", path: tenant.aadhaar_url, kind: "aadhaar" });
  if (tenant?.police_verification_url) files.push({ label: "Police verification", bucket: "documents", path: tenant.police_verification_url, kind: "police" });
  for (const a of agreements) if (a.pdf_url) files.push({ label: `Agreement ${fmtDate(a.start_date)}`, bucket: "agreements", path: a.pdf_url, kind: "agreement" });
  for (const b of bills) if (b.pdf_url) files.push({ label: `Bill ${monthName(b.period_month)} ${b.period_year}`, bucket: "bills", path: b.pdf_url, kind: "bill" });

  return (
    <Card><CardContent className="p-5">
      {files.length === 0 ? <p className="text-sm text-muted-foreground">No files uploaded for this tenant.</p> : (
        <div className="grid gap-2 sm:grid-cols-2">
          {files.map((f, i) => <FileRow key={i} {...f} />)}
        </div>
      )}
    </CardContent></Card>
  );
}

function FileRow({ label, bucket, path }: { label: string; bucket: string; path: string }) {
  async function open() {
    const u = await signedUrl(bucket, path);
    if (u) window.open(u, "_blank");
    else toast.error("Could not fetch file");
  }
  return (
    <div className="flex items-center justify-between border border-border/60 rounded-md px-3 py-2 text-sm">
      <div className="flex items-center gap-2 truncate"><FileText className="size-4 text-muted-foreground" /><span className="truncate">{label}</span></div>
      <Button size="sm" variant="outline" onClick={open}><Download className="size-4" /> Open</Button>
    </div>
  );
}
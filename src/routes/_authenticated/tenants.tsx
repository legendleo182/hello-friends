import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusDot, computeTenantStatus } from "@/components/status-dot";
import { TenantFormSheet } from "@/components/tenant-form";
import { fetchTenants, currentMonthRent } from "@/lib/queries";
import { inr } from "@/lib/format";
import { Plus, Search, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tenants")({
  head: () => ({ meta: [{ title: "Tenants — RentBook" }] }),
  component: TenantsPage,
});

function TenantsPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [openForm, setOpenForm] = useState(false);
  const [editTenant, setEditTenant] = useState<any>(null);

  const { data: tenants = [] } = useQuery({ queryKey: ["tenants"], queryFn: fetchTenants });
  const { data: rent = [] } = useQuery({ queryKey: ["rent", "current"], queryFn: currentMonthRent });

  const rentByTenant = useMemo(() => {
    const map = new Map<string, any>();
    for (const r of rent) map.set(r.tenant_id, r);
    return map;
  }, [rent]);

  const filtered = tenants.filter((t: any) => {
    const term = q.toLowerCase();
    const hit = !term ||
      t.full_name?.toLowerCase().includes(term) ||
      t.mobile?.includes(term) ||
      t.rooms?.room_number?.toLowerCase().includes(term) ||
      t.rooms?.properties?.name?.toLowerCase().includes(term);
    if (!hit) return false;
    if (filter === "all") return true;
    const r = rentByTenant.get(t.id);
    const s = computeTenantStatus({
      agreementExpiry: t.agreement_expiry,
      rentDueDate: r?.due_date,
      amountDue: r ? Number(r.amount_due) + Number(r.water_charges) : 0,
      amountPaid: r ? Number(r.amount_paid) : 0,
    });
    if (filter === "paid") return s === "green";
    if (filter === "due") return s === "red";
    if (filter === "partial") return s === "yellow";
    if (filter === "expired") return s === "grey";
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Tenants"
        description={`${filtered.length} of ${tenants.length} tenants`}
        actions={<Button onClick={() => setOpenForm(true)}><Plus className="size-4" /> Add tenant</Button>}
      />
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search name, phone, room, property…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="paid">Rent paid</SelectItem>
              <SelectItem value="due">Due / overdue</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="expired">Agreement expired</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted-foreground">No tenants match your filters.</Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t: any) => {
              const r = rentByTenant.get(t.id);
              const totalDue = r ? Number(r.amount_due) + Number(r.water_charges) : 0;
              const paid = r ? Number(r.amount_paid) : 0;
              const status = computeTenantStatus({
                agreementExpiry: t.agreement_expiry, rentDueDate: r?.due_date,
                amountDue: totalDue, amountPaid: paid,
              });
              return (
                <Card key={t.id} className="p-4 hover:border-primary/60 transition-colors h-full relative">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2 size-7"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditTenant(t); }}
                    aria-label="Edit tenant"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Link to="/tenants/$id" params={{ id: t.id }} className="block">
                    <div className="flex items-start gap-3">
                      <Avatar className="size-11">
                        <AvatarImage src={t.photo_url ?? undefined} />
                        <AvatarFallback className="bg-accent text-accent-foreground">{t.full_name?.[0] ?? "?"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 pr-8">
                          <div className="font-medium truncate">{t.full_name}</div>
                          <StatusDot status={status} />
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {t.rooms ? `${t.rooms.properties?.name ?? ""} · Room ${t.rooms.room_number}` : "No room assigned"}
                        </div>
                        <div className="text-xs text-muted-foreground">{t.mobile}</div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <Info label="Rent" value={inr(t.monthly_rent)} />
                      <Info label="This month" value={r ? `${inr(paid)} / ${inr(totalDue)}` : "—"} />
                    </div>
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <TenantFormSheet open={openForm} onOpenChange={setOpenForm} />
      <TenantFormSheet open={!!editTenant} onOpenChange={(v) => !v && setEditTenant(null)} tenant={editTenant} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
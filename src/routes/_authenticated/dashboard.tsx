import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { inr, fmtDate, daysUntil } from "@/lib/format";
import { Users, Wallet, AlertTriangle, FileWarning } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — RentBook" }] }),
  component: Dashboard,
});

function Dashboard() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const { data: stats } = useQuery({
    queryKey: ["dashboard", month, year],
    queryFn: async () => {
      const [tenants, rent, bills, agreements] = await Promise.all([
        supabase.from("tenants").select("id, status", { count: "exact" }).eq("status", "active"),
        supabase.from("rent_records").select("amount_due, water_charges, amount_paid, status").eq("period_month", month).eq("period_year", year),
        supabase.from("electricity_bills").select("amount, paid").eq("period_month", month).eq("period_year", year),
        supabase.from("agreements").select("id, end_date, status, tenant_id, tenants(full_name)").eq("status", "active"),
      ]);
      const rentRows = rent.data ?? [];
      const totalDue = rentRows.reduce((s, r) => s + Number(r.amount_due) + Number(r.water_charges), 0);
      const totalPaid = rentRows.reduce((s, r) => s + Number(r.amount_paid), 0);
      const overdue = rentRows.filter((r) => r.status === "overdue" || r.status === "pending").length;
      const billRows = bills.data ?? [];
      const elecTotal = billRows.reduce((s, b) => s + Number(b.amount), 0);
      const elecPaid = billRows.filter((b) => b.paid).reduce((s, b) => s + Number(b.amount), 0);
      const expiring = (agreements.data ?? [])
        .map((a) => ({ ...a, days: daysUntil(a.end_date) ?? 9999 }))
        .filter((a) => a.days <= 30)
        .sort((a, b) => a.days - b.days);
      return {
        activeTenants: tenants.count ?? 0,
        totalDue, totalPaid, overdue,
        elecTotal, elecPaid,
        expiring,
      };
    },
  });

  const cards = [
    { label: "Active Tenants", value: stats?.activeTenants ?? 0, icon: Users, tone: "text-primary" },
    { label: "Collected this month", value: inr(stats?.totalPaid ?? 0), icon: Wallet, tone: "text-[color:var(--status-green)]" },
    { label: "Pending / Overdue", value: stats?.overdue ?? 0, icon: AlertTriangle, tone: "text-[color:var(--status-red)]" },
    { label: "Electricity billed", value: inr(stats?.elecTotal ?? 0), icon: FileWarning, tone: "text-[color:var(--status-yellow)]" },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Snapshot of your rental portfolio for this month." />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.label} className="border-border/70">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</div>
                    <Icon className={`size-4 ${c.tone}`} />
                  </div>
                  <div className="mt-2 text-2xl font-semibold">{c.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Collection</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Row label="Total due" value={inr(stats?.totalDue ?? 0)} />
              <Row label="Collected" value={inr(stats?.totalPaid ?? 0)} tone="text-[color:var(--status-green)]" />
              <Row label="Outstanding" value={inr(Math.max(0, (stats?.totalDue ?? 0) - (stats?.totalPaid ?? 0)))} tone="text-[color:var(--status-red)]" />
              <Row label="Electricity collected" value={`${inr(stats?.elecPaid ?? 0)} / ${inr(stats?.elecTotal ?? 0)}`} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Agreements expiring soon</CardTitle></CardHeader>
            <CardContent>
              {(stats?.expiring ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing to worry about in the next 30 days.</p>
              ) : (
                <ul className="space-y-2">
                  {stats!.expiring.slice(0, 6).map((a: any) => (
                    <li key={a.id} className="flex items-center justify-between text-sm">
                      <Link to="/tenants/$id" params={{ id: a.tenant_id }} className="hover:underline">
                        {a.tenants?.full_name ?? "Tenant"}
                      </Link>
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground">{fmtDate(a.end_date)}</span>
                        <Badge variant={a.days < 0 ? "destructive" : a.days <= 7 ? "destructive" : "secondary"}>
                          {a.days < 0 ? "Expired" : `${a.days}d`}
                        </Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${tone ?? ""}`}>{value}</span>
    </div>
  );
}
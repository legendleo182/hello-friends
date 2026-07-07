import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inr, monthName } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/electricity")({
  head: () => ({ meta: [{ title: "Electricity — RentBook" }] }),
  component: ElectricityPage,
});

function ElectricityPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: rows = [] } = useQuery({
    queryKey: ["elec-page", month, year],
    queryFn: async () => (await supabase.from("electricity_bills")
      .select("*, tenants(id, full_name, rooms(room_number, properties(name)))")
      .eq("period_month", month).eq("period_year", year)).data ?? [],
  });

  const total = rows.reduce((s: number, r: any) => s + Number(r.amount), 0);
  const paid = rows.filter((r: any) => r.paid).reduce((s: number, r: any) => s + Number(r.amount), 0);

  return (
    <div>
      <PageHeader
        title="Electricity"
        description={`${monthName(month)} ${year} · ${inr(paid)} of ${inr(total)} collected`}
        actions={
          <div className="flex gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <SelectItem key={m} value={String(m)}>{monthName(m)}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{[year - 1, year, year + 1].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        }
      />
      <div className="p-6">
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Prev</TableHead>
                <TableHead>Curr</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No bills recorded yet for this period.</TableCell></TableRow>}
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell><Link to="/tenants/$id" params={{ id: r.tenant_id }} className="hover:underline">{r.tenants?.full_name}</Link></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.tenants?.rooms ? `${r.tenants.rooms.properties?.name} · ${r.tenants.rooms.room_number}` : "—"}</TableCell>
                  <TableCell>{r.previous_reading}</TableCell>
                  <TableCell>{r.current_reading}</TableCell>
                  <TableCell>{r.units}</TableCell>
                  <TableCell>₹{r.rate}</TableCell>
                  <TableCell>{inr(r.amount)}</TableCell>
                  <TableCell><Badge variant={r.paid ? "default" : "secondary"}>{r.paid ? "Paid" : "Unpaid"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      </div>
    </div>
  );
}
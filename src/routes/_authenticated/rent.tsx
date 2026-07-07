import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDate, inr, monthName } from "@/lib/format";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/rent")({
  head: () => ({ meta: [{ title: "Rent — RentBook" }] }),
  component: RentPage,
});

function RentPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const qc = useQueryClient();

  const { data: rows = [] } = useQuery({
    queryKey: ["rent-page", month, year],
    queryFn: async () => (await supabase.from("rent_records")
      .select("*, tenants(id, full_name, mobile, rooms(room_number, properties(name)))")
      .eq("period_month", month).eq("period_year", year)
      .order("status")).data ?? [],
  });

  const gen = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("generate_monthly_rent");
      if (error) throw error;
      return data;
    },
    onSuccess: (n) => { toast.success(`Generated / verified rent for ${n} tenants`); qc.invalidateQueries({ queryKey: ["rent-page"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const totalDue = rows.reduce((s: number, r: any) => s + Number(r.amount_due) + Number(r.water_charges), 0);
  const totalPaid = rows.reduce((s: number, r: any) => s + Number(r.amount_paid), 0);

  return (
    <div>
      <PageHeader
        title="Rent"
        description={`${monthName(month)} ${year} · ${inr(totalPaid)} of ${inr(totalDue)} collected`}
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
            <Button variant="outline" onClick={() => gen.mutate()} disabled={gen.isPending}><RefreshCw className="size-4" /> Generate</Button>
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
                <TableHead>Due date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No records for this month. Click Generate.</TableCell></TableRow>}
              {rows.map((r: any) => {
                const total = Number(r.amount_due) + Number(r.water_charges);
                const paid = Number(r.amount_paid);
                return (
                  <TableRow key={r.id}>
                    <TableCell><Link to="/tenants/$id" params={{ id: r.tenant_id }} className="hover:underline">{r.tenants?.full_name}</Link></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.tenants?.rooms ? `${r.tenants.rooms.properties?.name} · ${r.tenants.rooms.room_number}` : "—"}</TableCell>
                    <TableCell>{fmtDate(r.due_date)}</TableCell>
                    <TableCell>{inr(total)}</TableCell>
                    <TableCell>{inr(paid)}</TableCell>
                    <TableCell><Badge variant={r.status === "paid" ? "default" : r.status === "partial" ? "secondary" : "destructive"}>{r.status}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent></Card>
      </div>
    </div>
  );
}
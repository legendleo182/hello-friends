import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDate, inr, daysUntil } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/agreements")({
  head: () => ({ meta: [{ title: "Agreements — RentBook" }] }),
  component: AgreementsPage,
});

function AgreementsPage() {
  const { data: rows = [] } = useQuery({
    queryKey: ["all-agreements"],
    queryFn: async () => (await supabase.from("agreements")
      .select("*, tenants(id, full_name, mobile)")
      .order("end_date")).data ?? [],
  });

  return (
    <div>
      <PageHeader title="Agreements" description="Renewals, expirations and lock-ins across every tenant." />
      <div className="p-6">
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Deposit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Countdown</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No agreements yet.</TableCell></TableRow>}
              {rows.map((a: any) => {
                const days = daysUntil(a.end_date) ?? 0;
                const tone = days < 0 ? "destructive" : days <= 7 ? "destructive" : days <= 30 ? "secondary" : "outline";
                return (
                  <TableRow key={a.id}>
                    <TableCell><Link to="/tenants/$id" params={{ id: a.tenant_id }} className="hover:underline">{a.tenants?.full_name}</Link></TableCell>
                    <TableCell>{fmtDate(a.start_date)}</TableCell>
                    <TableCell>{fmtDate(a.end_date)}</TableCell>
                    <TableCell>{inr(a.rent)}</TableCell>
                    <TableCell>{inr(a.deposit)}</TableCell>
                    <TableCell><Badge variant="secondary">{a.status}</Badge></TableCell>
                    <TableCell><Badge variant={tone as any}>{days < 0 ? "Expired" : `${days}d left`}</Badge></TableCell>
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
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inr, monthName, fmtDate } from "@/lib/format";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — RentBook" }] }),
  component: ReportsPage,
});

type Report = "collection" | "pending" | "electricity" | "deposit" | "tenants" | "agreements";

function ReportsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [report, setReport] = useState<Report>("collection");

  const { data } = useQuery({
    queryKey: ["report", report, month, year],
    queryFn: async () => {
      if (report === "collection" || report === "pending") {
        const { data } = await supabase.from("rent_records")
          .select("period_month, period_year, amount_due, water_charges, amount_paid, status, due_date, tenants(full_name, mobile)")
          .eq("period_month", month).eq("period_year", year);
        const rows = (data ?? []).map((r: any) => ({
          Tenant: r.tenants?.full_name, Mobile: r.tenants?.mobile,
          Period: `${monthName(r.period_month)} ${r.period_year}`,
          Due: Number(r.amount_due) + Number(r.water_charges),
          Paid: Number(r.amount_paid),
          Balance: Number(r.amount_due) + Number(r.water_charges) - Number(r.amount_paid),
          Status: r.status, "Due Date": fmtDate(r.due_date),
        }));
        return report === "pending" ? rows.filter((r) => r.Balance > 0) : rows;
      }
      if (report === "electricity") {
        const { data } = await supabase.from("electricity_bills")
          .select("period_month, period_year, previous_reading, current_reading, units, rate, fixed_charge, amount, paid, tenants(full_name)")
          .eq("period_month", month).eq("period_year", year);
        return (data ?? []).map((r: any) => ({
          Tenant: r.tenants?.full_name, Period: `${monthName(r.period_month)} ${r.period_year}`,
          Prev: r.previous_reading, Curr: r.current_reading, Units: r.units, Rate: r.rate,
          Fixed: r.fixed_charge, Amount: Number(r.amount), Paid: r.paid ? "Yes" : "No",
        }));
      }
      if (report === "deposit") {
        const { data } = await supabase.from("tenants").select("full_name, mobile, security_deposit, joining_date, status");
        return (data ?? []).map((t: any) => ({ Tenant: t.full_name, Mobile: t.mobile, Deposit: Number(t.security_deposit), Joined: fmtDate(t.joining_date), Status: t.status }));
      }
      if (report === "tenants") {
        const { data } = await supabase.from("tenants").select("full_name, mobile, monthly_rent, status, joining_date, agreement_expiry, rooms(room_number, properties(name))");
        return (data ?? []).map((t: any) => ({
          Tenant: t.full_name, Mobile: t.mobile, Rent: Number(t.monthly_rent),
          Property: t.rooms?.properties?.name ?? "—", Room: t.rooms?.room_number ?? "—",
          Joined: fmtDate(t.joining_date), Expiry: fmtDate(t.agreement_expiry), Status: t.status,
        }));
      }
      if (report === "agreements") {
        const { data } = await supabase.from("agreements").select("start_date, end_date, rent, deposit, status, tenants(full_name)").order("end_date");
        return (data ?? []).map((a: any) => ({
          Tenant: a.tenants?.full_name, Start: fmtDate(a.start_date), End: fmtDate(a.end_date),
          Rent: Number(a.rent), Deposit: Number(a.deposit), Status: a.status,
        }));
      }
      return [];
    },
  });

  const rows = (data ?? []) as Array<Record<string, any>>;
  const filename = `${report}_${monthName(month)}_${year}`;

  function exportCSV() {
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    downloadBlob(new Blob([csv], { type: "text/csv" }), `${filename}.csv`);
  }
  function exportXLSX() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), report);
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }
  function exportPDF() {
    const doc = new jsPDF();
    doc.text(`${report.toUpperCase()} — ${monthName(month)} ${year}`, 14, 14);
    autoTable(doc, {
      head: [Object.keys(rows[0] ?? { Empty: "" })],
      body: rows.map((r) => Object.values(r).map((v) => String(v ?? ""))),
      startY: 20, styles: { fontSize: 9 },
    });
    doc.save(`${filename}.pdf`);
  }
  function downloadBlob(blob: Blob, name: string) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Export monthly collection, pending rent, electricity, deposit and tenant reports."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV}><Download className="size-4" /> CSV</Button>
            <Button variant="outline" onClick={exportXLSX}><Download className="size-4" /> Excel</Button>
            <Button variant="outline" onClick={exportPDF}><Download className="size-4" /> PDF</Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={report} onValueChange={(v) => setReport(v as Report)}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="collection">Monthly collection</SelectItem>
              <SelectItem value="pending">Pending rent</SelectItem>
              <SelectItem value="electricity">Electricity collection</SelectItem>
              <SelectItem value="deposit">Security deposits</SelectItem>
              <SelectItem value="tenants">Tenant report</SelectItem>
              <SelectItem value="agreements">Agreement report</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <SelectItem key={m} value={String(m)}>{monthName(m)}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{[year - 1, year, year + 1].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">{rows.length} rows</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data for this selection.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground text-left">
                  <tr>{Object.keys(rows[0]).map((k) => <th key={k} className="py-2 pr-4 font-medium">{k}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-border/50">
                      {Object.keys(rows[0]).map((k) => <td key={k} className="py-2 pr-4">{typeof r[k] === "number" && k !== "Units" && k !== "Prev" && k !== "Curr" && k !== "Rate" && k !== "Fixed" ? inr(r[k]) : String(r[k] ?? "")}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
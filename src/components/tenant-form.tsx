import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchProperties } from "@/lib/queries";
import { uploadFile } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";

type Tenant = Record<string, unknown> & { id?: string };

export function TenantFormSheet({
  open, onOpenChange, tenant,
}: { open: boolean; onOpenChange: (v: boolean) => void; tenant?: Tenant | null }) {
  const qc = useQueryClient();
  const { data: properties } = useQuery({ queryKey: ["properties"], queryFn: fetchProperties, enabled: open });
  const [form, setForm] = useState<any>({});
  const [photo, setPhoto] = useState<File | null>(null);
  const [aadhaar, setAadhaar] = useState<File | null>(null);
  const [police, setPolice] = useState<File | null>(null);

  useEffect(() => {
    setForm(
      tenant ?? {
        full_name: "", father_name: "", mobile: "", alt_mobile: "",
        room_id: null, joining_date: new Date().toISOString().slice(0, 10),
        security_deposit: 0, monthly_rent: 0, electricity_rate: 8,
        water_charges: 0, rent_due_day: 5, agreement_expiry: "",
        status: "active", notes: "", telegram_chat_id: "",
      },
    );
    setPhoto(null); setAadhaar(null); setPolice(null);
  }, [tenant, open]);

  const mutate = useMutation({
    mutationFn: async () => {
      const payload: any = { ...form };
      if (!payload.agreement_expiry) payload.agreement_expiry = null;
      if (!payload.room_id) payload.room_id = null;
      if (photo) payload.photo_url = await uploadFile("tenant-photos", photo, "photos");
      if (aadhaar) payload.aadhaar_url = await uploadFile("documents", aadhaar, "aadhaar");
      if (police) payload.police_verification_url = await uploadFile("documents", police, "police");
      if (tenant?.id) {
        const { error } = await supabase.from("tenants").update(payload).eq("id", tenant.id);
        if (error) throw error;
        return tenant.id;
      }
      const { data, error } = await supabase.from("tenants").insert(payload).select("id").single();
      if (error) throw error;
      await supabase.from("timeline_events").insert({
        tenant_id: data.id, event_type: "tenant_added", description: "Tenant onboarded",
      });
      return data.id;
    },
    onSuccess: () => {
      toast.success(tenant?.id ? "Tenant updated" : "Tenant added");
      qc.invalidateQueries({ queryKey: ["tenants"] });
      qc.invalidateQueries({ queryKey: ["tenant"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const upd = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const rooms = (properties ?? []).flatMap((p: any) => p.rooms.map((r: any) => ({ ...r, propertyName: p.name })));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{tenant?.id ? "Edit tenant" : "Add tenant"}</SheetTitle>
          <SheetDescription>All fields with * are required.</SheetDescription>
        </SheetHeader>
        <form
          className="grid grid-cols-2 gap-3 p-4"
          onSubmit={(e) => { e.preventDefault(); mutate.mutate(); }}
        >
          <F label="Full name *" className="col-span-2"><Input required value={form.full_name ?? ""} onChange={(e) => upd("full_name", e.target.value)} /></F>
          <F label="Father's name"><Input value={form.father_name ?? ""} onChange={(e) => upd("father_name", e.target.value)} /></F>
          <F label="Mobile *"><Input required value={form.mobile ?? ""} onChange={(e) => upd("mobile", e.target.value)} /></F>
          <F label="Alternative number"><Input value={form.alt_mobile ?? ""} onChange={(e) => upd("alt_mobile", e.target.value)} /></F>
          <F label="Room">
            <Select value={form.room_id ?? "none"} onValueChange={(v) => upd("room_id", v === "none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {rooms.map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>{r.propertyName} — {r.room_number}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </F>
          <F label="Joining date *"><Input type="date" required value={form.joining_date ?? ""} onChange={(e) => upd("joining_date", e.target.value)} /></F>
          <F label="Security deposit"><Input type="number" min={0} value={form.security_deposit ?? 0} onChange={(e) => upd("security_deposit", Number(e.target.value))} /></F>
          <F label="Monthly rent"><Input type="number" min={0} value={form.monthly_rent ?? 0} onChange={(e) => upd("monthly_rent", Number(e.target.value))} /></F>
          <F label="Electricity rate (₹/unit)"><Input type="number" step="0.01" min={0} value={form.electricity_rate ?? 0} onChange={(e) => upd("electricity_rate", Number(e.target.value))} /></F>
          <F label="Water charges (₹/mo)"><Input type="number" min={0} value={form.water_charges ?? 0} onChange={(e) => upd("water_charges", Number(e.target.value))} /></F>
          <F label="Rent due day (1–28)"><Input type="number" min={1} max={28} value={form.rent_due_day ?? 5} onChange={(e) => upd("rent_due_day", Number(e.target.value))} /></F>
          <F label="Agreement expiry"><Input type="date" value={form.agreement_expiry ?? ""} onChange={(e) => upd("agreement_expiry", e.target.value)} /></F>
          <F label="Status">
            <Select value={form.status ?? "active"} onValueChange={(v) => upd("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="notice">On notice</SelectItem>
                <SelectItem value="vacated">Vacated</SelectItem>
              </SelectContent>
            </Select>
          </F>
          <F label="Telegram chat ID" className="col-span-2"><Input placeholder="Optional — for reminders" value={form.telegram_chat_id ?? ""} onChange={(e) => upd("telegram_chat_id", e.target.value)} /></F>
          <F label="Notes" className="col-span-2"><Textarea rows={2} value={form.notes ?? ""} onChange={(e) => upd("notes", e.target.value)} /></F>
          <F label="Photo"><Input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></F>
          <F label="Aadhaar upload"><Input type="file" accept="image/*,application/pdf" onChange={(e) => setAadhaar(e.target.files?.[0] ?? null)} /></F>
          <F label="Police verification" className="col-span-2"><Input type="file" accept="image/*,application/pdf" onChange={(e) => setPolice(e.target.files?.[0] ?? null)} /></F>
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutate.isPending}>{mutate.isPending ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function F({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
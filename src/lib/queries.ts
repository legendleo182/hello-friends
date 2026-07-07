import { supabase } from "@/integrations/supabase/client";

export async function fetchTenants() {
  const { data, error } = await supabase
    .from("tenants")
    .select("*, rooms(id, room_number, floor, properties(id, name))")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchProperties() {
  const { data, error } = await supabase
    .from("properties")
    .select("*, rooms(id, room_number, floor)")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function currentMonthRent() {
  const now = new Date();
  const { data, error } = await supabase
    .from("rent_records")
    .select("*, tenants(id, full_name, mobile, rooms(room_number, properties(name)))")
    .eq("period_month", now.getMonth() + 1)
    .eq("period_year", now.getFullYear())
    .order("due_date");
  if (error) throw error;
  return data ?? [];
}

export async function addTimelineEvent(tenantId: string, type: string, description: string, metadata?: unknown) {
  await supabase.from("timeline_events").insert({
    tenant_id: tenantId,
    event_type: type,
    description,
    metadata: metadata as never,
  });
}
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — RentBook" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { data: properties = [] } = useQuery({
    queryKey: ["properties-settings"],
    queryFn: async () => (await supabase.from("properties").select("*, rooms(*)").order("name")).data ?? [],
  });

  const [newProp, setNewProp] = useState({ name: "", address: "" });
  const [newRoom, setNewRoom] = useState({ property_id: "", room_number: "", floor: "" });

  const addProp = useMutation({
    mutationFn: async () => {
      if (!newProp.name) throw new Error("Name required");
      const { error } = await supabase.from("properties").insert(newProp);
      if (error) throw error;
    },
    onSuccess: () => { setNewProp({ name: "", address: "" }); qc.invalidateQueries({ queryKey: ["properties-settings"] }); qc.invalidateQueries({ queryKey: ["properties"] }); toast.success("Property added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const addRoom = useMutation({
    mutationFn: async () => {
      if (!newRoom.property_id || !newRoom.room_number) throw new Error("Property and number required");
      const { error } = await supabase.from("rooms").insert(newRoom);
      if (error) throw error;
    },
    onSuccess: () => { setNewRoom({ property_id: "", room_number: "", floor: "" }); qc.invalidateQueries({ queryKey: ["properties-settings"] }); qc.invalidateQueries({ queryKey: ["properties"] }); toast.success("Room added"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Settings" description="Manage properties, rooms, and reminders." />
      <div className="p-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Add property</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5"><Label>Name</Label><Input value={newProp.name} onChange={(e) => setNewProp({ ...newProp, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Address</Label><Input value={newProp.address} onChange={(e) => setNewProp({ ...newProp, address: e.target.value })} /></div>
            <Button onClick={() => addProp.mutate()} disabled={addProp.isPending}><Plus className="size-4" /> Add property</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Add room</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Property</Label>
              <Select value={newRoom.property_id} onValueChange={(v) => setNewRoom({ ...newRoom, property_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent>{properties.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Room number</Label><Input value={newRoom.room_number} onChange={(e) => setNewRoom({ ...newRoom, room_number: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Floor</Label><Input value={newRoom.floor} onChange={(e) => setNewRoom({ ...newRoom, floor: e.target.value })} /></div>
            </div>
            <Button onClick={() => addRoom.mutate()} disabled={addRoom.isPending}><Plus className="size-4" /> Add room</Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Properties</CardTitle></CardHeader>
          <CardContent>
            {properties.length === 0 ? <p className="text-sm text-muted-foreground">No properties yet.</p> : (
              <div className="space-y-4">
                {properties.map((p: any) => (
                  <div key={p.id} className="border border-border/60 rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.address || "No address"}</div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={async () => {
                        if (!confirm("Delete property and all its rooms?")) return;
                        await supabase.from("properties").delete().eq("id", p.id);
                        qc.invalidateQueries({ queryKey: ["properties-settings"] });
                      }}><Trash2 className="size-4 text-destructive" /></Button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {p.rooms.map((r: any) => (
                        <span key={r.id} className="text-xs rounded-md bg-muted px-2 py-1">{r.room_number}{r.floor ? ` · F${r.floor}` : ""}</span>
                      ))}
                      {p.rooms.length === 0 && <span className="text-xs text-muted-foreground">No rooms</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Telegram reminders</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Telegram reminders for rent due, overdue, partial payments, agreement expiry, and pending bills can be enabled by connecting a Telegram bot.</p>
            <p>To enable: connect the Telegram bot from Connectors, then add each tenant's chat ID on their profile. Reminders run daily.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
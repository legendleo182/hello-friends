import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { signedUrl, removeFile } from "@/lib/storage";
import { FileText, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/files")({
  head: () => ({ meta: [{ title: "Files — RentBook" }] }),
  component: FilesPage,
});

function FilesPage() {
  const [bucket, setBucket] = useState<string>("agreements");

  const { data: files = [], refetch } = useQuery({
    queryKey: ["files", bucket],
    queryFn: async () => {
      const { data } = await supabase.storage.from(bucket).list("", { limit: 200, sortBy: { column: "created_at", order: "desc" } });
      const items = data ?? [];
      const nested: any[] = [];
      for (const f of items) {
        if (f.name && !f.metadata) {
          const { data: sub } = await supabase.storage.from(bucket).list(f.name, { limit: 500 });
          for (const s of sub ?? []) nested.push({ ...s, path: `${f.name}/${s.name}` });
        } else {
          nested.push({ ...f, path: f.name });
        }
      }
      // Deep search one more level for tenant sub-folders
      const deeper: any[] = [];
      for (const n of nested) {
        if (!n.metadata) {
          const { data: sub } = await supabase.storage.from(bucket).list(n.path, { limit: 500 });
          for (const s of sub ?? []) deeper.push({ ...s, path: `${n.path}/${s.name}` });
        } else deeper.push(n);
      }
      return deeper.filter((x) => x.metadata);
    },
  });

  async function open(path: string) {
    const u = await signedUrl(bucket, path);
    if (u) window.open(u, "_blank");
  }
  async function del(path: string) {
    if (!confirm("Delete this file?")) return;
    await removeFile(bucket, path);
    toast.success("Deleted");
    refetch();
  }

  return (
    <div>
      <PageHeader title="File manager" description="Browse everything you've uploaded per category." actions={
        <Select value={bucket} onValueChange={setBucket}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="agreements">Agreements</SelectItem>
            <SelectItem value="documents">Aadhaar / Police</SelectItem>
            <SelectItem value="bills">Electricity bills</SelectItem>
            <SelectItem value="tenant-photos">Tenant photos</SelectItem>
          </SelectContent>
        </Select>
      } />
      <div className="p-6">
        <Card>
          <CardContent className="p-4">
            {files.length === 0 ? <p className="text-sm text-muted-foreground">No files here yet.</p> : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {files.map((f: any) => (
                  <div key={f.path} className="flex items-center justify-between border border-border/60 rounded-md px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0"><FileText className="size-4 text-muted-foreground" /><span className="truncate">{f.path}</span></div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => open(f.path)}><ExternalLink className="size-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => del(f.path)}><Trash2 className="size-4 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
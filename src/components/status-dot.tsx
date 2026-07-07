import { cn } from "@/lib/utils";

export type TenantStatus = "green" | "red" | "yellow" | "grey";

const styles: Record<TenantStatus, string> = {
  green: "bg-[color:var(--status-green)]",
  red: "bg-[color:var(--status-red)]",
  yellow: "bg-[color:var(--status-yellow)]",
  grey: "bg-[color:var(--status-grey)]",
};

const labels: Record<TenantStatus, string> = {
  green: "Rent paid",
  red: "Due today",
  yellow: "Balance remaining",
  grey: "Agreement expired",
};

export function StatusDot({ status, showLabel = false, className }: { status: TenantStatus; showLabel?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-xs", className)}>
      <span className={cn("size-2.5 rounded-full ring-2 ring-background", styles[status])} />
      {showLabel && <span className="text-muted-foreground">{labels[status]}</span>}
    </span>
  );
}

export function computeTenantStatus(input: {
  agreementExpiry?: string | null;
  rentDueDate?: string | null;
  amountDue?: number;
  amountPaid?: number;
}): TenantStatus {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (input.agreementExpiry) {
    const exp = new Date(input.agreementExpiry);
    if (exp < now) return "grey";
  }
  const due = Number(input.amountDue ?? 0);
  const paid = Number(input.amountPaid ?? 0);
  if (due <= 0) return "green";
  if (paid >= due) return "green";
  if (paid > 0) return "yellow";
  if (input.rentDueDate) {
    const d = new Date(input.rentDueDate);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === now.getTime()) return "red";
    if (d < now) return "red";
  }
  return "yellow";
}
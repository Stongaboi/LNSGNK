import { cn } from "@/lib/utils";

const STATUS: Record<string, { label: string; className: string }> = {
  checked_in: { label: "Checked in", className: "bg-amber-100 text-amber-800" },
  in_service: { label: "In service", className: "bg-secondary text-secondary-foreground" },
  awaiting_checkout_scan: { label: "Awaiting scan", className: "bg-blush text-primary" },
  flagged_stale: { label: "Flagged stale", className: "bg-orange-100 text-orange-800" },
  completed: { label: "Completed", className: "bg-emerald-100 text-emerald-700" },
  completed_override: { label: "Override", className: "bg-teal-100 text-teal-800" },
  abandoned: { label: "Abandoned", className: "bg-muted text-muted-foreground" },
  voided: { label: "Voided", className: "bg-red-100 text-red-700" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span className={cn("inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold", s.className)}>
      {s.label}
    </span>
  );
}

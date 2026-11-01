import { Ban, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { AdminVisit } from "@/hooks/use-admin-dashboard";
import { StatusBadge } from "@/components/status-badge";

const FORCE_CLOSE_STATUSES = ["awaiting_checkout_scan", "flagged_stale"];

type VisitsTableProps = {
  visits: AdminVisit[];
  onForceClose: (visit: AdminVisit) => void;
  onVoid: (visit: AdminVisit) => void;
};

function clientName(v: AdminVisit) {
  return v.client?.full_name || v.client?.phone || "Unknown client";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function VisitAction({ visit, onForceClose, onVoid }: { visit: AdminVisit } & Omit<VisitsTableProps, "visits">) {
  if (FORCE_CLOSE_STATUSES.includes(visit.status)) {
    return (
      <Button size="sm" onClick={() => onForceClose(visit)} className="h-9 rounded-full px-4 font-bold shadow-sm shadow-primary/25">
        <ShieldCheck className="h-4 w-4" /> Force Close
      </Button>
    );
  }
  if (visit.status === "completed") {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => onVoid(visit)}
        className="h-9 rounded-full border-2 border-destructive/40 px-4 font-bold text-destructive hover:bg-red-50 hover:text-destructive"
      >
        <Ban className="h-4 w-4" /> Void
      </Button>
    );
  }
  return <span className="text-xs font-semibold text-muted-foreground">—</span>;
}

export function VisitsTable({ visits, onForceClose, onVoid }: VisitsTableProps) {
  if (visits.length === 0) {
    return (
      <div className="rounded-[2rem] bg-card p-10 text-center shadow-md">
        <p className="font-display text-xl font-bold">No visits yet</p>
        <p className="text-sm font-medium text-muted-foreground">Visits will show up here once clients check in.</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: cards */}
      <ul className="space-y-3 md:hidden">
        {visits.map((v) => (
          <li key={v.id} className="rounded-[1.75rem] bg-card p-4 shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold">{clientName(v)}</p>
                <p className="text-xs font-semibold text-muted-foreground">
                  {formatDate(v.opened_at)} · {v.employee?.full_name ?? "No tech yet"}
                </p>
              </div>
              <StatusBadge status={v.status} />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="font-display text-xl font-bold">{formatCurrency(v.total)}</p>
              <VisitAction visit={v} onForceClose={onForceClose} onVoid={onVoid} />
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-[2rem] bg-card shadow-md md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-blush text-xs font-bold uppercase tracking-wider text-primary">
            <tr>
              <th className="px-5 py-4">Client</th>
              <th className="px-5 py-4">Employee</th>
              <th className="px-5 py-4">Date</th>
              <th className="px-5 py-4 text-right">Total</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visits.map((v) => (
              <tr key={v.id} className="transition-colors hover:bg-muted/60">
                <td className="px-5 py-3 font-bold">{clientName(v)}</td>
                <td className="px-5 py-3 font-medium text-muted-foreground">{v.employee?.full_name ?? "—"}</td>
                <td className="whitespace-nowrap px-5 py-3 font-medium text-muted-foreground">{formatDate(v.opened_at)}</td>
                <td className="px-5 py-3 text-right font-display text-base font-bold">{formatCurrency(v.total)}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={v.status} />
                </td>
                <td className="px-5 py-3 text-right">
                  <VisitAction visit={v} onForceClose={onForceClose} onVoid={onVoid} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

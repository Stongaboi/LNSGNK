import Link from "next/link";
import { CalendarHeart, ChevronRight, Smile } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { Visit } from "@/hooks/use-client-dashboard";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  completed: { label: "Completed", className: "bg-emerald-100 text-emerald-700" },
  completed_override: { label: "Completed", className: "bg-emerald-100 text-emerald-700" },
  abandoned: { label: "Abandoned", className: "bg-amber-100 text-amber-800" },
  voided: { label: "Voided", className: "bg-muted text-muted-foreground" },
};

export function VisitHistory({ visits }: { visits: Visit[] }) {
  return (
    <section className="animate-rise" style={{ animationDelay: "240ms" }}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Recent visits</h2>
        {visits.length > 0 && (
          <Link
            href="/history"
            className="flex items-center gap-1 rounded-full bg-blush px-3 py-1.5 text-sm font-bold text-primary hover:bg-primary hover:text-primary-foreground"
          >
            See all <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {visits.length === 0 ? (
        <div className="flex flex-col items-center rounded-[2rem] bg-card p-8 text-center shadow-md">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-blush text-primary">
            <Smile className="h-8 w-8" />
          </div>
          <p className="mt-3 font-display text-lg font-bold">No visits yet</p>
          <p className="text-sm font-medium text-muted-foreground">Your pampering history will show up here.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-[2rem] bg-card shadow-md">
          {visits.map((visit) => {
            const status = STATUS_LABEL[visit.status] ?? { label: visit.status, className: "bg-muted text-muted-foreground" };
            return (
              <li key={visit.id} className="flex items-center gap-4 p-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">
                  <CalendarHeart className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-foreground">
                    {new Date(visit.opened_at).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}
                  </p>
                  <span className={cn("mt-0.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold", status.className)}>
                    {status.label}
                  </span>
                </div>
                <p className="font-display text-lg font-bold text-foreground">
                  {formatCurrency(visit.amount_paid || visit.total)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

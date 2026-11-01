import { ChevronRight, Coffee, Loader2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QueueVisit } from "@/hooks/use-visit-queue";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  checked_in: { label: "Waiting", className: "bg-amber-100 text-amber-800" },
  in_service: { label: "In service", className: "bg-secondary text-secondary-foreground" },
};

type QueueListProps = {
  visits: QueueVisit[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (visit: QueueVisit) => void;
};

function minutesAgo(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return mins < 1 ? "just now" : `${mins} min ago`;
}

export function QueueList({ visits, loading, error, selectedId, onSelect }: QueueListProps) {
  return (
    <section className="rounded-[2rem] bg-card p-5 shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
          <Users className="h-6 w-6 text-primary" /> Live queue
        </h2>
        <span className="flex items-center gap-2 rounded-full bg-blush px-3 py-1 text-xs font-bold text-primary">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          {visits.length} active
        </span>
      </div>

      {loading && (
        <div className="grid h-40 place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {error && <p className="rounded-2xl bg-destructive/10 p-4 text-sm font-semibold text-destructive">{error}</p>}

      {!loading && !error && visits.length === 0 && (
        <div className="flex flex-col items-center py-10 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-secondary text-lilac">
            <Coffee className="h-8 w-8" />
          </div>
          <p className="mt-3 font-display text-lg font-bold">Queue is empty</p>
          <p className="text-sm font-medium text-muted-foreground">Clients appear here as they check in.</p>
        </div>
      )}

      <ul className="space-y-2">
        {visits.map((visit) => {
          const badge = STATUS_BADGE[visit.status];
          const name = visit.client?.full_name || visit.client?.phone || "Unknown client";
          const selected = visit.id === selectedId;
          return (
            <li key={visit.id}>
              <button
                onClick={() => onSelect(visit)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-full p-2 pr-4 text-left transition-all",
                  selected ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "bg-muted hover:bg-blush",
                )}
              >
                <span
                  className={cn(
                    "grid h-11 w-11 shrink-0 place-items-center rounded-full font-display text-lg font-bold",
                    selected ? "bg-white text-primary" : "bg-primary text-primary-foreground",
                  )}
                >
                  {name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{name}</span>
                  <span className={cn("text-xs font-semibold", selected ? "text-white/85" : "text-muted-foreground")}>
                    Checked in {minutesAgo(visit.opened_at)}
                  </span>
                </span>
                {badge && (
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", badge.className)}>{badge.label}</span>
                )}
                <ChevronRight className="h-5 w-5 shrink-0 opacity-60" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

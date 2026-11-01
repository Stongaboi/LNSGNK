import { CalendarHeart, UserRound } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { cn, formatCurrency } from "@/lib/utils";
import type { HistoryVisit } from "@/hooks/use-visit-history";

export function HistoryVisitCard({ visit, index }: { visit: HistoryVisit; index: number }) {
  const voided = visit.status === "voided";
  const techs = Array.from(new Set(visit.lines.map((l) => l.tech?.full_name).filter(Boolean))) as string[];
  const date = new Date(visit.opened_at);

  return (
    <li
      className={cn("animate-rise rounded-[2rem] bg-card p-5 shadow-md", voided && "opacity-75")}
      style={{ animationDelay: `${Math.min(index, 6) * 70}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blush text-primary">
            <CalendarHeart className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display text-lg font-bold leading-tight">
              {date.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <p className="text-xs font-semibold text-muted-foreground">
              {date.toLocaleDateString([], { year: "numeric" })} ·{" "}
              {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
        <StatusBadge status={visit.status} />
      </div>

      {visit.lines.length > 0 ? (
        <ul className="mt-4 space-y-1.5 rounded-3xl bg-muted/70 p-4">
          {visit.lines.map((line) => (
            <li
              key={line.id}
              className={cn(
                "flex items-center justify-between text-sm font-semibold",
                line.status === "voided" && "text-muted-foreground line-through",
              )}
            >
              <span>{line.service?.name ?? "Service"}</span>
              <span>{formatCurrency(line.price - line.discount_amount)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-3xl bg-muted/70 p-4 text-sm font-semibold text-muted-foreground">No services recorded</p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-secondary-foreground">
          <UserRound className="h-4 w-4 shrink-0" />
          <span className="truncate">{techs.length ? techs.join(", ") : "—"}</span>
        </p>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Paid</p>
          <p className={cn("font-display text-2xl font-bold", voided && "line-through")}>
            {formatCurrency(visit.amount_paid)}
          </p>
        </div>
      </div>
    </li>
  );
}

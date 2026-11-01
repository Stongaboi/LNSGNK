import { Banknote, CalendarCheck, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { AdminMetrics } from "@/hooks/use-admin-dashboard";

export function MetricCards({ metrics }: { metrics: AdminMetrics }) {
  const cards = [
    {
      label: "Total revenue",
      value: formatCurrency(metrics.revenue),
      hint: "From completed visits",
      icon: Banknote,
      className: "bg-primary text-primary-foreground shadow-primary/25",
      iconClass: "bg-white text-primary",
      hintClass: "text-white/85",
    },
    {
      label: "Completed visits",
      value: metrics.completedVisits.toLocaleString(),
      hint: "Excluding voided visits",
      icon: CalendarCheck,
      className: "bg-accent text-accent-foreground shadow-accent/25",
      iconClass: "bg-white text-accent",
      hintClass: "text-white/90",
    },
    {
      label: "Active clients",
      value: metrics.activeClients.toLocaleString(),
      hint: `${metrics.inSalonNow} in the salon right now`,
      icon: Users,
      className: "bg-card text-card-foreground shadow-primary/10 ring-2 ring-lilac/40",
      iconClass: "bg-secondary text-secondary-foreground",
      hintClass: "text-muted-foreground",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((card, i) => (
        <div
          key={card.label}
          className={`animate-rise rounded-[2rem] p-5 shadow-lg ${card.className}`}
          style={{ animationDelay: `${i * 90}ms` }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-wider opacity-90">{card.label}</p>
            <span className={`grid h-11 w-11 place-items-center rounded-full ${card.iconClass}`}>
              <card.icon className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 font-display text-4xl font-bold">{card.value}</p>
          <p className={`mt-1 text-sm font-semibold ${card.hintClass}`}>{card.hint}</p>
        </div>
      ))}
    </div>
  );
}

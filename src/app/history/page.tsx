"use client";

import { AlertCircle, Loader2, Smile } from "lucide-react";
import { BrandHeader } from "@/components/brand-header";
import { HistoryVisitCard } from "@/components/history/history-visit-card";
import { RoleGuard } from "@/components/auth/role-guard";
import { useProfile } from "@/components/auth-provider";
import { useVisitHistory } from "@/hooks/use-visit-history";
import { formatCurrency } from "@/lib/utils";

function HistoryView() {
  const profile = useProfile();
  const { visits, loading, error } = useVisitHistory(profile.id);
  const totalSpent = visits
    .filter((v) => v.status !== "voided")
    .reduce((sum, v) => sum + v.amount_paid, 0);

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-16">
      <BrandHeader />

      <section className="animate-rise mb-6 rounded-[2rem] bg-secondary p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-secondary-foreground">Your pampering diary</p>
        <h1 className="mt-1 font-display text-4xl font-bold text-foreground">Visit history</h1>
        {!loading && !error && (
          <p className="mt-2 font-semibold text-secondary-foreground">
            {visits.length} {visits.length === 1 ? "visit" : "visits"} · {formatCurrency(totalSpent)} spent
          </p>
        )}
      </section>

      {loading && (
        <div className="grid h-60 place-items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-[2rem] bg-destructive/10 p-5 text-destructive">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-semibold">Couldn&apos;t load your history: {error}</p>
        </div>
      )}

      {!loading && !error && visits.length === 0 && (
        <div className="flex flex-col items-center rounded-[2rem] bg-card p-10 text-center shadow-md">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-blush text-primary">
            <Smile className="h-8 w-8" />
          </div>
          <p className="mt-3 font-display text-xl font-bold">No past visits yet</p>
          <p className="text-sm font-medium text-muted-foreground">Once you&apos;ve checked out, your visits will show here.</p>
        </div>
      )}

      <ul className="space-y-4">
        {visits.map((visit, i) => (
          <HistoryVisitCard key={visit.id} visit={visit} index={i} />
        ))}
      </ul>
    </main>
  );
}

export default function HistoryPage() {
  return (
    <RoleGuard allow={["client"]}>
      <HistoryView />
    </RoleGuard>
  );
}

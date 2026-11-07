"use client";

import { useState } from "react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandHeader } from "@/components/brand-header";
import { MetricCards } from "@/components/admin/metric-cards";
import { VisitsTable } from "@/components/admin/visits-table";
import { ForceCloseDialog } from "@/components/admin/force-close-dialog";
import { VoidDialog } from "@/components/admin/void-dialog";
import { RoleGuard } from "@/components/auth/role-guard";
import { useAdminDashboard, type AdminVisit } from "@/hooks/use-admin-dashboard";

function ManagerDashboard() {
  const { metrics, visits, loading, error, refresh } = useAdminDashboard();
  const [forceCloseVisit, setForceCloseVisit] = useState<AdminVisit | null>(null);
  const [voidVisit, setVoidVisit] = useState<AdminVisit | null>(null);

  return (
    <main className="mx-auto min-h-screen w-full max-w-[90rem] px-4 pb-32">
      <div className="flex items-center justify-between">
        <BrandHeader />
        <span className="rounded-full bg-accent px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-accent-foreground">
          Manager
        </span>
      </div>

      {loading && (
        <div className="grid h-[60vh] place-items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-[2rem] bg-destructive/10 p-5 text-destructive">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-semibold">Couldn&apos;t load dashboard: {error}</p>
        </div>
      )}

      {metrics && (
        <div className="space-y-8">
          <section>
            <h1 className="mb-4 font-display text-3xl font-bold sm:text-4xl">Salon overview</h1>
            <MetricCards metrics={metrics} />
          </section>

          <section className="animate-rise" style={{ animationDelay: "250ms" }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold">Recent visits</h2>
              <Button
                variant="ghost"
                onClick={refresh}
                className="h-10 rounded-full bg-card px-4 font-bold text-primary shadow-sm hover:bg-blush hover:text-primary"
              >
                <RefreshCw className="h-4 w-4" /> Refresh
              </Button>
            </div>
            <VisitsTable visits={visits} onForceClose={setForceCloseVisit} onVoid={setVoidVisit} />
          </section>
        </div>
      )}

      <ForceCloseDialog
        visit={forceCloseVisit}
        onOpenChange={(open) => !open && setForceCloseVisit(null)}
        onDone={refresh}
      />
      <VoidDialog visit={voidVisit} onOpenChange={(open) => !open && setVoidVisit(null)} onDone={refresh} />
    </main>
  );
}

export default function ManagerDashboardPage() {
  return (
    <RoleGuard allow={["manager"]}>
      <ManagerDashboard />
    </RoleGuard>
  );
}
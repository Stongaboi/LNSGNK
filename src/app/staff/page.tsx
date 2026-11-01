"use client";

import { useState } from "react";
import { MousePointerClick } from "lucide-react";
import { BrandHeader } from "@/components/brand-header";
import { QueueList } from "@/components/staff/queue-list";
import { TillView } from "@/components/staff/till-view";
import { RoleGuard } from "@/components/auth/role-guard";
import { useVisitQueue, type QueueVisit } from "@/hooks/use-visit-queue";
import { cn } from "@/lib/utils";

function StaffTill() {
  const { visits, loading, error, refresh } = useVisitQueue();
  const [selected, setSelected] = useState<QueueVisit | null>(null);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 pb-16">
      <div className="flex items-center justify-between">
        <BrandHeader />
        <span className="rounded-full bg-lilac px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white">
          Staff till
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className={cn(selected && "hidden lg:block")}>
          <QueueList
            visits={visits}
            loading={loading}
            error={error}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
          />
        </div>

        <div className={cn(!selected && "hidden lg:block")}>
          {selected ? (
            <TillView key={selected.id} visit={selected} onBack={() => setSelected(null)} onChanged={refresh} />
          ) : (
            <div className="flex h-full min-h-80 flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-primary/30 bg-card/60 p-8 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-blush text-primary">
                <MousePointerClick className="h-8 w-8" />
              </div>
              <p className="mt-3 font-display text-xl font-bold">Pick a client</p>
              <p className="text-sm font-medium text-muted-foreground">Select someone from the queue to open their till.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function StaffTillPage() {
  return (
    <RoleGuard allow={["employee", "manager"]}>
      <StaffTill />
    </RoleGuard>
  );
}

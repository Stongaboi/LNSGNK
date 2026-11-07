"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { BrandHeader } from "@/components/brand-header";
import { RoleGuard } from "@/components/auth/role-guard";
import { Hero } from "@/components/dashboard/hero";
import { CheckInCard } from "@/components/dashboard/check-in-card";
import { LoyaltyCard } from "@/components/dashboard/loyalty-card";
import { RewardsList } from "@/components/dashboard/rewards-list";
import { VisitHistory } from "@/components/dashboard/visit-history";
import { useProfile } from "@/components/auth-provider";
import { useClientDashboard } from "@/hooks/use-client-dashboard";
import { supabase } from "@/integrations/supabase/client";

function ClientDashboard() {
  const router = useRouter();
  const profile = useProfile();
  const { data, error, loading, refresh } = useClientDashboard(profile.id);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // 1. Handle Supabase Auth redirects (magic links)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      setIsRedirecting(true);
      // Forward the token to the callback page
      window.location.href = `/auth/callback${hash}`;
    }
  }, []);

  // 2. Listen for realtime changes on this client's visits
  useEffect(() => {
    if (!profile.id) return;

    const channel = supabase
      .channel("client-visits")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "visit",
          filter: `client_id=eq.${profile.id}`,
        },
        () => {
          // When the status changes (e.g. from awaiting scan to completed), refresh the data
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile.id, refresh]);

  if (isRedirecting) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-16">
      <BrandHeader />

      {loading && (
        <div className="grid h-[60vh] place-items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-[2rem] bg-destructive/10 p-5 text-destructive">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-semibold">Couldn&apos;t load your dashboard: {error}</p>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <Hero name={profile.fullName} />
          <CheckInCard activeVisit={data.activeVisit} onCheckedIn={refresh} />
          <LoyaltyCard
            completedVisits={data.completedVisits}
            visitsPerReward={data.visitsPerReward}
            rewardValue={data.rewardValue}
          />
          <RewardsList rewards={data.rewards} />
          <VisitHistory visits={data.recentVisits} />
        </div>
      )}
    </main>
  );
}

export default function ClientDashboardPage() {
  return (
    <RoleGuard allow={["client"]}>
      <ClientDashboard />
    </RoleGuard>
  );
}
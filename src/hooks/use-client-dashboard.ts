"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ACTIVE_VISIT_STATUSES, COMPLETED_VISIT_STATUSES } from "@/lib/constants";

export type Visit = {
  id: string;
  status: string;
  opened_at: string;
  closed_at: string | null;
  total: number;
  amount_paid: number;
};

export type Reward = {
  id: string;
  code: string;
  type: string;
  value: number;
  expires_at: string | null;
};

export type DashboardData = {
  completedVisits: number;
  visitsPerReward: number;
  rewardValue: number;
  activeVisit: Visit | null;
  recentVisits: Visit[];
  rewards: Reward[];
};

const POLL_MS = 10000;

export function useClientDashboard(clientId: string) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [completedRes, visitsRes, rewardsRes, configRes] = await Promise.all([
      supabase
        .from("visit")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .in("status", [...COMPLETED_VISIT_STATUSES])
        .is("voided_at", null),
      supabase
        .from("visit")
        .select("id, status, opened_at, closed_at, total, amount_paid")
        .eq("client_id", clientId)
        .order("opened_at", { ascending: false })
        .limit(10),
      supabase
        .from("discount_code")
        .select("id, code, type, value, expires_at")
        .eq("client_id", clientId)
        .eq("status", "issued")
        .order("created_at", { ascending: false }),
      supabase
        .from("loyalty_config")
        .select("visits_per_reward, reward_value")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle(),
    ]);

    const firstError =
      completedRes.error || visitsRes.error || rewardsRes.error || configRes.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    const visits = (visitsRes.data ?? []).map((v) => ({
      ...v,
      total: Number(v.total),
      amount_paid: Number(v.amount_paid),
    })) as Visit[];

    setData({
      completedVisits: completedRes.count ?? 0,
      visitsPerReward: configRes.data?.visits_per_reward ?? 5,
      rewardValue: Number(configRes.data?.reward_value ?? 0),
      activeVisit:
        visits.find((v) => (ACTIVE_VISIT_STATUSES as readonly string[]).includes(v.status)) ?? null,
      recentVisits: visits.filter(
        (v) => !(ACTIVE_VISIT_STATUSES as readonly string[]).includes(v.status),
      ),
      rewards: (rewardsRes.data ?? []).map((r) => ({ ...r, value: Number(r.value) })) as Reward[],
    });
    setError(null);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  return { data, error, loading, refresh: load };
}

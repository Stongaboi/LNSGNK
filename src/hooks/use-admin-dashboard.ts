"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ACTIVE_VISIT_STATUSES, COMPLETED_VISIT_STATUSES } from "@/lib/constants";

export type AdminVisit = {
  id: string;
  status: string;
  opened_at: string;
  total: number;
  amount_paid: number;
  client: { full_name: string | null; phone: string } | null;
  employee: { full_name: string } | null;
};

export type AdminMetrics = {
  revenue: number;
  completedVisits: number;
  activeClients: number;
  inSalonNow: number;
};

const POLL_MS = 15000;

export function useAdminDashboard() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [visits, setVisits] = useState<AdminVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [revenueRes, clientsRes, inSalonRes, recentRes] = await Promise.all([
      supabase
        .from("visit")
        .select("amount_paid", { count: "exact" })
        .in("status", [...COMPLETED_VISIT_STATUSES])
        .is("voided_at", null),
      supabase.from("client").select("id", { count: "exact", head: true }).is("anonymised_at", null),
      supabase.from("visit").select("id", { count: "exact", head: true }).in("status", [...ACTIVE_VISIT_STATUSES]),
      supabase
        .from("visit")
        .select(
          "id, status, opened_at, total, amount_paid, client:client_id(full_name, phone), employee:created_by_employee_id(full_name)",
        )
        .order("opened_at", { ascending: false })
        .limit(10),
    ]);

    const firstError = revenueRes.error || clientsRes.error || inSalonRes.error || recentRes.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setMetrics({
      revenue: (revenueRes.data ?? []).reduce((sum, v) => sum + Number(v.amount_paid), 0),
      completedVisits: revenueRes.count ?? 0,
      activeClients: clientsRes.count ?? 0,
      inSalonNow: inSalonRes.count ?? 0,
    });
    setVisits(
      ((recentRes.data ?? []) as unknown as AdminVisit[]).map((v) => ({
        ...v,
        total: Number(v.total),
        amount_paid: Number(v.amount_paid),
      })),
    );
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  return { metrics, visits, loading, error, refresh: load };
}

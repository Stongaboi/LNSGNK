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
    try {
      // 1. Fetch metrics (same as before)
      const [revenueRes, clientsRes, inSalonRes] = await Promise.all([
        supabase.from("visit").select("amount_paid", { count: "exact" }).in("status", [...COMPLETED_VISIT_STATUSES]).is("voided_at", null),
        supabase.from("client").select("id", { count: "exact", head: true }).is("anonymised_at", null),
        supabase.from("visit").select("id", { count: "exact", head: true }).in("status", [...ACTIVE_VISIT_STATUSES]),
      ]);

      // 2. Fetch recent visits using the new RPC
      const { data: rpcData, error: rpcErr } = await supabase.rpc("rpc_admin_dashboard_data");
      
      if (rpcErr) throw rpcErr;
      if (revenueRes.error) throw revenueRes.error;
      if (clientsRes.error) throw clientsRes.error;
      if (inSalonRes.error) throw inSalonRes.error;

      setMetrics({
        revenue: (revenueRes.data ?? []).reduce((sum, v) => sum + Number(v.amount_paid), 0),
        completedVisits: revenueRes.count ?? 0,
        activeClients: clientsRes.count ?? 0,
        inSalonNow: inSalonRes.count ?? 0,
      });

      setVisits(
        (rpcData?.visits ?? []).map((v: any) => ({
          ...v,
          total: Number(v.total),
          amount_paid: Number(v.amount_paid),
        }))
      );
      setError(null);
    } catch (err: any) {
      console.error("Dashboard Error:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  return { metrics, visits, loading, error, refresh: load };
}
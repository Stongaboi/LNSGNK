"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QUEUE_VISIT_STATUSES } from "@/lib/mock-auth";

export type QueueVisit = {
  id: string;
  status: string;
  opened_at: string;
  client: { full_name: string | null; phone: string } | null;
};

const POLL_MS = 5000;

export function useVisitQueue() {
  const [visits, setVisits] = useState<QueueVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("visit")
      .select("id, status, opened_at, client:client_id(full_name, phone)")
      .in("status", [...QUEUE_VISIT_STATUSES])
      .order("opened_at", { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setVisits((data ?? []) as unknown as QueueVisit[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  return { visits, loading, error, refresh: load };
}

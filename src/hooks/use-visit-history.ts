"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ACTIVE_VISIT_STATUSES } from "@/lib/constants";

export type HistoryLine = {
  id: string;
  price: number;
  discount_amount: number;
  status: string;
  service: { name: string } | null;
  tech: { full_name: string } | null;
};

export type HistoryVisit = {
  id: string;
  status: string;
  opened_at: string;
  total: number;
  amount_paid: number;
  lines: HistoryLine[];
};

type RawVisit = Omit<HistoryVisit, "lines"> & { service_line: HistoryLine[] | null };

export function useVisitHistory(clientId: string) {
  const [visits, setVisits] = useState<HistoryVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("visit")
      .select(
        "id, status, opened_at, total, amount_paid, service_line(id, price, discount_amount, status, service:service_id(name), tech:serviced_by_employee_id(full_name))",
      )
      .eq("client_id", clientId)
      .not("status", "in", `(${ACTIVE_VISIT_STATUSES.join(",")})`)
      .order("opened_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
        } else {
          setVisits(
            ((data ?? []) as unknown as RawVisit[]).map(({ service_line, ...v }) => ({
              ...v,
              total: Number(v.total),
              amount_paid: Number(v.amount_paid),
              lines: (service_line ?? []).map((l) => ({
                ...l,
                price: Number(l.price),
                discount_amount: Number(l.discount_amount),
              })),
            })),
          );
        }
        setLoading(false);
      });
  }, [clientId]);

  return { visits, loading, error };
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandHeader } from "@/components/brand-header";
import { TechRating, type TechLines } from "@/components/checkout/tech-rating";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/auth/role-guard";
import { useProfile } from "@/components/auth-provider";
import { formatCurrency } from "@/lib/utils";

type VisitInfo = { id: string; total: number };
type BillLine = {
  id: string;
  price: number;
  discount_amount: number;
  serviced_by_employee_id: string;
  service: { name: string } | null;
  tech: { full_name: string } | null;
};

type Phase = "loading" | "ready" | "submitting" | "success" | "error";

const FRIENDLY_ERRORS: Record<string, string> = {
  "Invalid visit or QR token.": "This checkout code isn't valid. Please ask the till for a new one.",
  "QR does not belong to this client.": "This checkout code belongs to someone else.",
  "Visit is not awaiting checkout.": "This visit has already been checked out.",
  "QR has expired.": "This checkout code has expired. Please ask the till for a new one.",
};

function friendly(message: string) {
  return FRIENDLY_ERRORS[message] ?? message;
}

function Checkout() {
  const { token } = useParams<{ token: string }>();
  const profile = useProfile();
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [visit, setVisit] = useState<VisitInfo | null>(null);
  const [lines, setLines] = useState<BillLine[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("visit")
        .select("id, client_id, status, total, qr_expires_at")
        .eq("checkout_qr_token", token)
        .maybeSingle();

      if (error || !data) return fail("Invalid visit or QR token.");
      if (data.client_id !== profile.id) return fail("QR does not belong to this client.");
      if (data.status !== "awaiting_checkout_scan") return fail("Visit is not awaiting checkout.");
      if (data.qr_expires_at && new Date(data.qr_expires_at).getTime() < Date.now()) return fail("QR has expired.");

      const { data: lineData } = await supabase
        .from("service_line")
        .select(
          "id, price, discount_amount, serviced_by_employee_id, service:service_id(name), tech:serviced_by_employee_id(full_name)",
        )
        .eq("visit_id", data.id)
        .eq("status", "active");

      setVisit({ id: data.id, total: Number(data.total) });
      setLines(
        ((lineData ?? []) as unknown as BillLine[]).map((l) => ({
          ...l,
          price: Number(l.price),
          discount_amount: Number(l.discount_amount),
        })),
      );
      setPhase("ready");
    };

    const fail = (message: string) => {
      setError(friendly(message));
      setPhase("error");
    };

    load();
  }, [token, profile.id]);

  const handleCheckout = async () => {
    if (!visit) return;
    setPhase("submitting");
    const { error } = await supabase.rpc("rpc_checkout_complete", {
      p_visit_id: visit.id,
      p_client_id: profile.id,
      p_token: token,
      p_amount_paid: visit.total,
    });
    if (error) {
      setError(friendly(error.message));
      setPhase("error");
      return;
    }
    setPhase("success");
  };

  const techs: TechLines[] = Object.values(
    lines.reduce<Record<string, TechLines>>((acc, line) => {
      const id = line.serviced_by_employee_id;
      acc[id] ??= { techId: id, techName: line.tech?.full_name ?? "Your nail tech", lineIds: [], services: [] };
      acc[id].lineIds.push(line.id);
      if (line.service?.name) acc[id].services.push(line.service.name);
      return acc;
    }, {}),
  );

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 pb-16">
      <BrandHeader />

      {phase === "loading" && (
        <div className="grid h-[60vh] place-items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      )}

      {phase === "error" && (
        <section className="animate-rise mt-6 flex flex-col items-center rounded-[2rem] bg-card p-8 text-center shadow-md">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-10 w-10" />
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold">Oops, can&apos;t check out</h1>
          <p className="mt-2 font-semibold text-muted-foreground">{error}</p>
          <Button asChild variant="outline" className="mt-6 h-12 rounded-full border-2 border-primary px-8 font-bold text-primary hover:bg-blush hover:text-primary">
            <Link href="/">Back to my dashboard</Link>
          </Button>
        </section>
      )}

      {(phase === "ready" || phase === "submitting") && visit && (
        <section className="animate-rise mt-4 rounded-[2rem] bg-card p-6 shadow-md">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your bill</p>
          <h1 className="font-display text-3xl font-bold">Ready to check out?</h1>
          <ul className="mt-5 divide-y divide-border">
            {lines.map((line) => (
              <li key={line.id} className="flex items-center justify-between py-3">
                <span>
                  <span className="block font-bold">{line.service?.name ?? "Service"}</span>
                  <span className="text-xs font-semibold text-muted-foreground">with {line.tech?.full_name ?? "your tech"}</span>
                </span>
                <span className="font-bold">{formatCurrency(line.price - line.discount_amount)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between rounded-full bg-blush px-5 py-4">
            <span className="font-bold text-primary">Total</span>
            <span className="font-display text-3xl font-bold">{formatCurrency(visit.total)}</span>
          </div>
          <Button
            onClick={handleCheckout}
            disabled={phase === "submitting"}
            className="mt-5 h-14 w-full rounded-full bg-accent text-lg font-bold text-accent-foreground shadow-lg shadow-accent/30 hover:bg-accent/90"
          >
            {phase === "submitting" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            Confirm &amp; pay {formatCurrency(visit.total)}
          </Button>
        </section>
      )}

      {phase === "success" && visit && (
        <div className="space-y-6">
          <section className="animate-rise mt-4 flex flex-col items-center rounded-[2rem] bg-primary px-6 py-12 text-center text-primary-foreground shadow-xl shadow-primary/30">
            <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-primary shadow-lg">
              <CheckCircle2 className="h-16 w-16" />
            </div>
            <h1 className="mt-6 font-display text-6xl font-bold leading-none sm:text-7xl">Thank You!</h1>
            <p className="mt-4 text-xl font-bold text-white/95">You have been checked out</p>
            <p className="mt-2 font-semibold text-white/85">Paid {formatCurrency(visit.total)} · See you next time 💅</p>
          </section>

          <div className="animate-rise space-y-4" style={{ animationDelay: "200ms" }}>
            {techs.map((tech) => (
              <TechRating key={tech.techId} visitId={visit.id} tech={tech} />
            ))}
          </div>

          <Button asChild variant="ghost" className="h-12 w-full rounded-full font-bold text-primary hover:bg-blush hover:text-primary">
            <Link href="/">Back to my dashboard</Link>
          </Button>
        </div>
      )}
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <RoleGuard allow={["client"]}>
      <Checkout />
    </RoleGuard>
  );
}

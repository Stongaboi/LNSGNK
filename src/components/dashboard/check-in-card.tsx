"use client";

import { useState } from "react";
import { Loader2, Sparkles, Clock, Brush, QrCode, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/components/auth-provider";
import type { Visit } from "@/hooks/use-client-dashboard";

const STATUS_COPY: Record<string, { title: string; body: string; icon: typeof Clock }> = {
  checked_in: {
    title: "You are checked in!",
    body: "Grab a seat and relax — a nail tech will be with you shortly.",
    icon: Clock,
  },
  in_service: {
    title: "You're being pampered",
    body: "Your service is in progress. Sit back and enjoy!",
    icon: Brush,
  },
  awaiting_checkout_scan: {
    title: "All done — time to check out",
    body: "Scan the QR code at the till to complete your visit.",
    icon: QrCode,
  },
  flagged_stale: {
    title: "Your visit needs attention",
    body: "Please chat to our front desk to wrap things up.",
    icon: AlertTriangle,
  },
};

type CheckInCardProps = {
  activeVisit: Visit | null;
  onCheckedIn: () => void;
};

export function CheckInCard({ activeVisit, onCheckedIn }: CheckInCardProps) {
  const profile = useProfile();
  const [submitting, setSubmitting] = useState(false);

  const handleCheckIn = async () => {
    setSubmitting(true);
    const { error } = await supabase.rpc("rpc_start_visit", { p_client_id: profile.id });
    setSubmitting(false);
    if (error) {
      toast.error("Couldn't check you in", { description: error.message });
      return;
    }
    toast.success("You're checked in! 🎉");
    onCheckedIn();
  };

  if (activeVisit) {
    const copy = STATUS_COPY[activeVisit.status] ?? STATUS_COPY.checked_in;
    const Icon = copy.icon;
    return (
      <section
        className="animate-rise rounded-[2rem] border-2 border-primary/30 bg-card p-6 shadow-md"
        style={{ animationDelay: "60ms" }}
      >
        <div className="flex items-center gap-4">
          <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-blush text-primary">
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <Icon className="relative h-7 w-7" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">{copy.title}</h2>
            <p className="text-sm font-medium text-muted-foreground">{copy.body}</p>
          </div>
        </div>
        <p className="mt-4 rounded-full bg-muted px-4 py-2 text-center text-xs font-bold text-muted-foreground">
          Checked in at{" "}
          {new Date(activeVisit.opened_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </section>
    );
  }

  return (
    <section
      className="animate-rise rounded-[2rem] bg-card p-6 shadow-md"
      style={{ animationDelay: "60ms" }}
    >
      <h2 className="font-display text-2xl font-bold">Arrived at the salon?</h2>
      <p className="mt-1 text-sm font-medium text-muted-foreground">
        Tap below to let us know you're here and join the queue.
      </p>
      <Button
        onClick={handleCheckIn}
        disabled={submitting}
        className="mt-5 h-14 w-full rounded-full bg-accent text-lg font-bold text-accent-foreground shadow-lg shadow-accent/30 transition-transform hover:scale-[1.02] hover:bg-accent/90 active:scale-[0.98]"
      >
        {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
        {submitting ? "Checking you in…" : "Check In"}
      </Button>
    </section>
  );
}

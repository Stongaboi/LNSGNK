"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, ExternalLink, Smartphone, TimerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CHECKOUT_BASE_URL } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

type CheckoutQrProps = {
  visitId: string;
  token: string;
  total: number;
  clientName: string;
  onDone: () => void;
};

export function CheckoutQr({ visitId, token, total, clientName, onDone }: CheckoutQrProps) {
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [paid, setPaid] = useState(false);

  const checkoutUrl = `${CHECKOUT_BASE_URL}/checkout/${token}`;

  // Watch the visit so the till knows when the client has scanned and paid.
  useEffect(() => {
    const check = async () => {
      const { data } = await supabase
        .from("visit")
        .select("status, qr_expires_at")
        .eq("id", visitId)
        .maybeSingle();
      if (!data) return;
      if (data.status === "completed" || data.status === "completed_override") setPaid(true);
      if (data.qr_expires_at) setExpiresAt(new Date(data.qr_expires_at).getTime());
    };
    check();
    const poll = setInterval(check, 3000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [visitId]);

  const secondsLeft = expiresAt ? Math.max(0, Math.floor((expiresAt - now) / 1000)) : null;
  const expired = secondsLeft === 0 && !paid;

  if (paid) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <div className="grid h-24 w-24 place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-14 w-14" />
        </div>
        <h3 className="mt-4 font-display text-3xl font-bold">Paid &amp; checked out!</h3>
        <p className="mt-1 font-semibold text-muted-foreground">
          {clientName} paid {formatCurrency(total)}. Great work! 💖
        </p>
        <Button onClick={onDone} className="mt-6 h-12 rounded-full px-8 font-bold">
          Back to queue
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <p className="font-display text-xl font-bold">Total due: {formatCurrency(total)}</p>
      <div className="relative mt-4 rounded-[2rem] border-4 border-primary bg-white p-5 shadow-xl shadow-primary/20">
        <QRCodeSVG value={checkoutUrl} size={240} fgColor="#3D1430" level="M" className={expired ? "opacity-20" : ""} />
        {expired && (
          <div className="absolute inset-0 grid place-items-center">
            <span className="flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-sm font-bold text-white">
              <TimerOff className="h-4 w-4" /> QR expired
            </span>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center gap-3 rounded-full bg-blush px-5 py-3 text-left">
        <Smartphone className="h-6 w-6 shrink-0 text-primary" />
        <p className="text-sm font-bold text-foreground">
          Ask {clientName} to scan this code with their phone to check out.
        </p>
      </div>

      {secondsLeft !== null && !expired && (
        <p className="mt-3 text-sm font-semibold text-muted-foreground">
          Expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")} · waiting for scan…
        </p>
      )}
      {expired && (
        <p className="mt-3 text-sm font-semibold text-destructive">
          This code expired. A manager can complete the visit with an override.
        </p>
      )}

      <a
        href={`/checkout/${token}`}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary underline-offset-4 hover:underline"
      >
        Open checkout link (testing) <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

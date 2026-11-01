"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, Loader2, Lock, QrCode, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { MOCK_EMPLOYEE_ID } from "@/lib/mock-auth";
import { cn, formatCurrency } from "@/lib/utils";
import type { QueueVisit } from "@/hooks/use-visit-queue";
import { CheckoutQr } from "./checkout-qr";

type Service = { id: string; name: string; price: number; duration_minutes: number | null };
type ServiceLine = { id: string; service_id: string; price: number; discount_amount: number };

type TillViewProps = {
  visit: QueueVisit;
  onBack: () => void;
  onChanged: () => void;
};

export function TillView({ visit, onBack, onChanged }: TillViewProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [lines, setLines] = useState<ServiceLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const clientName = visit.client?.full_name || visit.client?.phone || "the client";

  const loadLines = useCallback(async () => {
    const { data, error } = await supabase
      .from("service_line")
      .select("id, service_id, price, discount_amount")
      .eq("visit_id", visit.id)
      .eq("status", "active");
    if (error) {
      toast.error("Couldn't load services on this visit", { description: error.message });
      return;
    }
    setLines((data ?? []).map((l) => ({ ...l, price: Number(l.price), discount_amount: Number(l.discount_amount) })));
  }, [visit.id]);

  useEffect(() => {
    setToken(null);
    setLoading(true);
    const loadServices = supabase
      .from("service")
      .select("id, name, price, duration_minutes")
      .eq("is_active", true)
      .order("price", { ascending: true })
      .then(({ data, error }) => {
        if (error) toast.error("Couldn't load services", { description: error.message });
        setServices((data ?? []).map((s) => ({ ...s, price: Number(s.price) })));
      });
    Promise.all([loadServices, loadLines()]).then(() => setLoading(false));
  }, [visit.id, loadLines]);

  const addedServiceIds = new Set(lines.map((l) => l.service_id));
  const total = lines.reduce((sum, l) => sum + l.price - l.discount_amount, 0);

  const handleAdd = async (serviceId: string) => {
    if (addedServiceIds.has(serviceId) || adding) return;
    setAdding(serviceId);
    const { error } = await supabase.rpc("rpc_add_service_line", {
      p_visit_id: visit.id,
      p_service_id: serviceId,
      p_tech_id: MOCK_EMPLOYEE_ID,
      p_employee_id: MOCK_EMPLOYEE_ID,
    });
    setAdding(null);
    if (error) {
      toast.error("Couldn't add service", { description: error.message });
      return;
    }
    await loadLines();
    onChanged();
  };

  const handleComplete = async () => {
    setCompleting(true);
    const { data, error } = await supabase.rpc("rpc_employee_complete_visit", {
      p_visit_id: visit.id,
      p_employee_id: MOCK_EMPLOYEE_ID,
    });
    setCompleting(false);
    if (error) {
      toast.error("Couldn't complete visit", { description: error.message });
      return;
    }
    setToken(data as string);
    onChanged();
  };

  return (
    <section className="animate-rise rounded-[2rem] bg-card p-5 shadow-md sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-11 w-11 shrink-0 rounded-full bg-muted hover:bg-blush lg:hidden"
          aria-label="Back to queue"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Till</p>
          <h2 className="truncate font-display text-2xl font-bold">{clientName}</h2>
        </div>
      </div>

      {token ? (
        <CheckoutQr visitId={visit.id} token={token} total={total} clientName={clientName} onDone={onBack} />
      ) : loading ? (
        <div className="grid h-60 place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {services.map((service) => {
              const added = addedServiceIds.has(service.id);
              const busy = adding === service.id;
              return (
                <li key={service.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-4 rounded-full border-2 p-3 pr-5 transition-colors",
                      added ? "cursor-default border-primary bg-blush" : "border-border hover:border-primary/50",
                    )}
                  >
                    <span className="grid h-6 w-6 place-items-center">
                      {busy ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : (
                        <Checkbox
                          checked={added}
                          disabled={added || !!adding}
                          onCheckedChange={(checked) => checked && handleAdd(service.id)}
                          className="h-6 w-6 rounded-full border-2 border-primary data-[state=checked]:bg-primary disabled:opacity-100"
                        />
                      )}
                    </span>
                    <span className="flex-1">
                      <span className="block font-bold text-foreground">{service.name}</span>
                      {service.duration_minutes && (
                        <span className="text-xs font-semibold text-muted-foreground">{service.duration_minutes} min</span>
                      )}
                    </span>
                    {added && <Lock className="h-4 w-4 text-primary/60" aria-label="Added" />}
                    <span className="font-display text-lg font-bold">{formatCurrency(service.price)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 px-2 text-xs font-semibold text-muted-foreground">
            Services are locked once added. Ask a manager to remove one.
          </p>

          <div className="mt-6 rounded-[1.75rem] bg-secondary p-5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-bold text-secondary-foreground">
                <Receipt className="h-5 w-5" /> Running total
              </span>
              <span className="font-display text-3xl font-bold text-foreground">{formatCurrency(total)}</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-secondary-foreground/80">
              {lines.length} {lines.length === 1 ? "service" : "services"} added
            </p>
          </div>

          <Button
            onClick={handleComplete}
            disabled={completing || lines.length === 0}
            className="mt-5 h-14 w-full rounded-full bg-accent text-base font-bold text-accent-foreground shadow-lg shadow-accent/30 hover:bg-accent/90"
          >
            {completing ? <Loader2 className="h-5 w-5 animate-spin" /> : lines.length ? <QrCode className="h-5 w-5" /> : <Check className="h-5 w-5" />}
            {lines.length === 0 ? "Add a service to complete" : "Complete & Generate Checkout QR"}
          </Button>
        </>
      )}
    </section>
  );
}

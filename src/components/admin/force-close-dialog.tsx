"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { MOCK_MANAGER_ID } from "@/lib/mock-auth";
import { formatCurrency } from "@/lib/utils";
import type { AdminVisit } from "@/hooks/use-admin-dashboard";

const schema = z.object({
  reason: z.string().trim().min(3, "Please give a reason (at least 3 characters)").max(500),
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount, e.g. 250 or 250.50"),
});

type FormValues = z.infer<typeof schema>;

type ForceCloseDialogProps = {
  visit: AdminVisit | null;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
};

export function ForceCloseDialog({ visit, onOpenChange, onDone }: ForceCloseDialogProps) {
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { reason: "", amount: "" } });

  useEffect(() => {
    if (visit) form.reset({ reason: "", amount: visit.total ? visit.total.toFixed(2) : "" });
  }, [visit, form]);

  const onSubmit = async (values: FormValues) => {
    if (!visit) return;
    const { error } = await supabase.rpc("rpc_manager_override", {
      p_visit_id: visit.id,
      p_manager_id: MOCK_MANAGER_ID,
      p_amount_paid: Number(values.amount),
      p_reason: values.reason,
    });
    if (error) {
      toast.error("Couldn't force close visit", { description: error.message });
      return;
    }
    toast.success("Visit force closed");
    onOpenChange(false);
    onDone();
  };

  const name = visit?.client?.full_name || visit?.client?.phone || "this client";

  return (
    <Dialog open={!!visit} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[2rem] border-2 border-primary/20 sm:rounded-[2rem]">
        <DialogHeader>
          <div className="mb-2 grid h-12 w-12 place-items-center rounded-full bg-blush text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <DialogTitle className="font-display text-2xl">Force close visit</DialogTitle>
          <DialogDescription className="font-medium">
            Close {name}&apos;s visit with a manager override
            {visit?.total ? ` (bill: ${formatCurrency(visit.total)})` : ""}. Loyalty rewards still apply.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Amount paid (R)</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" placeholder="0.00" className="h-12 rounded-full border-2 px-5 font-semibold" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Client paid cash, phone battery died"
                      className="min-h-24 rounded-3xl border-2 px-5 py-3 font-medium"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" className="h-12 rounded-full font-bold" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="h-12 rounded-full px-6 font-bold">
                {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Force close
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

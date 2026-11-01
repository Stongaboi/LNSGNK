"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Ban, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/components/auth-provider";
import { formatCurrency } from "@/lib/utils";
import type { AdminVisit } from "@/hooks/use-admin-dashboard";

const schema = z.object({
  reason: z.string().trim().min(3, "Please give a reason (at least 3 characters)").max(500),
  keepReward: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

type VoidDialogProps = {
  visit: AdminVisit | null;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
};

export function VoidDialog({ visit, onOpenChange, onDone }: VoidDialogProps) {
  const manager = useProfile();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { reason: "", keepReward: false } });

  useEffect(() => {
    if (visit) form.reset({ reason: "", keepReward: false });
  }, [visit, form]);

  const onSubmit = async (values: FormValues) => {
    if (!visit) return;
    const { error } = await supabase.rpc("rpc_void_visit", {
      p_visit_id: visit.id,
      p_manager_id: manager.id,
      p_reason: values.reason,
      p_keep_reward: values.keepReward,
    });
    if (error) {
      toast.error("Couldn't void visit", { description: error.message });
      return;
    }
    toast.success("Visit voided");
    onOpenChange(false);
    onDone();
  };

  const name = visit?.client?.full_name || visit?.client?.phone || "this client";

  return (
    <Dialog open={!!visit} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[2rem] border-2 border-destructive/20 sm:rounded-[2rem]">
        <DialogHeader>
          <div className="mb-2 grid h-12 w-12 place-items-center rounded-full bg-red-100 text-destructive">
            <Ban className="h-6 w-6" />
          </div>
          <DialogTitle className="font-display text-2xl">Void visit</DialogTitle>
          <DialogDescription className="font-medium">
            Void {name}&apos;s visit{visit ? ` (${formatCurrency(visit.amount_paid)} paid)` : ""}. All its services are
            voided too. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Duplicate visit created by mistake"
                      className="min-h-24 rounded-3xl border-2 px-5 py-3 font-medium"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="keepReward"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 rounded-3xl bg-muted p-4">
                  <div>
                    <FormLabel className="font-bold">Keep loyalty reward</FormLabel>
                    <FormDescription className="text-xs font-medium">
                      Off = take back any reward earned or redeemed on this visit.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" className="h-12 rounded-full font-bold" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={form.formState.isSubmitting}
                className="h-12 rounded-full px-6 font-bold"
              >
                {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Void visit
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, MailCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { friendlyAuthError } from "@/lib/auth-errors";
import { authInputClass } from "./sign-in-form";

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(100),
  phone: z
    .string()
    .transform((v) => v.replace(/[\s-()]/g, ""))
    .pipe(z.string().regex(/^\+?\d{9,15}$/, "Enter a valid phone number, e.g. +27821234567")),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

type FormInput = z.input<typeof schema>;
type Output = z.output<typeof schema>;

export function SignUpForm({ next }: { next: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<FormInput, unknown, Output>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", phone: "", email: "", password: "" },
  });

  const onSubmit = async (values: Output) => {
    setError(null);
    const callback = new URL("/auth/callback", window.location.origin);
    if (next) callback.searchParams.set("next", next);

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: callback.href,
        data: { full_name: values.fullName, phone: values.phone },
      },
    });
    if (error) {
      setError(friendlyAuthError(error.message));
      return;
    }
    // With email confirmation on there's no session yet; otherwise the page redirects.
    if (!data.session) setSentTo(values.email);
  };

  if (sentTo) {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-blush text-primary">
          <MailCheck className="h-8 w-8" />
        </div>
        <p className="mt-3 font-display text-2xl font-bold">Check your inbox</p>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          We sent a confirmation link to <span className="font-bold text-foreground">{sentTo}</span>. Tap it to finish
          signing up.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Full name</FormLabel>
              <FormControl>
                <Input autoComplete="name" placeholder="Thandi Mokoena" className={authInputClass} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Phone</FormLabel>
              <FormControl>
                <Input type="tel" autoComplete="tel" placeholder="+27 82 123 4567" className={authInputClass} {...field} />
              </FormControl>
              <FormDescription className="px-2 text-xs">
                Already a client? Use the number the salon has on file and we&apos;ll link your history.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" placeholder="you@example.com" className={authInputClass} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" placeholder="At least 8 characters" className={authInputClass} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {error && <p className="rounded-2xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</p>}
        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="h-12 w-full rounded-full bg-accent text-base font-bold text-accent-foreground shadow-lg shadow-accent/30 hover:bg-accent/90"
        >
          {form.formState.isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
          Create account
        </Button>
      </form>
    </Form>
  );
}

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { friendlyAuthError } from "@/lib/auth-errors";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

type Values = z.infer<typeof schema>;

export const authInputClass = "h-12 rounded-full border-2 bg-muted/40 px-5 font-semibold focus-visible:ring-primary";

export function SignInForm() {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const onSubmit = async (values: Values) => {
    setError(null);
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) setError(friendlyAuthError(error.message));
    // On success the auth context picks up the session and the page redirects.
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                <Input type="password" autoComplete="current-password" placeholder="••••••••" className={authInputClass} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {error && <p className="rounded-2xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</p>}
        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="h-12 w-full rounded-full text-base font-bold shadow-lg shadow-primary/25"
        >
          {form.formState.isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
          Sign in
        </Button>
      </form>
    </Form>
  );
}

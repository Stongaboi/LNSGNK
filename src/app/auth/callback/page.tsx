"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { UnlinkedAccount } from "@/components/auth/unlinked-account";
import { useAuth } from "@/components/auth-provider";
import { homeForRole, safeNextPath } from "@/lib/roles";

function CallbackView() {
  const { session, profile, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const [linkError, setLinkError] = useState<string | null>(null);

  // Supabase puts auth errors (e.g. an expired link) in the URL hash or query.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    setLinkError(hash.get("error_description") ?? params.get("error_description"));
  }, [params]);

  useEffect(() => {
    if (!loading && session && profile) router.replace(next ?? homeForRole(profile.role));
  }, [loading, session, profile, next, router]);

  if (!loading && session && !profile) return <UnlinkedAccount />;

  if (linkError || (!loading && !session)) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-[2rem] bg-card p-8 text-center shadow-md">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">That link didn&apos;t work</h1>
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          {linkError ?? "The link may have expired or already been used."}
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-6 font-bold text-primary-foreground"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="grid min-h-[70vh] place-items-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackView />
    </Suspense>
  );
}

"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { homeForRole, type Role } from "@/lib/roles";
import { UnlinkedAccount } from "./unlinked-account";

type RoleGuardProps = {
  allow: Role[];
  children: React.ReactNode;
};

function FullPageSpinner() {
  return (
    <div className="grid min-h-[70vh] place-items-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );
}

/**
 * Client-side route protection. This controls what the UI shows; real data
 * protection must come from RLS + RPC checks in the database.
 */
export function RoleGuard({ allow, children }: RoleGuardProps) {
  const { session, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const allowed = !!profile && allow.includes(profile.role);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (profile && !allowed) {
      router.replace(homeForRole(profile.role));
    }
  }, [loading, session, profile, allowed, pathname, router]);

  if (loading || !session) return <FullPageSpinner />;
  if (!profile) return <UnlinkedAccount />;
  if (!allowed) return <FullPageSpinner />;
  return <>{children}</>;
}

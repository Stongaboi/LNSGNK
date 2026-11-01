"use client";

import { UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";

export function UnlinkedAccount() {
  const { user, profileError, signOut } = useAuth();

  return (
    <div className="mx-auto mt-16 max-w-md rounded-[2rem] bg-card p-8 text-center shadow-md">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-blush text-primary">
        <UserX className="h-8 w-8" />
      </div>
      <h1 className="mt-4 font-display text-2xl font-bold">Account not linked yet</h1>
      <p className="mt-2 text-sm font-medium text-muted-foreground">
        You&apos;re signed in as <span className="font-bold text-foreground">{user?.email}</span>, but this login
        isn&apos;t linked to a client or staff profile. Please ask the salon to link your account.
      </p>
      {profileError && (
        <p className="mt-3 rounded-2xl bg-destructive/10 p-3 text-xs font-semibold text-destructive">{profileError}</p>
      )}
      <Button onClick={signOut} variant="outline" className="mt-6 h-11 rounded-full border-2 px-6 font-bold">
        Sign out
      </Button>
    </div>
  );
}

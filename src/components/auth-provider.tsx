"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Profile, Role } from "@/lib/roles";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** True until the session AND (if signed in) the profile have been resolved. */
  loading: boolean;
  profileError: string | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(authUserId: string): Promise<Profile | null> {
  const { data: employee, error: employeeError } = await supabase
    .from("employee")
    .select("id, full_name, role")
    .eq("auth_user_id", authUserId)
    .eq("is_active", true)
    .maybeSingle();
  if (employeeError) throw employeeError;
  if (employee) {
    return { id: employee.id, fullName: employee.full_name, role: employee.role as Role };
  }

  const { data: client, error: clientError } = await supabase
    .from("client")
    .select("id, full_name")
    .eq("auth_user_id", authUserId)
    .is("anonymised_at", null)
    .maybeSingle();
  if (clientError) throw clientError;
  if (client) return { id: client.id, fullName: client.full_name, role: "client" };

  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileFor, setProfileFor] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      // Keep this callback synchronous: Supabase queries inside it can deadlock.
      setSession(newSession);
      setSessionLoaded(true);
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setProfileFor(null);
        setProfileError(null);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchProfile(userId)
      .then((p) => {
        if (cancelled) return;
        setProfile(p);
        setProfileError(null);
      })
      .catch((err: { message?: string }) => {
        if (cancelled) return;
        setProfile(null);
        setProfileError(err.message ?? "Couldn't load your account.");
      })
      .finally(() => {
        if (!cancelled) setProfileFor(userId);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const loading = !sessionLoaded || (!!userId && profileFor !== userId);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile: userId ? profile : null,
        loading,
        profileError,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** For components rendered inside <RoleGuard>, where a profile is guaranteed. */
export function useProfile(): Profile {
  const { profile } = useAuth();
  if (!profile) throw new Error("useProfile must be used inside <RoleGuard>");
  return profile;
}

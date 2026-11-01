"use client";

import { Suspense, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignInForm } from "@/components/auth/sign-in-form";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { UnlinkedAccount } from "@/components/auth/unlinked-account";
import { useAuth } from "@/contexts/auth-context";
import { homeForRole, safeNextPath } from "@/lib/roles";

function LoginView() {
  const { session, profile, loading } = useAuth();
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get("next"));

  useEffect(() => {
    if (!loading && session && profile) router.replace(next ?? homeForRole(profile.role));
  }, [loading, session, profile, next, router]);

  if (loading || (session && profile)) {
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (session && !profile) return <UnlinkedAccount />;

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <div className="animate-rise overflow-hidden rounded-[2rem] bg-card shadow-xl shadow-primary/15">
        <div className="relative">
          <Image
            src="https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80"
            alt="Glossy pink manicure"
            width={900}
            height={500}
            priority
            className="h-40 w-full object-cover"
          />
          <div className="absolute inset-0 bg-[hsl(330_45%_18%/0.45)]" />
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 p-5">
            <Image src="/icon.svg" alt="" width={48} height={48} className="rounded-2xl shadow-lg" />
            <div>
              <p className="font-display text-2xl font-bold leading-none text-white">Giggles &amp; Kurls</p>
              <p className="text-sm font-semibold text-white/90">Sign in to your salon account</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {next?.startsWith("/checkout") && (
            <p className="mb-4 rounded-2xl bg-blush p-3 text-center text-sm font-bold text-primary">
              Sign in to finish checking out 💅
            </p>
          )}
          <Tabs defaultValue="signin">
            <TabsList className="grid h-12 w-full grid-cols-2 rounded-full bg-muted p-1">
              <TabsTrigger
                value="signin"
                className="h-full rounded-full font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Sign in
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="h-full rounded-full font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Create account
              </TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-5">
              <SignInForm />
            </TabsContent>
            <TabsContent value="signup" className="mt-5">
              <SignUpForm next={next} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginView />
    </Suspense>
  );
}

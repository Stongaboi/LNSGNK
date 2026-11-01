"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { History, Home, LayoutDashboard, LogOut, Scissors } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { ROUTE_ROLES } from "@/lib/roles";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Client", icon: Home },
  { href: "/history", label: "History", icon: History },
  { href: "/staff", label: "Till", icon: Scissors },
  { href: "/admin", label: "Manager", icon: LayoutDashboard },
];

const HIDDEN_ON = ["/checkout", "/login", "/auth"];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();

  if (!profile || HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  const links = LINKS.filter((l) => ROUTE_ROLES[l.href].includes(profile.role));

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <nav
      aria-label="App sections"
      className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-fit items-center gap-1 rounded-full border-2 border-primary/15 bg-card/95 p-1.5 shadow-xl shadow-primary/20 backdrop-blur"
    >
      {links.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-2.5 text-sm font-bold transition-colors sm:px-4",
              active ? "bg-primary text-primary-foreground shadow-md shadow-primary/30" : "text-muted-foreground hover:bg-blush hover:text-primary",
            )}
          >
            <Icon className="h-4 w-4" />
            <span className={cn(!active && links.length > 2 && "hidden sm:inline")}>{label}</span>
          </Link>
        );
      })}
      <span className="mx-1 h-6 w-px bg-border" />
      <button
        onClick={handleSignOut}
        aria-label="Sign out"
        title={`Sign out${profile.fullName ? ` (${profile.fullName})` : ""}`}
        className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-blush hover:text-primary"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </nav>
  );
}

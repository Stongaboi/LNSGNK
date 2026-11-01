"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Home, LayoutDashboard, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Client", icon: Home },
  { href: "/history", label: "History", icon: History },
  { href: "/staff", label: "Till", icon: Scissors },
  { href: "/admin", label: "Manager", icon: LayoutDashboard },
];

export function AppNav() {
  const pathname = usePathname();

  // Keep the checkout screen focused on paying.
  if (pathname.startsWith("/checkout")) return null;

  return (
    <nav
      aria-label="App sections"
      className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-fit items-center gap-1 rounded-full border-2 border-primary/15 bg-card/95 p-1.5 shadow-xl shadow-primary/20 backdrop-blur"
    >
      {LINKS.map(({ href, label, icon: Icon }) => {
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
            <span className={cn(!active && "hidden sm:inline")}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

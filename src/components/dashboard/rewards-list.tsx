import { Ticket, Gift } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Reward } from "@/hooks/use-client-dashboard";

export function RewardsList({ rewards }: { rewards: Reward[] }) {
  return (
    <section className="animate-rise" style={{ animationDelay: "180ms" }}>
      <h2 className="mb-3 font-display text-2xl font-bold">Your rewards</h2>
      {rewards.length === 0 ? (
        <div className="flex items-center gap-4 rounded-[2rem] border-2 border-dashed border-lilac/60 bg-secondary p-5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-lilac">
            <Gift className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-secondary-foreground">
            No rewards yet — keep filling your loyalty card to unlock a treat!
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rewards.map((reward) => (
            <li
              key={reward.id}
              className="flex items-center gap-4 rounded-[2rem] bg-card p-4 shadow-md ring-2 ring-accent/30"
            >
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                <Ticket className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-xl font-bold text-foreground">
                  {formatCurrency(reward.value)} off
                </p>
                <p className="truncate font-mono text-sm font-bold tracking-wider text-primary">{reward.code}</p>
                {reward.expires_at && (
                  <p className="text-xs font-semibold text-muted-foreground">
                    Expires {new Date(reward.expires_at).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                )}
              </div>
              <span className="rounded-full bg-blush px-3 py-1 text-xs font-bold capitalize text-primary">
                {reward.type}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

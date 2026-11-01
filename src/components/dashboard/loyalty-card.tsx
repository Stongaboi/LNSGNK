import { Gift, Heart } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

type LoyaltyCardProps = {
  completedVisits: number;
  visitsPerReward: number;
  rewardValue: number;
};

export function LoyaltyCard({ completedVisits, visitsPerReward, rewardValue }: LoyaltyCardProps) {
  const progress = completedVisits % visitsPerReward;
  const remaining = visitsPerReward - progress;

  return (
    <section
      className="animate-rise rounded-[2rem] bg-primary p-6 text-primary-foreground shadow-lg shadow-primary/25"
      style={{ animationDelay: "120ms" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-white/80">Loyalty card</p>
          <p className="mt-1 font-display text-4xl font-bold">
            {progress}/{visitsPerReward}
            <span className="ml-2 text-lg font-semibold text-white/85">visits</span>
          </p>
        </div>
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-primary shadow-md">
          <Gift className="h-7 w-7" />
        </div>
      </div>

      <div className="mt-5 flex gap-2" role="progressbar" aria-valuemin={0} aria-valuemax={visitsPerReward} aria-valuenow={progress}>
        {Array.from({ length: visitsPerReward }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "grid h-11 flex-1 place-items-center rounded-full border-2 border-white/60 transition-colors",
              i < progress ? "bg-white text-primary" : "bg-white/10 text-white/50",
            )}
          >
            <Heart className={cn("h-5 w-5", i < progress && "fill-current")} />
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm font-semibold text-white/95">
        {remaining === visitsPerReward && completedVisits > 0
          ? "Reward unlocked! Start your next card today."
          : `${remaining} more ${remaining === 1 ? "visit" : "visits"} until your ${
              rewardValue > 0 ? formatCurrency(rewardValue) + " " : ""
            }treat 🎁`}
      </p>
    </section>
  );
}

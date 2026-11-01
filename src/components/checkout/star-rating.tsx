"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type StarRatingProps = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
};

export function StarRating({ value, onChange, disabled }: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="flex justify-center gap-1.5" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          disabled={disabled}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className="rounded-full p-1 transition-transform hover:scale-110 active:scale-95 disabled:pointer-events-none"
        >
          <Star
            className={cn(
              "h-10 w-10 transition-colors",
              n <= shown ? "fill-amber-400 text-amber-400" : "fill-transparent text-border",
            )}
          />
        </button>
      ))}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { StarRating } from "./star-rating";

export type TechLines = {
  techId: string;
  techName: string;
  lineIds: string[];
  services: string[];
};

type TechRatingProps = { visitId: string; tech: TechLines };

const LABELS = ["", "Not great", "Okay", "Good", "Great", "Amazing!"];

export function TechRating({ visitId, tech }: TechRatingProps) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    // One rating per service line (the table enforces a unique service_line_id).
    const { error } = await supabase.from("rating").insert(
      tech.lineIds.map((lineId) => ({
        visit_id: visitId,
        service_line_id: lineId,
        serviced_by_employee_id: tech.techId,
        score,
        comment: comment.trim().slice(0, 500) || null,
      })),
    );
    setSubmitting(false);
    if (error) {
      toast.error("Couldn't save your rating", { description: error.message });
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="rounded-[2rem] bg-card p-6 text-center shadow-md">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rate your nail tech</p>
      <p className="mt-1 font-display text-2xl font-bold">{tech.techName}</p>
      <p className="text-sm font-semibold text-muted-foreground">{tech.services.join(" · ")}</p>

      {submitted ? (
        <div className="mt-5 flex flex-col items-center gap-2">
          <StarRating value={score} onChange={() => {}} disabled />
          <p className="flex items-center gap-2 font-bold text-primary">
            <Heart className="h-5 w-5 fill-current" /> Thanks for the love!
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4">
            <StarRating value={score} onChange={setScore} disabled={submitting} />
            <p className="mt-1 h-5 text-sm font-bold text-primary">{LABELS[score]}</p>
          </div>
          {score > 0 && (
            <div className="animate-rise mt-3 space-y-3">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                placeholder="Anything you'd like to share? (optional)"
                className="min-h-20 rounded-3xl border-2 bg-muted/50 px-4 py-3 font-medium focus-visible:ring-primary"
              />
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="h-12 w-full rounded-full font-bold shadow-md shadow-primary/25"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit rating
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

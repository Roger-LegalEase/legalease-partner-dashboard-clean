import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "teal" | "blue" | "orange" | "neutral";

const tones: Record<BadgeTone, string> = {
  teal: "border-teal/30 bg-teal/10 text-teal",
  blue: "border-wilmaBlue/25 bg-wilmaBlue/10 text-wilmaBlue",
  orange: "border-orange/30 bg-orange/10 text-orange",
  neutral: "border-grayWilma-200 bg-grayWilma-100 text-grayWilma-600"
};

export function Badge({ className, tone = "neutral", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", tones[tone], className)}
      {...props}
    />
  );
}

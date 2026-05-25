import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "warning";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-navy text-white hover:bg-wilmaBlue focus-visible:ring-teal",
  secondary: "border border-grayWilma-200 bg-white text-navy hover:bg-grayWilma-100 focus-visible:ring-teal",
  ghost: "text-grayWilma-600 hover:bg-grayWilma-100 focus-visible:ring-teal",
  warning: "bg-orange text-white hover:bg-danger focus-visible:ring-orange"
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

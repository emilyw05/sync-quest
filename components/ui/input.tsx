import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-11 w-full rounded-2xl border-2 border-border bg-card px-4 py-2 text-sm text-foreground",
        "placeholder:text-muted-foreground/70 outline-none transition-colors",
        "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };

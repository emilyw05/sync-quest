"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
 * Buttons in the duck theme are heavily rounded (pill-shaped), warmly shadowed,
 * and grow a tiny "lift" on hover so they feel friendly to tap.
 *
 * The variant key `raid` is kept for backwards compatibility with all the
 * components that already say variant="raid"; it's just our happy primary CTA.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_8px_22px_-6px_hsl(43_96%_56%_/_0.55)] hover:bg-primary/90 hover:-translate-y-[1px] hover:shadow-[0_12px_28px_-8px_hsl(43_96%_56%_/_0.7)]",
        raid:
          "bg-primary text-primary-foreground tracking-tight shadow-[0_10px_28px_-6px_hsl(43_96%_56%_/_0.55)] hover:bg-primary/90 hover:-translate-y-[1px] hover:shadow-[0_16px_36px_-8px_hsl(43_96%_56%_/_0.75)]",
        gold:
          "bg-primary text-primary-foreground shadow-[0_10px_28px_-6px_hsl(43_96%_56%_/_0.65)] hover:brightness-105 hover:-translate-y-[1px]",
        outline:
          "border-2 border-border bg-card/80 text-foreground hover:bg-primary/10 hover:border-primary/60",
        ghost:
          "bg-transparent text-foreground/80 hover:bg-primary/10 hover:text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link:
          "text-secondary-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-full px-4 text-xs",
        lg: "h-12 rounded-full px-7 text-base",
        xl: "h-14 rounded-full px-9 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

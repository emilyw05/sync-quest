"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, LifeBuoy, RotateCcw } from "lucide-react";

import { SyncQuestLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Error boundary for the (root) segment. Receives the thrown error and a
// reset() callback that re-renders the segment fresh. Must be a client
// component per Next 16's app-router contract.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[SyncQuest] segment error boundary:", error);
  }, [error]);

  return (
    <div className="relative flex flex-1 flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-raid-grid opacity-30"
      />

      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-5">
        <Link href="/">
          <SyncQuestLogo size={28} />
        </Link>
        <Button asChild variant="ghost" size="sm">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" /> Back to pond
          </Link>
        </Button>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-6 pb-20 pt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary/15 ring-2 ring-secondary/40">
                <LifeBuoy className="h-5 w-5 text-secondary" />
              </span>
              <div className="min-w-0">
                <CardTitle className="text-xl">
                  The squad hit a <span className="text-primary">snag</span>
                </CardTitle>
                <CardDescription>
                  Something tripped up the expedition. The captain has been
                  notified — try giving it another waddle.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {error.message && (
              <p className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-foreground">
                <span className="font-bold text-destructive">Details: </span>
                {error.message}
              </p>
            )}
            {error.digest && (
              <p className="rounded-2xl border-2 border-border bg-muted/40 px-3 py-2 text-[11px] font-mono text-muted-foreground">
                ref · {error.digest}
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="raid"
                size="lg"
                className="flex-1"
                onClick={reset}
              >
                <RotateCcw className="h-4 w-4" />
                Try again
              </Button>
              <Button asChild variant="outline" size="lg" className="flex-1">
                <Link href="/">
                  <ArrowLeft className="h-4 w-4" />
                  Back to the pond
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

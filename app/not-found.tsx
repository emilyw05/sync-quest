import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Compass, Sparkles } from "lucide-react";

import { SyncQuestLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Lost in the pond — 404",
  description:
    "This page paddled off somewhere. Head back to SyncQuest and round up the squad for a new expedition.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
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
                <Compass className="h-5 w-5 text-secondary" />
              </span>
              <div className="min-w-0">
                <CardTitle className="text-xl">
                  Lost <span className="text-primary">in the pond</span>
                </CardTitle>
                <CardDescription>
                  This page paddled off somewhere we can&apos;t follow. Maybe
                  the link is mistyped, or the expedition wrapped up and waddled
                  home.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Want to round up the squad for a new adventure? Hatch a fresh
              expedition in under thirty seconds — no sign-up needed.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="raid" size="lg" className="flex-1">
                <Link href="/new">
                  <Sparkles className="h-4 w-4" />
                  Start a new expedition
                </Link>
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

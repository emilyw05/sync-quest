import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

import { SyncQuestLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { QuestCreationForm } from "@/components/quest/quest-creation-form";

export const metadata: Metadata = {
  title: "New meetup",
  description: "Pick days and hours. Get a share link.",
};

export default function NewMeetupPage() {
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
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-24">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-primary/40 bg-primary/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            New
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            New <span className="text-primary">meetup</span>
          </h1>
        </div>

        <QuestCreationForm />
      </main>
    </div>
  );
}

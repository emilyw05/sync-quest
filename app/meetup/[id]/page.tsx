import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

import { SyncQuestLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QuestRoom } from "@/components/quest/quest-room";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getQuestBySlug } from "@/lib/quest-fetch";

type PageParams = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { id } = await params;
  const quest = await getQuestBySlug(id);
  if (!quest) {
    return { title: `Expedition ${id} — Not found` };
  }
  return {
    title: `${quest.title} · Expedition`,
    description: `Waddle into "${quest.title}" on SyncQuest — paint your waddle windows and help the squad set sail.`,
  };
}

export default async function QuestPage({ params }: PageParams) {
  const { id } = await params;
  const quest = await getQuestBySlug(id);

  if (!quest) {
    return <QuestNotFound slug={id} />;
  }

  return <QuestRoom quest={quest} />;
}

function QuestNotFound({ slug }: { slug: string }) {
  return (
    <div className="relative flex flex-1 flex-col">
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

      <main className="mx-auto w-full max-w-xl flex-1 px-6 pb-20">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary/15 ring-2 ring-secondary/40">
                <Compass className="h-5 w-5 text-secondary" />
              </span>
              <div>
                <CardTitle className="text-xl">
                  Hmm, no expedition at <span className="text-primary">/{slug}</span>
                </CardTitle>
                <CardDescription>
                  The pond link may be mistyped, or this expedition has paddled
                  on. Want to start a new one?
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {!isSupabaseConfigured() && (
              <p className="rounded-2xl border-2 border-secondary/40 bg-secondary/10 px-3 py-2 text-xs text-secondary-foreground">
                SyncQuest is in pond preview mode. Configure{" "}
                <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
                to unlock realtime quacks.
              </p>
            )}
            <Button asChild variant="raid" size="lg">
              <Link href="/new">Start a new expedition</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

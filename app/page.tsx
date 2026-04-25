import Image from "next/image";
import Link from "next/link";
import {
  Anchor,
  ArrowRight,
  CalendarCheck,
  Compass,
  Footprints,
  Globe2,
  PlayCircle,
  Sparkles,
  Sun,
  Users,
} from "lucide-react";

import { SyncQuestLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { SynergyMeter } from "@/components/quest/synergy-meter";

const FEATURES = [
  {
    icon: Sun,
    title: "Sunny heatmap",
    body: "Pond-blue cells brighten through grass-green and bloom into sunny gold when the whole squad can make it.",
  },
  {
    icon: Globe2,
    title: "Timezone-friendly",
    body: "Slots stored in UTC, painted in your local clock. No off-by-an-hour quacks.",
  },
  {
    icon: Users,
    title: "No sign-up",
    body: "Squadmates just pick a duck name. The captain steers the ship from their device.",
  },
  {
    icon: Footprints,
    title: "Live squad meter",
    body: "Watch baby ducks waddle into formation in realtime as your squadmates RSVP.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Start the expedition",
    body: "Pick your waddle dates and active hours. SyncQuest hatches a shareable pond link.",
    icon: Sparkles,
  },
  {
    step: "02",
    title: "Rally the squad",
    body: "Send the link. Squadmates pick a duck name and paint their waddle windows on the grid.",
    icon: Compass,
  },
  {
    step: "03",
    title: "Set sail together",
    body: "Drop the anchor on the sunniest slot, celebrate with daisy-petal confetti, and ship the event to every calendar.",
    icon: CalendarCheck,
  },
];

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-raid-grid opacity-40"
      />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="group">
          <SyncQuestLogo size={32} className="group-hover:scale-[1.03] transition-transform" />
        </Link>
        <nav className="flex items-center gap-3 text-sm text-muted-foreground">
          <Link
            href="#how"
            className="hidden sm:inline-flex hover:text-foreground transition-colors font-semibold"
          >
            How it works
          </Link>
          <Link
            href="#features"
            className="hidden sm:inline-flex hover:text-foreground transition-colors font-semibold"
          >
            Features
          </Link>
          <Button asChild variant="outline" size="sm" className="ml-1">
            <Link href="/new">
              <Sparkles className="h-3.5 w-3.5" />
              Start expedition
            </Link>
          </Button>
        </nav>
      </header>

      <main className="relative mx-auto w-full max-w-6xl flex-1 px-6 pb-20">
        {/* Hero */}
        <section className="relative flex flex-col items-center gap-7 py-16 text-center md:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-primary/40 bg-primary/15 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            A storybook scheduler
          </span>

          <div className="relative">
            {/* Hero duck floating above the headline */}
            <div className="relative mx-auto mb-4 flex justify-center">
              {/* Soft sun-glow puddle behind the duck */}
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-3 left-1/2 h-6 w-40 -translate-x-1/2 rounded-full bg-primary/40 blur-2xl sm:w-56"
              />
              <Image
                src="/hero-duck.png"
                alt="A cheerful baby duck — your expedition mascot"
                width={983}
                height={1002}
                priority
                className="h-44 w-auto animate-duck-bob drop-shadow-[0_18px_36px_hsl(43_96%_56%_/_0.45)] sm:h-52 md:h-60"
              />
            </div>
            <h1 className="max-w-4xl text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Start a great <span className="text-primary">expedition.</span>
            </h1>
          </div>

          <p className="max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
            There&apos;s a giant, legendary breadcrumb across the pond. We need
            an elite squad of baby ducks. Paint your waddle windows, watch the{" "}
            <span className="text-primary font-bold">Squad Formation Meter</span>{" "}
            line up in realtime, and waddle off together when the{" "}
            <span className="text-primary font-bold">sunny gold glow</span>{" "}
            blooms.
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            <Button asChild variant="raid" size="xl" className="min-w-[240px]">
              <Link href="/new">
                <Sparkles className="h-5 w-5" />
                Rally the squad
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="xl"
              className="text-muted-foreground hover:text-foreground"
            >
              <Link href="#how">
                <PlayCircle className="h-5 w-5" />
                See how it waddles
              </Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            No sign-up · Free during pond season · Built for cross-timezone squads
          </p>

          {/* Live Squad Formation Meter preview */}
          <div className="mt-8 w-full max-w-xl rounded-3xl border-2 border-border bg-card/90 p-5 text-left shadow-[0_30px_70px_-30px_hsl(205_70%_40%_/_0.35)]">
            <SynergyMeter value={0.7} participants={5} />
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground/80">
              Live preview — fills as squadmates waddle in.
            </p>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-12">
          <div className="mb-8 flex flex-col items-center gap-2 text-center">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-secondary">
              What&apos;s in the satchel
            </span>
            <h2 className="text-2xl font-extrabold sm:text-3xl">
              Tools for a happy <span className="text-primary">squad expedition.</span>
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="flex flex-col gap-3 rounded-3xl border-2 border-border bg-card p-5 transition-all hover:-translate-y-[2px] hover:border-primary/60 hover:shadow-[0_18px_36px_-22px_hsl(43_96%_56%_/_0.5)]"
              >
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/20 text-primary-foreground ring-2 ring-primary/40">
                  <Icon className="h-5 w-5 text-primary" />
                </span>
                <div className="space-y-1">
                  <p className="text-base font-extrabold text-foreground">{title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section
          id="how"
          className="mt-6 grid gap-6 rounded-3xl border-2 border-border bg-card p-6 sm:grid-cols-3 sm:p-8"
        >
          {STEPS.map(({ step, title, body, icon: Icon }) => (
            <div key={step} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 ring-2 ring-primary/30 font-extrabold text-xs text-foreground">
                  {step}
                </span>
                <Icon className="h-4 w-4 text-secondary" />
              </div>
              <h3 className="text-base font-extrabold">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </section>

        {/* Closing CTA */}
        <section className="mt-16 flex flex-col items-center gap-5 rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-primary/15 via-card to-accent/10 p-10 text-center">
          <Anchor className="h-7 w-7 text-secondary" />
          <h2 className="max-w-2xl text-2xl font-extrabold sm:text-3xl">
            Ready to <span className="text-primary">waddle off together?</span>
          </h2>
          <p className="max-w-lg text-sm text-muted-foreground">
            Hatch an expedition in under thirty seconds. Your squadmates just
            need the pond link.
          </p>
          <Button asChild variant="raid" size="xl" className="min-w-[240px]">
            <Link href="/new">
              <Sparkles className="h-5 w-5" />
              Start the expedition
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-6 py-6 text-xs text-muted-foreground">
        <div className="flex flex-col items-center justify-between gap-2 border-t-2 border-border/60 pt-6 sm:flex-row">
          <span>© {new Date().getFullYear()} SyncQuest — waddle kindly.</span>
          <span className="flex items-center gap-1.5">
            <Globe2 className="h-3 w-3" />
            Timezone-aware · UTC-backed
          </span>
        </div>
      </footer>
    </div>
  );
}

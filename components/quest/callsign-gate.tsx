"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Compass, Feather, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DuckMark } from "@/components/brand/logo";
import type { Quest } from "@/lib/types";

type Props = {
  quest: Quest;
  defaultCallsign?: string;
  isHost: boolean;
  onJoin: (callsign: string) => Promise<void> | void;
};

export function CallsignGate({ quest, defaultCallsign = "", isHost, onJoin }: Props) {
  const [value, setValue] = React.useState(defaultCallsign);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setError("2+ characters.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onJoin(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mx-auto max-w-md"
    >
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/20 ring-2 ring-primary/40">
              <DuckMark size={28} />
            </span>
            <div className="min-w-0">
              <CardTitle className="truncate text-xl">Join</CardTitle>
              <CardDescription className="truncate">
                <span className="font-bold text-foreground">{quest.host_callsign}</span>
                {" · "}
                {quest.title}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5" />
                Name
              </Label>
              <Input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Your name"
                maxLength={24}
                autoComplete="off"
              />
            </div>
            {error && (
              <p className="rounded-2xl border-2 border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              variant="raid"
              size="lg"
              className="w-full"
              disabled={submitting || value.trim().length < 2}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> …
                </>
              ) : (
                <>
                  <Feather className="h-4 w-4" /> Join
                </>
              )}
            </Button>
            {isHost && (
              <p className="text-center text-xs text-secondary">You&apos;re host — tools unlock after join.</p>
            )}
          </CardContent>
        </form>
      </Card>
    </motion.div>
  );
}

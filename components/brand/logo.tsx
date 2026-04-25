import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * SyncQuest brand mark — a friendly rubber-duck icon.
 *
 * Backed by a small PNG in /public so the same illustrated style is shared
 * everywhere it shows up (logo header, Squad Formation Meter, host/join
 * cards, victory state). All call-sites stay 1:1 source-compatible with the
 * old SVG component — they just pass `size` and an optional `className`.
 */
export function DuckMark({
  size = 32,
  className,
  title,
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <Image
      src="/duck-icon.png"
      alt={title ?? ""}
      width={size}
      height={size}
      className={cn("select-none", className)}
      draggable={false}
      aria-hidden={title ? undefined : true}
    />
  );
}

export function SyncQuestLogo({
  className,
  size = 32,
  showWordmark = true,
}: {
  className?: string;
  size?: number;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <DuckMark size={size} title="SyncQuest" />
      {showWordmark && (
        <span className="font-extrabold text-foreground tracking-tight text-lg">
          Sync<span className="text-primary">Quest</span>
        </span>
      )}
    </span>
  );
}

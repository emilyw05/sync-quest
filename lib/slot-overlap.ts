import type { QuestSnapshot } from "@/lib/quest-store";

/**
 * Head-count per slot ISO for heat / synergy.
 * When the viewer is editing (not read-only grid), their `viewerMine` set
 * replaces server rows for that participant so the UI updates before submit.
 */
export function slotOverlapTotals(
  snapshot: QuestSnapshot,
  viewerParticipantId: string | null,
  viewerMine: Set<string>,
  opts: { useViewerDraft: boolean },
): Map<string, number> {
  const totals = new Map<string, number>();
  if (!opts.useViewerDraft || !viewerParticipantId) {
    for (const [, set] of snapshot.availability) {
      for (const iso of set) {
        totals.set(iso, (totals.get(iso) ?? 0) + 1);
      }
    }
    return totals;
  }

  const seen = new Set<string>();
  for (const p of snapshot.participants) {
    seen.add(p.id);
    const set =
      p.id === viewerParticipantId
        ? viewerMine
        : (snapshot.availability.get(p.id) ?? new Set<string>());
    for (const iso of set) {
      totals.set(iso, (totals.get(iso) ?? 0) + 1);
    }
  }
  if (!seen.has(viewerParticipantId)) {
    for (const iso of viewerMine) {
      totals.set(iso, (totals.get(iso) ?? 0) + 1);
    }
  }
  return totals;
}

export function maxOverlapRatio(
  snapshot: QuestSnapshot,
  viewerParticipantId: string | null,
  viewerMine: Set<string>,
  opts: { useViewerDraft: boolean },
): number {
  const count = snapshot.participants.length;
  if (count === 0) return 0;
  const totals = slotOverlapTotals(snapshot, viewerParticipantId, viewerMine, opts);
  let best = 0;
  for (const n of totals.values()) if (n > best) best = n;
  return best / count;
}

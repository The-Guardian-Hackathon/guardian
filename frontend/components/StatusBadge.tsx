import type { LegStatus } from "@/lib/types";

const STYLES: Record<LegStatus, string> = {
  draft: "bg-zinc-700/60 text-zinc-300 ring-zinc-500/40",
  bidding: "bg-amber-500/15 text-amber-300 ring-amber-400/60 animate-pulse",
  booked: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/50",
  disrupted: "bg-red-500/20 text-red-300 ring-red-400/70 animate-pulse",
};

const LABELS: Record<LegStatus, string> = {
  draft: "Draft",
  bidding: "Bidding…",
  booked: "Booked",
  disrupted: "Disrupted",
};

export function StatusBadge({ status }: { status: LegStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold uppercase tracking-wide ring-1 ${STYLES[status]}`}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {LABELS[status]}
    </span>
  );
}

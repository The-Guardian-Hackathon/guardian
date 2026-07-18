import type { LegStatus } from "@/lib/types";

const STYLES: Record<LegStatus, { fg: string; bg: string; label: string; pulse?: boolean }> = {
  draft: { fg: "var(--neutral)", bg: "var(--neutral-soft)", label: "Draft" },
  bidding: { fg: "var(--warn)", bg: "var(--warn-soft)", label: "Bidding", pulse: true },
  booked: { fg: "var(--ok)", bg: "var(--ok-soft)", label: "Booked" },
  disrupted: { fg: "var(--bad)", bg: "var(--bad-soft)", label: "Disrupted", pulse: true },
};

export function StatusBadge({ status }: { status: LegStatus }) {
  const s = STYLES[status];
  return (
    <span className="chip" style={{ color: s.fg, background: s.bg }}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${s.pulse ? "pulse-dot" : ""}`}
        style={{ background: "currentColor" }}
      />
      {s.label}
    </span>
  );
}

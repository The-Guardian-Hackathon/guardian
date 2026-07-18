"use client";

import { useEffect, useRef } from "react";
import { fmtClock } from "@/lib/format";
import type { Phase, TripEvent } from "@/lib/types";

const PHASE: Record<Phase, { color: string; label: string }> = {
  listen: { color: "var(--accent)", label: "Listen" },
  win: { color: "var(--warn)", label: "Win" },
  guard: { color: "var(--neutral)", label: "Guard" },
  recover: { color: "var(--bad)", label: "Recover" },
};

export function EventFeed({ events }: { events: TripEvent[] }) {
  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [events.length]);

  const newestFirst = [...events].reverse();

  return (
    <div className="card flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <h2 className="text-sm font-semibold text-ink">Activity</h2>
        <span className="microlabel">{events.length} events</span>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div ref={topRef} />
        {newestFirst.length === 0 && (
          <p className="py-10 text-center text-sm text-ink-3">
            Quiet for now — Guardian is listening.
          </p>
        )}
        <ol className="relative space-y-0">
          {newestFirst.map((e, i) => {
            const p = PHASE[e.phase];
            return (
              <li
                key={events.length - i}
                className="relative grid grid-cols-[14px_1fr] gap-x-3 pb-5 last:pb-1"
              >
                {/* rail */}
                {i < newestFirst.length - 1 && (
                  <span className="absolute top-[14px] left-[6px] h-full w-px bg-line" />
                )}
                <span
                  className="relative top-[5px] h-[9px] w-[9px] justify-self-center rounded-full ring-4"
                  style={{ background: p.color, ["--tw-ring-color" as string]: "var(--surface)" }}
                />
                <div className={i === 0 ? "" : "opacity-80"}>
                  <div className="mb-0.5 flex items-baseline gap-2">
                    <span className="text-[11px] font-semibold tracking-wide" style={{ color: p.color }}>
                      {p.label}
                    </span>
                    <span className="font-mono text-[11px] text-ink-3">{fmtClock(e.timestamp)}</span>
                  </div>
                  <p className="text-[13.5px] leading-snug text-ink-2">{e.message}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

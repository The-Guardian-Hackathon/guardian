"use client";

import { useEffect, useRef } from "react";
import { fmtClock } from "@/lib/format";
import type { Phase, TripEvent } from "@/lib/types";

const PHASE_STYLE: Record<Phase, string> = {
  listen: "bg-sky-500/15 text-sky-300",
  win: "bg-amber-500/15 text-amber-300",
  guard: "bg-violet-500/15 text-violet-300",
  recover: "bg-red-500/15 text-red-300",
};

export function EventFeed({ events }: { events: TripEvent[] }) {
  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [events.length]);

  const newestFirst = [...events].reverse();

  return (
    <div className="flex h-full flex-col rounded-2xl border-2 border-zinc-800 bg-zinc-900/80">
      <div className="border-b border-zinc-800 px-5 py-3">
        <h2 className="text-lg font-bold text-zinc-100">Guardian activity</h2>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <div ref={topRef} />
        {newestFirst.length === 0 && (
          <p className="py-8 text-center text-zinc-500">Quiet for now — Guardian is listening.</p>
        )}
        {newestFirst.map((e, i) => (
          <div
            key={events.length - i}
            className={`rounded-xl bg-zinc-800/60 p-3 ${i === 0 ? "ring-1 ring-zinc-600" : ""}`}
          >
            <div className="mb-1 flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${PHASE_STYLE[e.phase]}`}
              >
                {e.phase}
              </span>
              <span className="text-xs text-zinc-500">{fmtClock(e.timestamp)}</span>
            </div>
            <p className="text-[15px] leading-snug text-zinc-200">{e.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

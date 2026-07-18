"use client";

import { useState } from "react";

export function ControlStrip({
  onBid,
  onDisrupt,
  usingFixtures,
}: {
  onBid: () => void;
  onDisrupt: () => void;
  usingFixtures: boolean;
}) {
  const [bidFired, setBidFired] = useState(false);
  const [disruptFired, setDisruptFired] = useState(false);

  return (
    <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
      <div className="flex gap-3">
        <button
          onClick={() => {
            setBidFired(true);
            onBid();
          }}
          disabled={bidFired}
          className="rounded-xl bg-amber-500/90 px-4 py-2 text-sm font-bold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-40"
        >
          ⚔️ Start bidding war (hotel)
        </button>
        <button
          onClick={() => {
            setDisruptFired(true);
            onDisrupt();
          }}
          disabled={disruptFired}
          className="rounded-xl bg-red-500/90 px-4 py-2 text-sm font-bold text-zinc-50 transition hover:bg-red-400 disabled:opacity-40"
        >
          ⚡ Simulate flight delay
        </button>
      </div>
      <span className="text-xs font-medium uppercase tracking-wider text-zinc-600">
        {usingFixtures ? "fixture mode" : "live backend"}
      </span>
    </div>
  );
}

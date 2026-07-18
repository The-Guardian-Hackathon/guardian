"use client";

import { useState } from "react";
import { GavelIcon, ZapIcon } from "./Icons";

export function ControlStrip({
  onBid,
  onDisrupt,
  usingFixtures,
  bidDisabled = false,
}: {
  onBid: () => void;
  onDisrupt: () => void;
  usingFixtures: boolean;
  bidDisabled?: boolean;
}) {
  const [bidFired, setBidFired] = useState(false);
  const [disruptFired, setDisruptFired] = useState(false);

  return (
    <div className="card flex items-center justify-between px-4 py-3">
      <div className="flex gap-2.5">
        <button
          onClick={() => {
            setBidFired(true);
            onBid();
          }}
          disabled={bidFired || bidDisabled}
          className="flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-35 dark:text-[#101013]"
          style={{ color: "var(--surface)" }}
        >
          <GavelIcon className="text-[14px]" />
          Start bidding war
        </button>
        <button
          onClick={() => {
            setDisruptFired(true);
            onDisrupt();
          }}
          disabled={disruptFired}
          className="flex items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-[13px] font-semibold text-ink transition-colors hover:bg-surface-2 disabled:opacity-35"
        >
          <ZapIcon className="text-[14px]" style={{ color: "var(--bad)" }} />
          Simulate flight delay
        </button>
      </div>
      <span className="microlabel">{usingFixtures ? "Fixture mode" : "Live"}</span>
    </div>
  );
}

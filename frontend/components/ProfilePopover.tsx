"use client";

// Where saved/learned preferences live. Fixture data for the demo; in live
// mode this would be fed by the backend's Listen phase.

import { useEffect, useRef, useState } from "react";
import { FIXTURE_PROFILE } from "@/lib/fixtures";
import { UserIcon } from "./Icons";

export function ProfilePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const p = FIXTURE_PROFILE;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Traveler profile"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <UserIcon className="text-[15px]" />
      </button>

      {open && (
        <div className="card absolute right-0 z-20 mt-2 w-72 p-4">
          <p className="text-sm font-semibold text-ink">{p.name}</p>
          <p className="mt-0.5 text-[12.5px] text-ink-3">
            {p.home} · {p.phone}
          </p>
          <p className="text-[12.5px] text-ink-3">{p.payment}</p>

          <p className="microlabel mt-4 mb-2">What Guardian knows</p>
          <ul className="space-y-1.5">
            {p.preferences.map((pref) => (
              <li key={pref.label} className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-medium text-ink">{pref.label}</span>
                <span className="shrink-0 text-[11px] text-ink-3">{pref.source}</span>
              </li>
            ))}
          </ul>

          <p className="mt-4 border-t border-line pt-3 text-[11.5px] leading-snug text-ink-3">
            Guardian prepares everything and books nothing without a spoken yes.
          </p>
        </div>
      )}
    </div>
  );
}

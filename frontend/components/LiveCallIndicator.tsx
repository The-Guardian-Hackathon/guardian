"use client";

// Lights up when a recent event mentions a phone call, so the audience connects
// the phone audio in the room to what's happening on screen.

import { useEffect, useState } from "react";
import type { TripEvent } from "@/lib/types";

const CALL_WINDOW_MS = 6000;

export function LiveCallIndicator({ events }: { events: TripEvent[] }) {
  const [, force] = useState(0);
  const last = events[events.length - 1];
  const isCall =
    !!last &&
    /📞|call|calling|called/i.test(last.message) &&
    Date.now() - new Date(last.timestamp).getTime() < CALL_WINDOW_MS;

  // Re-check as the window expires so the light turns itself off.
  useEffect(() => {
    if (!isCall) return;
    const id = setTimeout(() => force((n) => n + 1), CALL_WINDOW_MS);
    return () => clearTimeout(id);
  }, [isCall, last?.timestamp]);

  if (!isCall) return null;
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-green-500/15 px-4 py-1.5 text-sm font-bold text-green-300 ring-1 ring-green-400/60">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400" />
      </span>
      ON A LIVE CALL
    </span>
  );
}

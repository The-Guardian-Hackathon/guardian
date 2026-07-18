"use client";

// Lights up when a recent event mentions a phone call, so the audience connects
// the phone audio in the room to what's happening on screen.

import { useEffect, useState } from "react";
import { PhoneIcon } from "./Icons";
import type { TripEvent } from "@/lib/types";

const CALL_WINDOW_MS = 6000;

export function LiveCallIndicator({ events }: { events: TripEvent[] }) {
  const [, force] = useState(0);
  const last = events[events.length - 1];
  const isCall =
    !!last &&
    /call|calling|called|dialing/i.test(last.message) &&
    Date.now() - new Date(last.timestamp).getTime() < CALL_WINDOW_MS;

  // Re-check as the window expires so the light turns itself off.
  useEffect(() => {
    if (!isCall) return;
    const id = setTimeout(() => force((n) => n + 1), CALL_WINDOW_MS);
    return () => clearTimeout(id);
  }, [isCall, last?.timestamp]);

  if (!isCall) return null;
  return (
    <span
      className="chip"
      style={{ color: "var(--ok)", background: "var(--ok-soft)" }}
    >
      <span className="pulse-dot flex h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} />
      <PhoneIcon className="text-[12px]" />
      Live call
    </span>
  );
}

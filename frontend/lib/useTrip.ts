"use client";

// One hook drives the whole dashboard.
// Real mode: polls GET /trip/:id every 1.5s; actions are fire-and-forget POSTs (drama arrives via polling).
// Fixture mode (NEXT_PUBLIC_USE_FIXTURES != "0"): a scripted local engine plays out the same
// state transitions on timers, so the full demo arc works before the backend exists.

import { useCallback, useEffect, useRef, useState } from "react";
import { FIXTURE_TRIP, USE_FIXTURES } from "./fixtures";
import type { LegName, Phase, Trip } from "./types";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";
const POLL_MS = 1500;

type Step = {
  after: number; // ms since script start
  apply: (t: Trip) => Trip;
};

function ev(t: Trip, phase: Phase, message: string): Trip {
  return {
    ...t,
    events: [...t.events, { timestamp: new Date().toISOString(), phase, message }],
  };
}

function patchLeg(t: Trip, leg: LegName, patch: Partial<Trip["legs"][LegName]>): Trip {
  const prev = t.legs[leg];
  return {
    ...t,
    legs: {
      ...t.legs,
      [leg]: {
        ...prev,
        ...patch,
        details: { ...prev.details, ...(patch.details ?? {}) },
      },
    },
  };
}

// ---- Fixture scripts: mirror what the real backend will do, on the same routes ----

const BID_SCRIPT: Step[] = [
  { after: 0, apply: (t) => ev(patchLeg(t, "hotel", { status: "bidding" }), "win", "📞 Calling Hotel Vitale — asking their best rate for 2 nights…") },
  { after: 2500, apply: (t) => ev(t, "win", "Hotel Vitale opens at $240/night.") },
  { after: 5000, apply: (t) => ev(t, "win", "📞 Calling Harbor Court — \"another property offered $240, can you beat it?\"") },
  { after: 8000, apply: (t) => ev(t, "win", "Harbor Court counters: $205/night with breakfast included.") },
  { after: 10500, apply: (t) => ev(t, "win", "📞 Back to Hotel Vitale with the counter — final round.") },
  { after: 13500, apply: (t) => ev(t, "win", "Hotel Vitale's final: $198/night, no breakfast. Comparing value…") },
  {
    after: 16000,
    apply: (t) =>
      ev(
        patchLeg(t, "hotel", {
          status: "booked",
          price: 410,
          details: { name: "Harbor Court Hotel", perks: "Breakfast included", confirmation_id: "SAB-90227" },
        }),
        "win",
        "🏆 Harbor Court wins — $205/night with breakfast. Booked via Sabre.",
      ),
  },
  { after: 18000, apply: (t) => ev(t, "win", "💳 payment_success — $410.00 charged via PayPal sandbox (2 nights).") },
];

const DISRUPT_SCRIPT: Step[] = [
  {
    after: 0,
    apply: (t) =>
      ev(
        patchLeg(t, "flight", { status: "disrupted", details: { delay: "+2h 00m" } }),
        "recover",
        "⚠️ AA 178 delayed 120 minutes. Re-deriving the rest of your day…",
      ),
  },
  { after: 2500, apply: (t) => ev(t, "recover", "Checking downstream impact: car pickup, hotel check-in window, 8 PM dinner.") },
  {
    after: 5000,
    apply: (t) =>
      ev(
        patchLeg(t, "transport", { details: { pickup_iso: "2026-07-24T14:05:00-07:00" } }),
        "recover",
        "🚗 Car pickup moved to 2:05 PM to meet the new arrival.",
      ),
  },
  {
    after: 7500,
    apply: (t) => ev(t, "recover", "Hotel check-in window still clears (3:00 PM) — no change needed."),
  },
  {
    after: 10000,
    apply: (t) =>
      ev(
        patchLeg(t, "dinner", { details: { time_iso: "2026-07-24T22:00:00-07:00" } }),
        "recover",
        "📞 Called Kokkari — reservation moved from 8:00 PM to 10:00 PM, confirmed by the host.",
      ),
  },
  {
    after: 12500,
    apply: (t) =>
      ev(t, "guard", "🛡️ Guardrail: arrival before check-in ✓ · no overlaps ✓ · rebook Δ $0 within cap ✓ — committing plan."),
  },
  {
    after: 14500,
    apply: (t) =>
      ev(
        patchLeg(t, "flight", { status: "booked", details: { arrive_iso: "2026-07-24T13:32:00-07:00", delay: undefined } }),
        "recover",
        "✅ Recovery complete. Here's your new day: land 1:32 PM, car 2:05 PM, check-in 3 PM, dinner 10 PM.",
      ),
  },
];

// ---- The hook ----

export function useTrip(tripId: string) {
  const [trip, setTrip] = useState<Trip | null>(USE_FIXTURES ? FIXTURE_TRIP : null);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Real mode: poll.
  useEffect(() => {
    if (USE_FIXTURES) return;
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch(`${BACKEND}/trip/${tripId}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`GET /trip/${tripId} → ${res.status}`);
        const data: Trip = await res.json();
        if (alive) {
          setTrip(data);
          setError(null);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "backend unreachable");
      }
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [tripId]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const runScript = useCallback((script: Step[]) => {
    script.forEach((step) => {
      timers.current.push(setTimeout(() => setTrip((t) => (t ? step.apply(t) : t)), step.after));
    });
  }, []);

  const startBid = useCallback(
    async (leg: LegName) => {
      if (USE_FIXTURES) return runScript(BID_SCRIPT);
      await fetch(`${BACKEND}/trip/${tripId}/bid/${leg}`, { method: "POST" });
    },
    [tripId, runScript],
  );

  const disrupt = useCallback(
    async (leg: LegName, reason: string, delay_minutes: number) => {
      if (USE_FIXTURES) return runScript(DISRUPT_SCRIPT);
      await fetch(`${BACKEND}/trip/${tripId}/disrupt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leg, reason, delay_minutes }),
      });
    },
    [tripId, runScript],
  );

  return { trip, error, startBid, disrupt, usingFixtures: USE_FIXTURES };
}

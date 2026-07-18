"use client";

import { use } from "react";
import { ControlStrip } from "@/components/ControlStrip";
import { EventFeed } from "@/components/EventFeed";
import { LegCard } from "@/components/LegCard";
import { LiveCallIndicator } from "@/components/LiveCallIndicator";
import { useTrip } from "@/lib/useTrip";
import { LEG_ORDER } from "@/lib/types";

export default function TripDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { trip, error, startBid, disrupt, usingFixtures } = useTrip(id);

  const recovered = trip?.events.some(
    (e) => e.phase === "recover" && /recovery complete|new day/i.test(e.message),
  );

  if (!trip) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        <div className="text-center">
          <div className="mb-3 text-4xl">🛡️</div>
          <p className="text-lg">Connecting to Guardian…</p>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-50">
              🛡️ The Guardian
            </h1>
            <p className="mt-0.5 text-zinc-500">
              Watching over <span className="font-semibold text-zinc-300">{trip.traveler.name}</span>
              &apos;s trip · {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LiveCallIndicator events={trip.events} />
            {error && (
              <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-300">
                backend unreachable — showing last known state
              </span>
            )}
          </div>
        </header>

        {recovered && (
          <div className="mb-5 rounded-2xl border-2 border-emerald-500/60 bg-emerald-500/10 px-5 py-4 text-lg font-bold text-emerald-200">
            ✅ Here&apos;s your new day — Guardian rebuilt your itinerary around the disruption.
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="grid grid-cols-1 content-start gap-4 sm:grid-cols-2 lg:col-span-2">
            {LEG_ORDER.map((name) => (
              <LegCard key={name} name={name} leg={trip.legs[name]} />
            ))}
            <div className="sm:col-span-2">
              <ControlStrip
                onBid={() => startBid("hotel")}
                onDisrupt={() => disrupt("flight", "delayed", 120)}
                usingFixtures={usingFixtures}
              />
            </div>
          </div>
          <div className="min-h-[420px] lg:h-[calc(100vh-140px)]">
            <EventFeed events={trip.events} />
          </div>
        </div>
      </div>
    </main>
  );
}

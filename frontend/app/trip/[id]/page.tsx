"use client";

import { use, useState } from "react";
import { AskGuardian } from "@/components/AskGuardian";
import { ControlStrip } from "@/components/ControlStrip";
import { EventFeed } from "@/components/EventFeed";
import { LegCard } from "@/components/LegCard";
import { LiveCallIndicator } from "@/components/LiveCallIndicator";
import { ProfilePopover } from "@/components/ProfilePopover";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CheckIcon, ShieldIcon } from "@/components/Icons";
import { useTrip } from "@/lib/useTrip";
import { sortLegs } from "@/lib/types";

export default function TripDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { trip, error, startBid, disrupt, appendEvent, usingFixtures } = useTrip(id);
  const [bidStarted, setBidStarted] = useState(false);

  const recovered = trip?.events.some(
    (e) => e.phase === "recover" && /recovery complete|new day/i.test(e.message),
  );

  if (!trip) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg text-ink-2">
        <div className="text-center">
          <ShieldIcon className="mx-auto mb-3 text-3xl text-ink-3" />
          <p className="text-sm">Connecting to Guardian…</p>
          {error && <p className="mt-2 text-xs" style={{ color: "var(--bad)" }}>{error}</p>}
        </div>
      </main>
    );
  }

  const legs = sortLegs(trip.legs);
  const hotelIsDraft = trip.legs.hotel?.status === "draft";

  const beginBid = () => {
    setBidStarted(true);
    startBid("hotel");
  };

  return (
    <main className="min-h-screen bg-bg px-6 py-5">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-accent">
              <ShieldIcon className="text-[18px]" />
            </span>
            <div>
              <h1 className="text-[17px] font-semibold tracking-tight text-ink">The Guardian</h1>
              <p className="text-[13px] text-ink-3">
                {trip.traveler.name} · {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <LiveCallIndicator events={trip.events} />
            {error && (
              <span className="chip" style={{ color: "var(--bad)", background: "var(--bad-soft)" }}>
                Backend unreachable
              </span>
            )}
            <ProfilePopover />
            <ThemeToggle />
          </div>
        </header>

        {recovered && (
          <div
            className="mb-5 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium"
            style={{ borderColor: "var(--ok)", background: "var(--ok-soft)", color: "var(--ok)" }}
          >
            <CheckIcon className="text-[16px]" />
            Recovery complete — Guardian rebuilt your day around the disruption.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <AskGuardian
              active={hotelIsDraft && !bidStarted}
              onConfirmed={beginBid}
              log={(m) => appendEvent("listen", m)}
            />
            <div className="grid grid-cols-1 content-start gap-4 sm:grid-cols-2">
              {legs.map(([name, leg]) => (
                <LegCard key={name} name={name} leg={leg} />
              ))}
            </div>
            <ControlStrip
              onBid={beginBid}
              onDisrupt={() => disrupt("flight", "delayed", 120)}
              usingFixtures={usingFixtures}
              bidDisabled={bidStarted}
            />
          </div>
          <div className="min-h-[420px] lg:h-[calc(100vh-120px)]">
            <EventFeed events={trip.events} />
          </div>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { StatusBadge } from "./StatusBadge";
import { fmtPrice, fmtTime } from "@/lib/format";
import type { Leg, LegName } from "@/lib/types";

const META: Record<LegName, { icon: string; title: string }> = {
  flight: { icon: "✈️", title: "Flight" },
  hotel: { icon: "🏨", title: "Hotel" },
  dinner: { icon: "🍽️", title: "Dinner" },
  transport: { icon: "🚗", title: "Transport" },
};

const BORDER: Record<Leg["status"], string> = {
  draft: "border-zinc-700",
  bidding: "border-amber-400/70 shadow-[0_0_28px_-4px] shadow-amber-500/30",
  booked: "border-emerald-500/50",
  disrupted: "border-red-500/80 shadow-[0_0_32px_-4px] shadow-red-500/40",
};

function rows(name: LegName, d: Record<string, unknown>): [string, string][] {
  switch (name) {
    case "flight":
      return [
        ["Route", d.origin && d.dest ? `${d.origin} → ${d.dest}` : "—"],
        ["Flight", [d.carrier, d.flight_no].filter(Boolean).join(" ") || "—"],
        ["Departs", fmtTime(d.depart_iso)],
        ["Arrives", fmtTime(d.arrive_iso) + (d.delay ? `  (${d.delay})` : "")],
      ];
    case "hotel":
      return [
        ["Property", String(d.name ?? "—")],
        ["Check-in", fmtTime(d.checkin_iso)],
        ["Nights", String(d.nights ?? "—")],
        ["Perks", String(d.perks ?? "—")],
      ];
    case "dinner":
      return [
        ["Restaurant", String(d.restaurant ?? "—")],
        ["Time", fmtTime(d.time_iso)],
        ["Party", d.party_size ? `${d.party_size} people` : "—"],
      ];
    case "transport":
      return [
        ["Type", String(d.type ?? "—")],
        ["Pickup", fmtTime(d.pickup_iso)],
        ["Location", String(d.pickup_location ?? "—")],
      ];
  }
}

export function LegCard({ name, leg }: { name: LegName; leg: Leg }) {
  // Flash the card when its content changes so state flips read from across a room.
  const [flash, setFlash] = useState(false);
  const snapshot = JSON.stringify(leg);
  const prev = useRef(snapshot);
  useEffect(() => {
    if (prev.current !== snapshot) {
      prev.current = snapshot;
      setFlash(true);
      const id = setTimeout(() => setFlash(false), 900);
      return () => clearTimeout(id);
    }
  }, [snapshot]);

  const { icon, title } = META[name];
  const conf = leg.details.confirmation_id;

  return (
    <div
      className={`rounded-2xl border-2 bg-zinc-900/80 p-5 transition-all duration-500 ${BORDER[leg.status]} ${
        flash ? "scale-[1.02] bg-zinc-800" : ""
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold text-zinc-100">
          <span className="text-2xl">{icon}</span> {title}
        </h2>
        <StatusBadge status={leg.status} />
      </div>
      <dl className="space-y-1.5">
        {rows(name, leg.details).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 text-[15px]">
            <dt className="text-zinc-500">{k}</dt>
            <dd className="text-right font-medium text-zinc-200">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-3">
        <span className="text-xs text-zinc-500">{conf ? `Conf. ${conf}` : " "}</span>
        <span className="text-lg font-bold text-zinc-100">{fmtPrice(leg.price)}</span>
      </div>
    </div>
  );
}

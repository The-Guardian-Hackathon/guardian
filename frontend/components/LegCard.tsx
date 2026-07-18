"use client";

import { useEffect, useRef, useState, type ComponentType, type SVGProps } from "react";
import { StatusBadge } from "./StatusBadge";
import { CarIcon, DinnerIcon, HotelIcon, PlaneIcon } from "./Icons";
import { fmtPrice, fmtTime } from "@/lib/format";
import type { Leg, LegName } from "@/lib/types";

const META: Record<LegName, { Icon: ComponentType<SVGProps<SVGSVGElement>>; title: string }> = {
  flight: { Icon: PlaneIcon, title: "Flight" },
  hotel: { Icon: HotelIcon, title: "Hotel" },
  dinner: { Icon: DinnerIcon, title: "Dinner" },
  transport: { Icon: CarIcon, title: "Transport" },
};

const EDGE: Record<Leg["status"], string> = {
  draft: "var(--border-strong)",
  bidding: "var(--warn)",
  booked: "var(--ok)",
  disrupted: "var(--bad)",
};

function rows(name: LegName, d: Record<string, unknown>): [string, string][] {
  switch (name) {
    case "flight":
      return [
        ["Route", d.origin && d.dest ? `${d.origin} → ${d.dest}` : "—"],
        ["Flight", [d.carrier, d.flight_no].filter(Boolean).join(" ") || "—"],
        ["Departs", fmtTime(d.depart_iso)],
        ["Arrives", fmtTime(d.arrive_iso) + (d.delay ? ` (${d.delay})` : "")],
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
      const id = setTimeout(() => setFlash(false), 1100);
      return () => clearTimeout(id);
    }
  }, [snapshot]);

  const { Icon, title } = META[name];
  const conf = leg.details.confirmation_id;

  return (
    <div
      className={`card relative overflow-hidden p-5 transition-shadow ${flash ? "flash" : ""}`}
    >
      <span
        className="absolute inset-y-0 left-0 w-[3px] transition-colors duration-500"
        style={{ background: EDGE[leg.status] }}
      />
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2.5 text-[15px] font-semibold text-ink">
          <Icon className="text-[17px] text-ink-3" />
          {title}
        </h2>
        <StatusBadge status={leg.status} />
      </div>
      <dl className="space-y-2">
        {rows(name, leg.details).map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 text-sm">
            <dt className="shrink-0 text-ink-3">{k}</dt>
            <dd className="text-right font-medium text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex items-baseline justify-between border-t border-line pt-3">
        <span className="font-mono text-xs text-ink-3">{conf ? String(conf) : " "}</span>
        <span className="text-base font-semibold tracking-tight text-ink">
          {fmtPrice(leg.price)}
        </span>
      </div>
    </div>
  );
}

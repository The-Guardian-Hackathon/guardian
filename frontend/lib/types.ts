// Mirrors docs/CONTRACT.md exactly. Do not change shapes here without changing the contract.

// Legs are dynamic: core keys are flight/hotel/dinner/transport, but the backend may
// send any keys (flight_return, food, activity, ...). We render whatever exists.
export type LegName = string;
export type LegStatus = "draft" | "bidding" | "booked" | "disrupted";
export type Phase = "listen" | "win" | "guard" | "recover";

export interface Leg {
  status: LegStatus;
  details: Record<string, unknown>;
  price: number | null;
}

export interface TripEvent {
  timestamp: string; // ISO-8601
  phase: Phase;
  message: string;
}

export interface Trip {
  trip_id: string;
  traveler: { name: string; phone: string };
  legs: Record<LegName, Leg>;
  events: TripEvent[];
}

// What kind of thing a leg is, inferred from its key.
export type LegKind = "flight" | "hotel" | "food" | "transport" | "activity" | "other";

export function legKind(name: LegName): LegKind {
  const n = name.toLowerCase();
  if (n.includes("flight") || n.includes("air")) return "flight";
  if (n.includes("hotel") || n.includes("stay")) return "hotel";
  if (n.includes("dinner") || n.includes("food") || n.includes("lunch") || n.includes("breakfast")) return "food";
  if (n.includes("transport") || n.includes("car") || n.includes("pickup")) return "transport";
  if (n.includes("activity") || n.includes("explore") || n.includes("tour")) return "activity";
  return "other";
}

const KIND_ORDER: LegKind[] = ["flight", "transport", "hotel", "food", "activity", "other"];

export function sortLegs(legs: Record<LegName, Leg>): [LegName, Leg][] {
  return Object.entries(legs).sort(
    (a, b) => KIND_ORDER.indexOf(legKind(a[0])) - KIND_ORDER.indexOf(legKind(b[0])),
  );
}

export interface ExtractResult {
  traveler: { name: string; phone: string };
  draft_legs: Record<string, { details: Record<string, unknown>; price?: number | null }>;
}

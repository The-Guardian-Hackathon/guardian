// Mirrors docs/CONTRACT.md exactly. Do not change shapes here without changing the contract.

export type LegName = "flight" | "hotel" | "dinner" | "transport";
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

export const LEG_ORDER: LegName[] = ["flight", "hotel", "dinner", "transport"];

export interface ExtractResult {
  traveler: { name: string; phone: string };
  draft_legs: Partial<Record<LegName, Pick<Leg, "details"> & { price?: number | null }>>;
}

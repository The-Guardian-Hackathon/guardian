// Fixture trip matching docs/CONTRACT.md — lets the whole UI run with zero backend.
// Flip NEXT_PUBLIC_USE_FIXTURES=0 in .env.local once the real backend is up on :4000.

import type { Trip } from "./types";

export const USE_FIXTURES = process.env.NEXT_PUBLIC_USE_FIXTURES !== "0";

// Profile data Guardian has accumulated for this traveler (Phase 1 "Listen"
// keeps feeding this). In live mode this would come from the backend.
export const FIXTURE_PROFILE = {
  name: "Khushi Chandra",
  phone: "+1 555 010 7788",
  home: "New York · JFK",
  payment: "PayPal sandbox ··7788",
  preferences: [
    { label: "Walkable neighborhoods", source: "heard in group chat" },
    { label: "Budget ≤ $250/night", source: "asked, Jul 12" },
    { label: "No seafood", source: "heard in group chat" },
    { label: "Aisle seat", source: "learned from past bookings" },
  ],
};

export const FIXTURE_TRIP: Trip = {
  trip_id: "demo",
  traveler: { name: "Khushi Chandra", phone: "+1 555 010 7788" },
  legs: {
    flight: {
      status: "booked",
      price: 289,
      details: {
        carrier: "American Airlines",
        flight_no: "AA 178",
        origin: "JFK",
        dest: "SFO",
        depart_iso: "2026-07-24T08:05:00-04:00",
        arrive_iso: "2026-07-24T11:32:00-07:00",
        confirmation_id: "AA-XK4P2M",
      },
    },
    hotel: {
      status: "draft",
      price: null,
      details: {
        name: "2 nights near the Embarcadero",
        checkin_iso: "2026-07-24T15:00:00-07:00",
        nights: 2,
        reason: "You're in SF Jul 24–26 with no place to stay. Heard \"walkable near the Embarcadero\" in the group chat.",
      },
    },
    dinner: {
      status: "booked",
      price: null,
      details: {
        restaurant: "Kokkari Estiatorio",
        time_iso: "2026-07-24T20:00:00-07:00",
        party_size: 2,
        confirmation_id: "RESY-88412",
      },
    },
    transport: {
      status: "booked",
      price: 64,
      details: {
        type: "Car pickup",
        pickup_location: "SFO Terminal 1",
        pickup_iso: "2026-07-24T12:05:00-07:00",
        confirmation_id: "CAR-55219",
      },
    },
    explore: {
      status: "draft",
      price: null,
      details: {
        name: "Ferry Building food hall + waterfront walk",
        when_iso: "2026-07-24T15:30:00-07:00",
        reason: "Your afternoon is free between check-in and dinner. Skips seafood spots per your preferences.",
      },
    },
  },
  events: [
    {
      timestamp: "2026-07-24T07:02:00-04:00",
      phase: "listen",
      message: "Parsed forwarded confirmation email — found AA 178 JFK→SFO on Jul 24.",
    },
    {
      timestamp: "2026-07-24T07:02:30-04:00",
      phase: "listen",
      message: "Heard \"somewhere walkable near the Embarcadero\" in the group chat — drafted a stay.",
    },
    {
      timestamp: "2026-07-24T07:03:10-04:00",
      phase: "listen",
      message: "You land 11:32 AM with a free afternoon — drafted something to explore before dinner.",
    },
    {
      timestamp: "2026-07-24T07:04:00-04:00",
      phase: "win",
      message: "Dinner locked: Kokkari at 8:00 PM for 2.",
    },
  ],
};

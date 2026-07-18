// Fixture trip matching docs/CONTRACT.md — lets the whole UI run with zero backend.
// Flip NEXT_PUBLIC_USE_FIXTURES=0 in .env.local once the real backend is up on :4000.

import type { Trip } from "./types";

export const USE_FIXTURES = process.env.NEXT_PUBLIC_USE_FIXTURES !== "0";

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
        name: "Hotel Vitale (draft)",
        checkin_iso: "2026-07-24T15:00:00-07:00",
        nights: 2,
        perks: "—",
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
      message: "Heard \"somewhere walkable near the Embarcadero\" in the group chat — shortlisting hotels.",
    },
    {
      timestamp: "2026-07-24T07:04:00-04:00",
      phase: "win",
      message: "Dinner locked: Kokkari at 8:00 PM for 2.",
    },
  ],
};

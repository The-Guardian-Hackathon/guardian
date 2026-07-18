import { NextRequest, NextResponse } from "next/server";
import type { ExtractResult } from "@/lib/types";

// POST /api/extract  { image_base64?: string, mime?: string, text?: string }
// Real path: LandingAI ADE Parse (image -> markdown) then ADE Extract (markdown +
// schema -> fields). Runs server-side so LANDINGAI_API_KEY never reaches the browser.
// Any failure falls back to MOCK_EXTRACT so the demo can't die on stage.

const ADE_BASE = "https://api.va.landing.ai/v1/ade";

// Flat schema — ADE extracts flat key-value pairs more reliably than nested objects.
const TRIP_SCHEMA = {
  type: "object",
  properties: {
    traveler_name: { type: "string", description: "Full name of the traveler or passenger" },
    traveler_phone: { type: "string", description: "Traveler's phone number" },
    flight_carrier: { type: "string", description: "Airline name, e.g. American Airlines" },
    flight_number: { type: "string", description: "Flight number, e.g. AA 178" },
    flight_origin: { type: "string", description: "Origin airport IATA code, e.g. JFK" },
    flight_dest: { type: "string", description: "Destination airport IATA code, e.g. SFO" },
    flight_depart_iso: { type: "string", description: "Departure date and time in ISO 8601 format with timezone offset if known" },
    flight_arrive_iso: { type: "string", description: "Arrival date and time in ISO 8601 format with timezone offset if known" },
    flight_price: { type: "number", description: "Flight price in USD, number only" },
    flight_confirmation: { type: "string", description: "Flight booking confirmation or record locator code" },
    hotel_name: { type: "string", description: "Hotel or property name" },
    hotel_checkin_iso: { type: "string", description: "Hotel check-in date and time in ISO 8601 format" },
    hotel_nights: { type: "number", description: "Number of nights at the hotel" },
    dinner_restaurant: { type: "string", description: "Restaurant name for any dinner reservation" },
    dinner_time_iso: { type: "string", description: "Dinner reservation date and time in ISO 8601 format" },
    dinner_party_size: { type: "number", description: "Number of people in the dinner reservation" },
    transport_type: { type: "string", description: "Ground transport type, e.g. Car pickup, taxi, shuttle" },
    transport_pickup_iso: { type: "string", description: "Ground transport pickup date and time in ISO 8601 format" },
    transport_location: { type: "string", description: "Ground transport pickup location" },
  },
};

// For free-text intent ("visiting family in Kansas over Thanksgiving") — nothing
// is booked yet, so we extract the plan, not confirmations.
const INTENT_SCHEMA = {
  type: "object",
  properties: {
    traveler_name: { type: "string", description: "Traveler's name if mentioned" },
    origin: { type: "string", description: "Origin city or airport if mentioned" },
    destination: { type: "string", description: "Destination city, region, or airport" },
    start_iso: { type: "string", description: "Trip start date in ISO 8601. Resolve relative references (e.g. 'Thanksgiving break' is late November of the current or upcoming year 2026)" },
    end_iso: { type: "string", description: "Trip end date in ISO 8601 if inferable" },
    party_size: { type: "number", description: "Number of travelers, default 1" },
    occasion: { type: "string", description: "Why they are traveling, e.g. visiting family, wedding, conference" },
    budget_note: { type: "string", description: "Any price sensitivity mentioned, e.g. cheapest flights" },
    lodging_needed: { type: "string", description: "'no' if they will stay with family/friends or lodging is clearly covered, 'yes' if they will need a hotel, 'unknown' otherwise" },
  },
};

const MOCK_EXTRACT: ExtractResult = {
  traveler: { name: "Khushi Chandra", phone: "+1 555 010 7788" },
  draft_legs: {
    flight: {
      details: {
        carrier: "American Airlines",
        flight_no: "AA 178",
        origin: "JFK",
        dest: "SFO",
        depart_iso: "2026-07-24T08:05:00-04:00",
        arrive_iso: "2026-07-24T11:32:00-07:00",
      },
      price: 289,
    },
    dinner: {
      details: {
        restaurant: "Kokkari Estiatorio",
        time_iso: "2026-07-24T20:00:00-07:00",
        party_size: 2,
      },
    },
  },
};

async function adeParse(imageBase64: string, mime: string, apiKey: string): Promise<string> {
  const bytes = Buffer.from(imageBase64, "base64");
  const form = new FormData();
  const ext = (mime.split("/")[1] ?? "png").split("+")[0];
  form.append("document", new Blob([new Uint8Array(bytes)], { type: mime }), `upload.${ext}`);
  form.append("model", "dpt-2-latest");

  const res = await fetch(`${ADE_BASE}/parse`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok && res.status !== 206) {
    throw new Error(`ADE parse → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  if (!data.markdown) throw new Error("ADE parse returned no markdown");
  return data.markdown as string;
}

async function adeExtract(
  markdown: string,
  apiKey: string,
  schema: object = TRIP_SCHEMA,
): Promise<Record<string, unknown>> {
  const form = new FormData();
  form.append("markdown", markdown);
  form.append("schema", JSON.stringify(schema));
  form.append("model", "extract-latest");

  const res = await fetch(`${ADE_BASE}/extract`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  // 206 = extraction succeeded but didn't fully conform to schema; still usable.
  if (!res.ok && res.status !== 206) {
    throw new Error(`ADE extract → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  return (data.extraction ?? {}) as Record<string, unknown>;
}

function toResult(x: Record<string, unknown>): ExtractResult {
  const s = (k: string) => (typeof x[k] === "string" && (x[k] as string).trim() ? (x[k] as string).trim() : undefined);
  const n = (k: string) => (typeof x[k] === "number" ? (x[k] as number) : undefined);

  const result: ExtractResult = {
    traveler: {
      name: s("traveler_name") ?? "Traveler",
      phone: s("traveler_phone") ?? "",
    },
    draft_legs: {},
  };

  if (s("flight_number") || s("flight_origin") || s("flight_carrier")) {
    result.draft_legs.flight = {
      details: {
        carrier: s("flight_carrier"),
        flight_no: s("flight_number"),
        origin: s("flight_origin"),
        dest: s("flight_dest"),
        depart_iso: s("flight_depart_iso"),
        arrive_iso: s("flight_arrive_iso"),
        confirmation_id: s("flight_confirmation"),
      },
      price: n("flight_price") ?? null,
    };
  }
  if (s("hotel_name")) {
    result.draft_legs.hotel = {
      details: { name: s("hotel_name"), checkin_iso: s("hotel_checkin_iso"), nights: n("hotel_nights") },
    };
  }
  if (s("dinner_restaurant")) {
    result.draft_legs.dinner = {
      details: {
        restaurant: s("dinner_restaurant"),
        time_iso: s("dinner_time_iso"),
        party_size: n("dinner_party_size"),
      },
    };
  }
  if (s("transport_type")) {
    result.draft_legs.transport = {
      details: {
        type: s("transport_type"),
        pickup_iso: s("transport_pickup_iso"),
        pickup_location: s("transport_location"),
      },
    };
  }
  return result;
}

// Free-text intent -> draft legs with reasons. Nothing here is booked.
function intentToResult(x: Record<string, unknown>, rawText: string): ExtractResult {
  const s = (k: string) => (typeof x[k] === "string" && (x[k] as string).trim() ? (x[k] as string).trim() : undefined);
  const n = (k: string) => (typeof x[k] === "number" ? (x[k] as number) : undefined);

  const result: ExtractResult = {
    traveler: { name: s("traveler_name") ?? "Traveler", phone: "" },
    draft_legs: {},
  };
  const dest = s("destination");
  if (!dest) return result;

  const occasion = s("occasion");
  const budget = s("budget_note");
  const why = [
    `You said: "${rawText.length > 110 ? rawText.slice(0, 110) + "…" : rawText}"`,
    budget ? `Optimizing for ${budget.toLowerCase()}.` : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  result.draft_legs.flight = {
    details: {
      origin: s("origin") ?? "JFK (home)",
      dest,
      depart_iso: s("start_iso"),
      arrive_iso: undefined,
      reason: why,
    },
    price: null,
  };
  if (s("lodging_needed") === "yes") {
    result.draft_legs.hotel = {
      details: {
        name: `Stay in ${dest}`,
        checkin_iso: s("start_iso"),
        reason: "You'll need a place to stay — no lodging mentioned.",
      },
    };
  } else if (occasion) {
    result.draft_legs.flight.details.note = `No stay drafted — ${occasion.toLowerCase()}.`;
  }
  const party = n("party_size");
  if (party && party > 1) result.draft_legs.flight.details.party_size = party;
  return result;
}

const MOCK_INTENT: ExtractResult = {
  traveler: { name: "Khushi Chandra", phone: "" },
  draft_legs: {
    flight: {
      details: {
        origin: "JFK (home)",
        dest: "Kansas City (MCI)",
        depart_iso: "2026-11-25T09:00:00-05:00",
        reason: "You said you're visiting family in Kansas over Thanksgiving. Optimizing for cheapest flights.",
        note: "No stay drafted — visiting family.",
      },
      price: null,
    },
  },
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const image: string | undefined = body.image_base64;
  const text: string | undefined = typeof body.text === "string" ? body.text.trim() : undefined;
  const mime: string = body.mime ?? "image/png";
  const apiKey = process.env.LANDINGAI_API_KEY;

  // Path 1: typed intent — extract the plan straight from the text.
  if (text && !image) {
    if (apiKey) {
      try {
        const extraction = await adeExtract(`Traveler note (today is 2026-07-18): ${text}`, apiKey, INTENT_SCHEMA);
        const result = intentToResult(extraction, text);
        if (Object.keys(result.draft_legs).length > 0) {
          return NextResponse.json({ mocked: false, intent: true, ...result });
        }
        console.error("Intent extraction found no destination:", extraction);
      } catch (e) {
        console.error("LandingAI intent extract failed, falling back to mock:", e);
      }
    }
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ mocked: true, intent: true, ...MOCK_INTENT });
  }

  // Path 2: uploaded document — parse to markdown, then extract confirmations.
  if (image && apiKey) {
    try {
      const markdown = await adeParse(image, mime, apiKey);
      const extraction = await adeExtract(markdown, apiKey);
      const result = toResult(extraction);
      if (Object.keys(result.draft_legs).length > 0) {
        return NextResponse.json({ mocked: false, ...result });
      }
      console.error("ADE returned no usable legs, falling back to mock. Extraction:", extraction);
    } catch (e) {
      console.error("LandingAI failed, falling back to mock:", e);
    }
  }

  await new Promise((r) => setTimeout(r, 800));
  return NextResponse.json({ mocked: true, ...MOCK_EXTRACT });
}

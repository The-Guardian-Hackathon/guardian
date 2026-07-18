import { NextRequest, NextResponse } from "next/server";
import type { ExtractResult } from "@/lib/types";

// POST /api/extract  { image_base64?: string, text?: string }
// LandingAI ADE runs server-side so LANDINGAI_API_KEY never reaches the browser.
// TODO(SWAP-IN): real LandingAI call goes in extractWithLandingAI once we have the
// key + docs from the hackathon Discord. Until then MOCK_EXTRACT keeps the flow alive.

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

async function extractWithLandingAI(imageBase64: string): Promise<ExtractResult> {
  // TODO(SWAP-IN): call LandingAI ADE with process.env.LANDINGAI_API_KEY and map the
  // returned fields onto ExtractResult. Keep the return shape identical to MOCK_EXTRACT.
  void imageBase64;
  throw new Error("LandingAI not wired yet");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const image: string | undefined = body.image_base64;

  if (image && process.env.LANDINGAI_API_KEY) {
    try {
      return NextResponse.json({ mocked: false, ...(await extractWithLandingAI(image)) });
    } catch (e) {
      console.error("LandingAI failed, falling back to mock:", e);
    }
  }

  // Simulate a beat of processing so the demo reads as "it's thinking".
  await new Promise((r) => setTimeout(r, 1200));
  return NextResponse.json({ mocked: true, ...MOCK_EXTRACT });
}

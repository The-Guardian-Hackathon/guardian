"use client";

// Phase 1 "Listen" intake: drop a screenshot/poster/confirmation email,
// Guardian extracts a draft trip and opens the dashboard.

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { USE_FIXTURES } from "@/lib/fixtures";
import { fmtTime } from "@/lib/format";
import type { ExtractResult } from "@/lib/types";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

type Stage = "idle" | "reading" | "extracted" | "creating";

export default function Intake() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setStage("reading");
    setError(null);
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    setPreview(dataUrl);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: dataUrl.split(",")[1] }),
      });
      if (!res.ok) throw new Error(`extract → ${res.status}`);
      setResult(await res.json());
      setStage("extracted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "extraction failed");
      setStage("idle");
    }
  }, []);

  const buildTrip = useCallback(async () => {
    if (!result) return;
    setStage("creating");
    if (USE_FIXTURES) {
      router.push("/trip/demo");
      return;
    }
    try {
      const res = await fetch(`${BACKEND}/trip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft_legs: result.draft_legs, traveler: result.traveler }),
      });
      if (!res.ok) throw new Error(`POST /trip → ${res.status}`);
      const trip = await res.json();
      router.push(`/trip/${trip.trip_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "backend unreachable");
      setStage("extracted");
    }
  }, [result, router]);

  const legs = result ? Object.entries(result.draft_legs) : [];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 py-10">
      <div className="w-full max-w-2xl text-center">
        <div className="mb-2 text-6xl">🛡️</div>
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-50">The Guardian</h1>
        <p className="mt-2 mb-8 text-lg text-zinc-400">
          Drop anything about your trip — a confirmation email, a poster, a screenshot.
          <br />
          Guardian listens and builds the itinerary.
        </p>

        {stage !== "extracted" && stage !== "creating" && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className={`rounded-3xl border-2 border-dashed p-12 transition ${
              dragging ? "border-sky-400 bg-sky-500/10" : "border-zinc-700 bg-zinc-900/60"
            }`}
          >
            {stage === "reading" ? (
              <div className="animate-pulse text-lg text-zinc-300">
                👂 Guardian is reading your document…
              </div>
            ) : (
              <>
                <p className="mb-4 text-zinc-300">Drag an image here, or</p>
                <label className="inline-block cursor-pointer rounded-xl bg-sky-500 px-5 py-2.5 font-bold text-zinc-950 transition hover:bg-sky-400">
                  Choose a file
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                </label>
              </>
            )}
          </div>
        )}

        {(stage === "extracted" || stage === "creating") && result && (
          <div className="rounded-3xl border-2 border-zinc-800 bg-zinc-900/70 p-6 text-left">
            <div className="mb-4 flex items-center gap-4">
              {preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="uploaded document" className="h-16 w-16 rounded-lg object-cover" />
              )}
              <div>
                <h2 className="text-xl font-bold text-zinc-100">Here&apos;s what Guardian heard</h2>
                <p className="text-sm text-zinc-500">
                  Traveler: {result.traveler.name} · {result.traveler.phone}
                </p>
              </div>
            </div>
            <ul className="mb-5 space-y-2">
              {legs.map(([name, leg]) => (
                <li key={name} className="rounded-xl bg-zinc-800/60 px-4 py-2.5 text-[15px] text-zinc-200">
                  <span className="mr-2 font-bold uppercase tracking-wide text-zinc-400">{name}</span>
                  {name === "flight" &&
                    `${leg.details.carrier ?? ""} ${leg.details.flight_no ?? ""} · ${leg.details.origin} → ${leg.details.dest} · departs ${fmtTime(leg.details.depart_iso)}`}
                  {name === "dinner" &&
                    `${leg.details.restaurant} · ${fmtTime(leg.details.time_iso)} · party of ${leg.details.party_size}`}
                  {name === "hotel" && `${leg.details.name ?? "TBD"} · check-in ${fmtTime(leg.details.checkin_iso)}`}
                  {name === "transport" && `${leg.details.type ?? "TBD"} · ${fmtTime(leg.details.pickup_iso)}`}
                </li>
              ))}
            </ul>
            <button
              onClick={buildTrip}
              disabled={stage === "creating"}
              className="w-full rounded-xl bg-emerald-500 py-3 text-lg font-bold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {stage === "creating" ? "Building your trip…" : "Build my trip →"}
            </button>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <button
          onClick={() => router.push("/trip/demo")}
          className="mt-8 text-sm text-zinc-600 underline-offset-4 transition hover:text-zinc-400 hover:underline"
        >
          skip to demo trip →
        </button>
      </div>
    </main>
  );
}

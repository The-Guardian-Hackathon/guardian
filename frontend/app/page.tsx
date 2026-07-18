"use client";

// Phase 1 "Listen" intake: drop a screenshot/poster/confirmation email,
// Guardian extracts a draft trip and opens the dashboard.

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldIcon, UploadIcon } from "@/components/Icons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { USE_FIXTURES } from "@/lib/fixtures";
import { fmtTime } from "@/lib/format";
import type { ExtractResult } from "@/lib/types";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

type Stage = "idle" | "reading" | "extracted" | "creating";

function legSummary(name: string, leg: { details: Record<string, unknown> }): string {
  const d = leg.details;
  switch (name) {
    case "flight":
      return [
        [d.carrier, d.flight_no].filter(Boolean).join(" "),
        `${d.origin} → ${d.dest}`,
        d.depart_iso ? `departs ${fmtTime(d.depart_iso)}` : "",
      ]
        .filter(Boolean)
        .join(" · ");
    case "dinner":
      return `${d.restaurant} · ${fmtTime(d.time_iso)} · party of ${d.party_size}`;
    case "hotel":
      return `${d.name ?? "TBD"} · check-in ${fmtTime(d.checkin_iso)}`;
    default:
      return `${d.type ?? "TBD"} · ${fmtTime(d.pickup_iso)}`;
  }
}

export default function Intake() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [sourceNote, setSourceNote] = useState<string | null>(null);

  const handleText = useCallback(async (text: string) => {
    setStage("reading");
    setError(null);
    setPreview(null);
    setSourceNote(text);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`extract → ${res.status}`);
      setResult(await res.json());
      setStage("extracted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "extraction failed");
      setStage("idle");
    }
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setStage("reading");
    setError(null);
    setSourceNote(null);
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
        body: JSON.stringify({ image_base64: dataUrl.split(",")[1], mime: file.type || "image/png" }),
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
      // Typed intent gets its own drafted trip so the dashboard matches what
      // the user actually said, instead of the canned SF demo.
      if (sourceNote) {
        const trip = {
          trip_id: "intent",
          traveler: result.traveler,
          legs: Object.fromEntries(
            Object.entries(result.draft_legs).map(([k, v]) => [
              k,
              { status: "draft", price: v.price ?? null, details: v.details },
            ]),
          ),
          events: [
            {
              timestamp: new Date().toISOString(),
              phase: "listen",
              message: `Heard: "${sourceNote.length > 90 ? sourceNote.slice(0, 90) + "…" : sourceNote}" — drafted the trip.`,
            },
          ],
        };
        sessionStorage.setItem("guardian-intent-trip", JSON.stringify(trip));
        router.push("/trip/intent");
        return;
      }
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
  }, [result, router, sourceNote]);

  const legs = result ? Object.entries(result.draft_legs) : [];

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-bg px-6 py-10">
      <div className="absolute top-5 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg">
        <div className="mb-10 text-center">
          <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-surface text-accent">
            <ShieldIcon className="text-2xl" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">The Guardian</h1>
          <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-ink-2">
            Drop anything about your trip — a confirmation email, a poster, a screenshot.
            Guardian listens and builds the itinerary.
          </p>
        </div>

        {stage !== "extracted" && stage !== "creating" && (
          <>
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
            className="card p-10 text-center transition-colors"
            style={dragging ? { borderColor: "var(--accent)", background: "var(--accent-soft)" } : undefined}
          >
            {stage === "reading" ? (
              <div className="py-2">
                <div className="pulse-dot mx-auto mb-3 h-2 w-2 rounded-full bg-accent" />
                <p className="text-sm text-ink-2">Guardian is reading your document…</p>
              </div>
            ) : (
              <>
                <UploadIcon className="mx-auto mb-4 text-2xl text-ink-3" />
                <p className="mb-4 text-sm text-ink-2">Drag an image here, or</p>
                <label
                  className="inline-block cursor-pointer rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold transition-opacity hover:opacity-90"
                  style={{ color: "var(--surface)" }}
                >
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

          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="microlabel">or</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="card p-4">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && note.trim() && stage !== "reading") {
                  e.preventDefault();
                  handleText(note.trim());
                }
              }}
              rows={2}
              disabled={stage === "reading"}
              placeholder='Nothing booked yet? Just tell Guardian — "visiting family in Kansas over Thanksgiving, find me the cheapest flights"'
              className="w-full resize-none bg-transparent text-sm leading-relaxed text-ink outline-none placeholder:text-ink-3"
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={() => note.trim() && handleText(note.trim())}
                disabled={!note.trim() || stage === "reading"}
                className="rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-35"
                style={{ color: "var(--surface)" }}
              >
                Plan it
              </button>
            </div>
          </div>
          </>
        )}

        {(stage === "extracted" || stage === "creating") && result && (
          <div className="card p-6">
            <div className="mb-5 flex items-center gap-4">
              {preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="uploaded document"
                  className="h-14 w-14 rounded-lg border border-line object-cover"
                />
              )}
              <div>
                <h2 className="text-[15px] font-semibold text-ink">Here&apos;s what Guardian heard</h2>
                <p className="mt-0.5 text-[13px] text-ink-3">
                  {result.traveler.name}
                  {result.traveler.phone ? ` · ${result.traveler.phone}` : ""}
                </p>
              </div>
            </div>
            <ul className="mb-5 divide-y divide-line overflow-hidden rounded-lg border border-line">
              {legs.map(([name, leg]) => (
                <li key={name} className="flex items-baseline gap-3 bg-surface-2 px-4 py-2.5">
                  <span className="microlabel w-16 shrink-0">{name}</span>
                  <span className="text-[13.5px] text-ink-2">{legSummary(name, leg)}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={buildTrip}
              disabled={stage === "creating"}
              className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ color: "var(--surface)" }}
            >
              {stage === "creating" ? "Building your trip…" : "Build my trip"}
            </button>
          </div>
        )}

        {error && (
          <p className="mt-4 text-center text-xs" style={{ color: "var(--bad)" }}>
            {error}
          </p>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push("/trip/demo")}
            className="text-[13px] text-ink-3 underline-offset-4 transition-colors hover:text-ink-2 hover:underline"
          >
            Skip to demo trip
          </button>
        </div>
      </div>
    </main>
  );
}

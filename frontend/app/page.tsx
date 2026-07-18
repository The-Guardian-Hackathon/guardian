"use client";

// HoldBot intake: upload the cancelled-flight itinerary (PDF or screenshot).
// LandingAI parses it -> confirm what we found -> PATCH the session -> the
// backend takes over and calls the airline.

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneIcon, UploadIcon } from "@/components/Icons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { patchSession, type OriginalFlight } from "@/lib/session";

const SESSION_ID = "demo";

type Stage = "idle" | "reading" | "extracted" | "starting";

const ROWS: [keyof OriginalFlight, string][] = [
  ["passenger_name", "Passenger"],
  ["flight_number", "Flight"],
  ["route", "Route"],
  ["date", "Date"],
  ["time", "Departure"],
  ["booking_ref", "Booking ref"],
];

export default function Intake() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [dragging, setDragging] = useState(false);
  const [flight, setFlight] = useState<OriginalFlight | null>(null);
  const [mandate, setMandate] = useState("");
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
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "flight",
          image_base64: dataUrl.split(",")[1],
          mime: file.type || "application/pdf",
        }),
      });
      if (!res.ok) throw new Error(`extract → ${res.status}`);
      const data = await res.json();
      setFlight(data.original_flight);
      setStage("extracted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "parsing failed");
      setStage("idle");
    }
  }, []);

  const startRecovery = useCallback(async () => {
    if (!flight) return;
    setStage("starting");
    try {
      await patchSession(SESSION_ID, {
        original_flight: flight,
        mandate: mandate.trim() || "Earliest flight out, no red-eyes, keep any fees under $150.",
      });
      router.push(`/session/${SESSION_ID}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "backend unreachable — is the mock server on :4100 running?");
      setStage("extracted");
    }
  }, [flight, mandate, router]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-bg px-6 py-10">
      <div className="absolute top-5 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg">
        <div className="mb-10 text-center">
          <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-surface text-accent">
            <PhoneIcon className="text-2xl" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">HoldBot</h1>
          <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-ink-2">
            Flight cancelled? HoldBot calls the airline, waits on hold, and negotiates your
            rebooking — you only approve the result.
          </p>
        </div>

        {(stage === "idle" || stage === "reading") && (
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
                <p className="text-sm text-ink-2">Reading your itinerary…</p>
              </div>
            ) : (
              <>
                <UploadIcon className="mx-auto mb-4 text-2xl text-ink-3" />
                <p className="mb-4 text-sm text-ink-2">
                  Drop your cancelled itinerary — PDF or screenshot
                </p>
                <label
                  className="inline-block cursor-pointer rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold transition-opacity hover:opacity-90"
                  style={{ color: "var(--surface)" }}
                >
                  Choose a file
                  <input
                    type="file"
                    accept=".pdf,application/pdf,image/*"
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

        {(stage === "extracted" || stage === "starting") && flight && (
          <div className="card p-6">
            <h2 className="text-[15px] font-semibold text-ink">Here&apos;s what we found</h2>
            <p className="mt-0.5 mb-4 text-[13px] text-ink-3">
              Confirm the details before HoldBot gets on the phone.
            </p>
            <dl className="mb-5 divide-y divide-line overflow-hidden rounded-lg border border-line">
              {ROWS.map(([key, label]) => (
                <div key={key} className="flex items-baseline justify-between bg-surface-2 px-4 py-2.5">
                  <dt className="microlabel">{label}</dt>
                  <dd className="text-[13.5px] font-medium text-ink">{flight[key] ?? "—"}</dd>
                </div>
              ))}
            </dl>
            <div className="mb-4">
              <p className="microlabel mb-1.5">Your instructions for the call</p>
              <textarea
                value={mandate}
                onChange={(e) => setMandate(e.target.value)}
                rows={2}
                placeholder='e.g. "Earliest flight out, no red-eyes, aisle seat if possible — and don&apos;t accept more than $150 in fees."'
                className="w-full resize-none rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-3 focus:border-[var(--accent)]"
              />
              <p className="mt-1.5 text-[11.5px] leading-snug text-ink-3">
                This is HoldBot&apos;s mandate: it accepts anything inside it, asks you mid-call on real
                tradeoffs, and never commits beyond it without your yes.
              </p>
            </div>
            <button
              onClick={startRecovery}
              disabled={stage === "starting"}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ color: "var(--surface)" }}
            >
              <PhoneIcon className="text-[15px]" />
              {stage === "starting" ? "Starting…" : "Call the airline for me"}
            </button>
          </div>
        )}

        {error && (
          <p className="mt-4 text-center text-xs" style={{ color: "var(--bad)" }}>
            {error}
          </p>
        )}
      </div>
    </main>
  );
}

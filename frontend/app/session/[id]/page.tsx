"use client";

// HoldBot live session: the screen the audience watches while the real call
// happens on a phone off-screen. Status machine per CONTRACT v2.

import { use, useEffect, useRef, useState } from "react";
import { CheckIcon, PhoneIcon } from "@/components/Icons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSession, type RebookStatus, type Session } from "@/lib/session";

function fmtElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Pulsing phone + timer: the "something live is happening right now" beat.
function CallInProgress({ label }: { label: string }) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSec((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="card flex flex-col items-center gap-3 py-10">
      <span className="relative flex h-16 w-16 items-center justify-center">
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-20"
          style={{ background: "var(--ok)" }}
        />
        <span
          className="relative flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: "var(--ok-soft)", color: "var(--ok)" }}
        >
          <PhoneIcon className="text-2xl" />
        </span>
      </span>
      <p className="text-[15px] font-semibold text-ink">{label}</p>
      <p className="font-mono text-sm text-ink-3">on the line · {fmtElapsed(sec)}</p>
    </div>
  );
}

function Proposal({
  session,
  onApprove,
  onReject,
}: {
  session: Session;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [acted, setActed] = useState(false);
  const d = session.rebooking.new_flight_details;
  return (
    <div className="card overflow-hidden">
      <div className="px-5 pt-5 pb-4">
        <p className="microlabel mb-2">HoldBot negotiated this for you</p>
        <div className="flex items-baseline justify-between">
          <p className="text-xl font-semibold tracking-tight text-ink">
            {d.time ?? "—"} <span className="text-ink-2">· {d.date ?? "—"}</span>
          </p>
          <p className="text-sm font-semibold text-ink">
            {d.fee != null ? `$${d.fee} change fee` : "no fee"}
          </p>
        </div>
        {session.rebooking.transcript_summary && (
          <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2.5 text-[13px] leading-relaxed text-ink-2">
            <span className="microlabel mr-1.5">From the call</span>
            {session.rebooking.transcript_summary}
          </p>
        )}
      </div>
      <div className="flex gap-2.5 border-t border-line bg-surface-2 px-5 py-4">
        <button
          onClick={() => {
            setActed(true);
            onApprove();
          }}
          disabled={acted}
          className="flex-1 rounded-lg py-2.5 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ background: "var(--ok)", color: "var(--surface)" }}
        >
          Approve — book it
        </button>
        <button
          onClick={() => {
            setActed(true);
            onReject();
          }}
          disabled={acted}
          className="flex-1 rounded-lg border border-line py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface disabled:opacity-40"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

function Feed({ events }: { events: Session["events"] }) {
  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [events.length]);
  const newest = [...events].reverse();
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="text-sm font-semibold text-ink">Live call log</h2>
        <span className="microlabel">{events.length} events</span>
      </div>
      <div className="max-h-[40vh] overflow-y-auto px-5 py-4">
        <div ref={topRef} />
        {newest.length === 0 && (
          <p className="py-6 text-center text-sm text-ink-3">Waiting for HoldBot…</p>
        )}
        <ol>
          {newest.map((e, i) => (
            <li
              key={events.length - i}
              className={`relative grid grid-cols-[14px_1fr] gap-x-3 pb-4 last:pb-0 ${i === 0 ? "" : "opacity-75"}`}
            >
              {i < newest.length - 1 && (
                <span className="absolute top-[14px] left-[6px] h-full w-px bg-line" />
              )}
              <span
                className="relative top-[5px] h-[9px] w-[9px] justify-self-center rounded-full"
                style={{ background: i === 0 ? "var(--accent)" : "var(--border-strong)" }}
              />
              <div>
                <p className="font-mono text-[11px] text-ink-3">
                  {new Date(e.timestamp).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </p>
                <p className="text-[13.5px] leading-snug text-ink-2">{e.message}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

const STAGE_LABEL: Record<RebookStatus, string> = {
  idle: "Getting ready…",
  calling_negotiate: "HoldBot is on the phone with the airline",
  awaiting_approval: "Your approval needed",
  approved: "Approved",
  rejected: "Rebooking cancelled",
  calling_confirm: "Calling back to confirm your seat",
  confirmed: "You're rebooked",
};

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { session, error, approve, reject } = useSession(id);

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg text-ink-2">
        <div className="text-center">
          <PhoneIcon className="mx-auto mb-3 text-3xl text-ink-3" />
          <p className="text-sm">Connecting to HoldBot…</p>
          {error && <p className="mt-2 text-xs" style={{ color: "var(--bad)" }}>{error}</p>}
        </div>
      </main>
    );
  }

  const status = session.rebooking.status;
  const of = session.original_flight;
  const nf = session.rebooking.new_flight_details;

  return (
    <main className="min-h-screen bg-bg px-6 py-5">
      <div className="mx-auto max-w-xl">
        <header className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-accent">
              <PhoneIcon className="text-[18px]" />
            </span>
            <div>
              <h1 className="text-[17px] font-semibold tracking-tight text-ink">HoldBot</h1>
              <p className="text-[13px] text-ink-3">{STAGE_LABEL[status]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {error && (
              <span className="chip" style={{ color: "var(--bad)", background: "var(--bad-soft)" }}>
                Backend unreachable
              </span>
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* Cancelled flight strip */}
        <div className="card mb-4 flex items-center justify-between px-4 py-3">
          <div className="text-[13.5px] text-ink-2">
            <span className="font-semibold text-ink">{of.flight_number ?? "—"}</span>
            {" · "}
            {of.route ?? "—"} · {of.date ?? "—"} {of.time ?? ""}
          </div>
          <span className="chip" style={{ color: "var(--bad)", background: "var(--bad-soft)" }}>
            Cancelled
          </span>
        </div>

        {session.mandate && (
          <div className="card mb-4 px-4 py-3">
            <p className="microlabel mb-1">Your mandate — HoldBot won&apos;t go beyond this without asking</p>
            <p className="text-[13.5px] leading-snug text-ink-2">&ldquo;{session.mandate}&rdquo;</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {status === "idle" && (
            <div className="card py-10 text-center text-sm text-ink-2">
              Reviewing your options before dialing…
            </div>
          )}

          {status === "calling_negotiate" && (
            <CallInProgress label="Negotiating your rebooking — you're not on hold, HoldBot is" />
          )}

          {status === "awaiting_approval" && (
            <Proposal session={session} onApprove={approve} onReject={reject} />
          )}

          {(status === "approved" || status === "calling_confirm") && (
            <CallInProgress label="Confirming your held seat with the airline" />
          )}

          {status === "confirmed" && (
            <div className="card overflow-hidden">
              <div
                className="flex items-center gap-3 px-5 py-4 text-sm font-semibold"
                style={{ background: "var(--ok-soft)", color: "var(--ok)" }}
              >
                <CheckIcon className="text-[18px]" />
                You&apos;re rebooked — {nf.time} on {nf.date}
              </div>
              <dl className="divide-y divide-line px-5">
                <div className="flex justify-between py-3 text-sm">
                  <dt className="text-ink-3">New flight</dt>
                  <dd className="font-medium text-ink">{nf.date} · {nf.time}</dd>
                </div>
                <div className="flex justify-between py-3 text-sm">
                  <dt className="text-ink-3">Change fee</dt>
                  <dd className="font-medium text-ink">{nf.fee != null ? `$${nf.fee}` : "—"}</dd>
                </div>
                <div className="flex justify-between py-3 text-sm">
                  <dt className="text-ink-3">Payment</dt>
                  <dd className="font-medium text-ink">
                    {session.payment.status === "paid"
                      ? `Paid · ${session.payment.transaction_id}`
                      : session.payment.status}
                  </dd>
                </div>
                <div className="flex justify-between py-3 text-sm">
                  <dt className="text-ink-3">Passenger</dt>
                  <dd className="font-medium text-ink">{of.passenger_name ?? "—"}</dd>
                </div>
              </dl>
            </div>
          )}

          {status === "rejected" && (
            <div className="card py-10 text-center">
              <p className="text-sm font-semibold text-ink">Rebooking cancelled</p>
              <p className="mt-1 text-[13px] text-ink-3">
                HoldBot released the held seat. Upload another itinerary to start over.
              </p>
            </div>
          )}

          <Feed events={session.events} />
        </div>
      </div>
    </main>
  );
}

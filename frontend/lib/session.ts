"use client";

// HoldBot session layer — mirrors docs/CONTRACT.md v2 exactly.
// Polls GET /session/:id every 1.5s; approve/reject are fire-and-forget,
// all resulting drama arrives through polling.

import { useCallback, useEffect, useState } from "react";

export const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4100";
const POLL_MS = 1500;

export type RebookStatus =
  | "idle"
  | "calling_negotiate"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "calling_confirm"
  | "confirmed";

export interface OriginalFlight {
  flight_number: string | null;
  date: string | null;
  time: string | null;
  passenger_name: string | null;
  booking_ref: string | null;
  route: string | null;
}

export interface Session {
  session_id: string;
  original_flight: OriginalFlight;
  rebooking: {
    status: RebookStatus;
    new_flight_details: { time: string | null; date: string | null; fee: number | null };
    transcript_summary: string | null;
  };
  payment: { status: "pending" | "paid" | "failed"; amount: number | null; transaction_id: string | null };
  events: { timestamp: string; message: string }[];
}

export async function patchSession(id: string, patch: Partial<Session>): Promise<Session> {
  const res = await fetch(`${BACKEND}/session/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`PATCH /session/${id} → ${res.status}`);
  return res.json();
}

export function useSession(id: string) {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch(`${BACKEND}/session/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`GET /session/${id} → ${res.status}`);
        const data: Session = await res.json();
        if (alive) {
          setSession(data);
          setError(null);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "backend unreachable");
      }
    };
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [id]);

  const approve = useCallback(async () => {
    await fetch(`${BACKEND}/session/${id}/approve`, { method: "POST" });
  }, [id]);

  const reject = useCallback(async () => {
    await fetch(`${BACKEND}/session/${id}/reject`, { method: "POST" });
  }, [id]);

  return { session, error, approve, reject };
}

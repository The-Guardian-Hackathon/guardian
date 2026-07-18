"use client";

// The interaction layer: where Guardian asks its ONE question before spending
// money, and where the user talks back (mic or text). In fixture mode the
// exchange is scripted; live, the mic hands off to the Vocal Bridge agent and
// answers land in the event stream.
// TODO(SWAP-IN): replace the fake listening beat with the Vocal Bridge web SDK.

import { useState } from "react";
import { CheckIcon, MicIcon } from "./Icons";

type Stage = "idle" | "listening" | "heard" | "confirming" | "done";

const QUESTION =
  "Before I negotiate your stay — two guests, walkable near the Embarcadero, under $250 a night. Did I get that right?";
const HEARD = "“Yes — two of us, somewhere walkable. Cap it at $250.”";

export function AskGuardian({
  active,
  onConfirmed,
  log,
}: {
  active: boolean; // there's a draft leg worth asking about
  onConfirmed: () => void; // kick off the bidding war
  log: (message: string) => void;
}) {
  const [stage, setStage] = useState<Stage>("idle");
  const [text, setText] = useState("");

  if (!active && stage !== "done") return null;

  const confirm = (answer: string) => {
    setStage("confirming");
    log(`Traveler confirmed by voice: ${answer}`);
    setTimeout(() => {
      log("Preferences locked — party of 2, walkable, ≤ $250/night. Starting the negotiation.");
      setStage("done");
      onConfirmed();
    }, 900);
  };

  const listen = () => {
    setStage("listening");
    // Fake STT beat so the demo reads as a real voice exchange.
    setTimeout(() => setStage("heard"), 1800);
  };

  if (stage === "done") {
    return (
      <div className="card flex items-center gap-2.5 px-4 py-3 text-sm text-ink-2">
        <CheckIcon className="text-[15px]" style={{ color: "var(--ok)" }} />
        Preferences confirmed — Guardian is negotiating. Watch the activity feed.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <span
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px]"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          G
        </span>
        <div>
          <p className="microlabel mb-1">Guardian asks</p>
          <p className="text-sm leading-relaxed text-ink">{QUESTION}</p>
          {stage === "heard" && (
            <p className="mt-2 text-sm italic text-ink-2">{HEARD}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-line bg-surface-2 px-4 py-3">
        <button
          onClick={listen}
          disabled={stage === "listening" || stage === "confirming"}
          aria-label="Answer by voice"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: stage === "listening" ? "var(--bad)" : "var(--accent)", color: "var(--surface)" }}
        >
          <MicIcon className={`text-[15px] ${stage === "listening" ? "pulse-dot" : ""}`} />
        </button>

        {stage === "listening" && <span className="text-sm text-ink-2">Listening…</span>}

        {stage === "heard" ? (
          <div className="flex gap-2">
            <button
              onClick={() => confirm(HEARD)}
              className="rounded-lg bg-accent px-3.5 py-2 text-[13px] font-semibold transition-opacity hover:opacity-90"
              style={{ color: "var(--surface)" }}
            >
              Confirm & negotiate
            </button>
            <button
              onClick={() => setStage("idle")}
              className="rounded-lg border border-line px-3.5 py-2 text-[13px] font-semibold text-ink transition-colors hover:bg-surface"
            >
              Adjust
            </button>
          </div>
        ) : (
          stage !== "listening" && (
            <>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && text.trim()) confirm(`“${text.trim()}”`);
                }}
                placeholder="…or type your answer"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
              />
              {text.trim() && (
                <button
                  onClick={() => confirm(`“${text.trim()}”`)}
                  className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-semibold"
                  style={{ color: "var(--surface)" }}
                >
                  Send
                </button>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}

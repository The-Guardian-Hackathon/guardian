export function fmtTime(iso: unknown): string {
  if (typeof iso !== "string") return "—";
  // Show the time in the timezone baked into the ISO string (trip-local),
  // not the viewer's — a JFK 8:05 AM departure must not render as 5:05 AM
  // on a Pacific-time laptop.
  const m = iso.match(/T(\d{2}):(\d{2})/);
  if (m) {
    const h = parseInt(m[1], 10);
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${ampm}`;
  }
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function fmtClock(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

export function fmtPrice(p: number | null): string {
  return p == null ? "" : `$${p.toLocaleString("en-US")}`;
}

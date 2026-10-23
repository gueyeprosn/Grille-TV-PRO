export function toMinutes(hhmm) {
  if (typeof hhmm !== "string") return 0;
  const [h = "0", m = "0"] = hhmm.split(":");
  const hours = Number.parseInt(h, 10);
  const mins = Number.parseInt(m, 10);
  if (Number.isNaN(hours) || Number.isNaN(mins)) return 0;
  if (hours === 24 && mins === 0) return 24 * 60;
  return (hours % 24) * 60 + Math.max(0, Math.min(59, mins));
}

export function compareTime(a, b) {
  return toMinutes(a) - toMinutes(b);
}

export function formatDuration(totalMinutes) {
  const value = Math.max(0, Math.round(totalMinutes || 0));
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  if (!hours) return `${minutes} min`;
  if (!minutes) return `${hours}h`;
  return `${hours}h${String(minutes).padStart(2, "0")}`;
}

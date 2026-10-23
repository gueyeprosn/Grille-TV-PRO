const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

export function formatDistanceToNow(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (60 * 1000));
  const absMinutes = Math.abs(diffMinutes);

  if (absMinutes < 1) return "à l’instant";
  if (absMinutes < 60) return rtf.format(diffMinutes, "minute");

  const diffHours = Math.round(diffMs / (60 * 60 * 1000));
  const absHours = Math.abs(diffHours);
  if (absHours < 24) return rtf.format(diffHours, "hour");

  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  const absDays = Math.abs(diffDays);
  if (absDays <= 30) return rtf.format(diffDays, "day");

  const diffMonths = Math.round(diffMs / (30 * 24 * 60 * 60 * 1000));
  const absMonths = Math.abs(diffMonths);
  if (absMonths < 12) return rtf.format(diffMonths, "month");

  const diffYears = Math.round(diffMs / (365 * 24 * 60 * 60 * 1000));
  return rtf.format(diffYears, "year");
}

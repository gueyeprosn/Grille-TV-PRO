export const BROADCAST_TIME_ZONE = 'Africa/Dakar'

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
}

export function getBroadcastClock(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BROADCAST_TIME_ZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return {
    dayIndex: WEEKDAY_INDEX[values.weekday] ?? 0,
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  }
}

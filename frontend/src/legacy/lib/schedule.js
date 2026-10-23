import { DAYS, START_HOUR, END_HOUR } from "../config.js";
import { toMinutes } from "./time.js";

function normalizeProgram(program) {
  const start = typeof program.start === "string" ? program.start : "00:00";
  const startMinutes = toMinutes(start);
  const hasEnd = typeof program.end === "string" && program.end.trim() !== "";
  const declaredDuration = Number.isFinite(program.duration)
    ? Math.max(0, program.duration)
    : 0;
  let endMinutes = hasEnd
    ? toMinutes(program.end)
    : startMinutes + declaredDuration;
  if (hasEnd && endMinutes < startMinutes) endMinutes += 24 * 60;
  if (endMinutes === startMinutes && declaredDuration > 0) {
    endMinutes = startMinutes + declaredDuration;
  }
  const duration = Math.max(0, endMinutes - startMinutes);

  const days = Array.isArray(program.days)
    ? program.days
    : typeof program.day === "string"
    ? [program.day]
    : [];

  return {
    id: program.id,
    category: program.category || "Autre",
    type: program.typeDiffusion || program.type || "Autre",
    start,
    end: hasEnd ? program.end : start,
    startMinutes,
    endMinutes: startMinutes + duration,
    duration,
    days,
    raw: program,
  };
}

function minutesToLabel(minutes) {
  if (minutes === 24 * 60) return "00:00";
  const m = minutes % (24 * 60);
  const hours = Math.floor(m / 60)
    .toString()
    .padStart(2, "0");
  const mins = (m % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
}

export function detectConflicts(programs = [], options = {}) {
  const startHour = Number.isFinite(options.startHour) ? options.startHour : START_HOUR;
  const endHour = Number.isFinite(options.endHour) ? options.endHour : END_HOUR;
  const dayStart = startHour * 60;
  const dayEnd = endHour * 60;
  const byDay = {};
  const allConflictIds = new Set();

  for (const day of DAYS) {
    byDay[day] = { ids: new Set(), pairs: [] };
  }

  const normalized = programs
    .map(normalizeProgram)
    .filter((p) => p.id && p.days.length);

  for (const day of Object.keys(byDay)) {
    const entry = byDay[day];
    const dayIndex = DAYS.indexOf(day);
    const previousDay = DAYS[(dayIndex + DAYS.length - 1) % DAYS.length];
    const list = normalized.flatMap((program) => {
      const occurrences = [];
      if (program.days.includes(day)) {
        occurrences.push({ start: program.startMinutes, end: program.endMinutes, id: program.id });
      }
      if (program.endMinutes > 24 * 60 && program.days.includes(previousDay)) {
        occurrences.push({
          start: program.startMinutes - 24 * 60,
          end: program.endMinutes - 24 * 60,
          id: program.id,
        });
      }
      return occurrences
        .map((occurrence) => ({
          ...occurrence,
          startMinutes: Math.max(dayStart, occurrence.start),
          endMinutes: Math.min(dayEnd, occurrence.end),
        }))
        .filter((occurrence) => occurrence.endMinutes > occurrence.startMinutes);
    }).sort((a, b) => a.startMinutes - b.startMinutes);

    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i];
        const b = list[j];
        if (a.id === b.id) continue;
        if (a.endMinutes <= b.startMinutes) break;
        const overlap = Math.max(
          0,
          Math.min(a.endMinutes, b.endMinutes) - Math.max(a.startMinutes, b.startMinutes)
        );
        if (overlap > 0) {
          entry.ids.add(a.id);
          entry.ids.add(b.id);
          allConflictIds.add(a.id);
          allConflictIds.add(b.id);
          entry.pairs.push({
            a: a.id,
            b: b.id,
            overlap,
            day,
            window: `${minutesToLabel(Math.max(a.startMinutes, b.startMinutes))} – ${minutesToLabel(
              Math.min(a.endMinutes, b.endMinutes)
            )}`,
          });
        }
      }
    }
    entry.count = entry.ids.size;
  }

  return {
    total: allConflictIds.size,
    ids: allConflictIds,
    byDay,
  };
}

export function computeFreeTime(programs = [], options = {}) {
  const startHour = Number.isFinite(options.startHour) ? options.startHour : START_HOUR;
  const endHour = Number.isFinite(options.endHour) ? options.endHour : END_HOUR;
  const dayStart = startHour * 60;
  const dayEnd = endHour * 60;

  const normalized = programs
    .map(normalizeProgram)
    .filter((p) => p.days.length && p.duration > 0);

  const result = {
    totalScheduledMinutes: 0,
    totalFreeMinutes: 0,
  };

  for (const day of DAYS) {
    const dayIndex = DAYS.indexOf(day);
    const previousDay = DAYS[(dayIndex + DAYS.length - 1) % DAYS.length];
    const dayPrograms = normalized
      .flatMap((p) => {
        const occurrences = [];
        if (p.days.includes(day)) {
          occurrences.push({ start: p.startMinutes, end: p.endMinutes, id: p.id });
        }
        // Une émission qui déborde après minuit occupe aussi le début du jour suivant.
        if (p.endMinutes > 24 * 60 && p.days.includes(previousDay)) {
          occurrences.push({
            start: p.startMinutes - 24 * 60,
            end: p.endMinutes - 24 * 60,
            id: p.id,
          });
        }
        return occurrences;
      })
      .map((p) => ({
        start: Math.max(dayStart, p.start),
        end: Math.min(dayEnd, p.end),
        id: p.id,
      }))
      .filter((p) => p.end > p.start)
      .sort((a, b) => a.start - b.start);

    let scheduledMinutes = 0;
    const freeSlots = [];
    let cursor = dayStart;

    for (const item of dayPrograms) {
      if (item.start > cursor) {
        freeSlots.push(`${minutesToLabel(cursor)} – ${minutesToLabel(item.start)}`);
      }
      // Ne compter que la partie nouvellement couverte : deux émissions
      // simultanées ne peuvent pas occuper deux fois le même temps d'antenne.
      scheduledMinutes += Math.max(0, item.end - Math.max(item.start, cursor));
      cursor = Math.max(cursor, item.end);
    }

    if (cursor < dayEnd) {
      freeSlots.push(`${minutesToLabel(cursor)} – ${minutesToLabel(dayEnd)}`);
    }

    const freeMinutes = Math.max(0, dayEnd - dayStart - scheduledMinutes);
    result[day] = {
      scheduledMinutes,
      freeMinutes,
      freeSlots,
    };
    result.totalScheduledMinutes += scheduledMinutes;
    result.totalFreeMinutes += freeMinutes;
  }

  return result;
}

export function aggregateWeeklyStats(programs = []) {
  const stats = {
    categoryMinutes: {},
    typeMinutes: {
      Direct: 0,
      PAD: 0,
      Autre: 0,
    },
    programCount: programs.length,
    totalMinutes: 0,
    typePercent: {
      Direct: 0,
      PAD: 0,
      Autre: 0,
    },
  };

  const normalized = programs.map(normalizeProgram);

  for (const program of normalized) {
    const minutes = Math.max(program.duration, 0);
    const copies = program.days.length || 1;
    const total = minutes * copies;
    stats.totalMinutes += total;
    const categoryKey = program.category || "Autre";
    stats.categoryMinutes[categoryKey] =
      (stats.categoryMinutes[categoryKey] || 0) + total;
    const typeKey =
      program.type === "Direct" || program.type === "PAD" ? program.type : "Autre";
    stats.typeMinutes[typeKey] += total;
  }

  if (stats.totalMinutes > 0) {
    for (const key of Object.keys(stats.typeMinutes)) {
      stats.typePercent[key] =
        (stats.typeMinutes[key] / stats.totalMinutes) * 100;
    }
  }

  return stats;
}

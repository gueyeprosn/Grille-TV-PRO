import { describe, expect, it } from 'vitest';
import { aggregateWeeklyStats, computeFreeTime, detectConflicts } from './schedule.js';

describe('calculs de grille pour les émissions après minuit', () => {
  it('attribue la partie après minuit au jour suivant, y compris le passage samedi-dimanche', () => {
    const program = {
      id: 'overnight',
      start: '23:00',
      end: '01:00',
      duration: 120,
      days: ['Samedi'],
    };

    const result = computeFreeTime([program]);

    expect(result.Samedi.scheduledMinutes).toBe(60);
    expect(result.Dimanche.scheduledMinutes).toBe(60);
    expect(result.totalScheduledMinutes).toBe(120);
    expect(aggregateWeeklyStats([program]).totalMinutes).toBe(120);
  });

  it('fusionne la suite après minuit avec les autres programmes sans doubler les minutes', () => {
    const programs = [
      { id: 'overnight', start: '23:00', end: '01:00', duration: 120, days: ['Lundi'] },
      { id: 'early', start: '00:30', end: '02:00', duration: 90, days: ['Mardi'] },
    ];

    const result = computeFreeTime(programs);

    expect(result.Mardi.scheduledMinutes).toBe(120);
    expect(result.Mardi.freeMinutes).toBe(22 * 60);
  });

  it('calcule le résumé 05:00–00:00 sans compter les programmes conservés après minuit', () => {
    const programs = [
      { id: 'hidden-after-midnight', start: '00:30', end: '01:30', duration: 60, days: ['Lundi'] },
      { id: 'visible-start', start: '05:00', end: '06:00', duration: 60, days: ['Lundi'] },
      { id: 'visible-until-midnight', start: '23:45', end: '00:00', duration: 15, days: ['Lundi'] },
    ];

    const result = computeFreeTime(programs, { startHour: 5, endHour: 24 });

    expect(result.Lundi.scheduledMinutes).toBe(75);
    expect(result.Lundi.freeMinutes).toBe(19 * 60 - 75);
    expect(result.Lundi.freeSlots[0]).toBe('06:00 – 23:45');
    expect(result.totalScheduledMinutes).toBe(75);
  });

  it('ignore les conflits masqués après minuit dans le périmètre 05:00–00:00', () => {
    const programs = [
      { id: 'hidden-a', start: '00:30', end: '01:30', duration: 60, days: ['Mardi'] },
      { id: 'hidden-b', start: '01:00', end: '02:00', duration: 60, days: ['Mardi'] },
    ];

    const result = detectConflicts(programs, { startHour: 5, endHour: 24 });

    expect(result.total).toBe(0);
    expect(result.byDay.Mardi.ids.size).toBe(0);
  });

  it('détecte encore le chevauchement visible d’un programme qui traverse minuit', () => {
    const programs = [
      { id: 'overnight-visible', start: '23:00', end: '06:00', duration: 420, days: ['Lundi'] },
      { id: 'morning', start: '05:30', end: '06:30', duration: 60, days: ['Mardi'] },
    ];

    const result = detectConflicts(programs, { startHour: 5, endHour: 24 });

    expect(result.byDay.Mardi.ids).toEqual(new Set(['overnight-visible', 'morning']));
    expect(result.byDay.Mardi.pairs[0].window).toBe('05:30 – 06:00');
  });

  it('utilise la fin horaire affichée comme référence quand la durée déclarée diverge', () => {
    const program = {
      id: 'end-time-authoritative',
      start: '05:00',
      end: '06:00',
      duration: 30,
      days: ['Lundi'],
    };

    const result = computeFreeTime([program], { startHour: 5, endHour: 24 });

    expect(result.Lundi.scheduledMinutes).toBe(60);
    expect(aggregateWeeklyStats([program]).totalMinutes).toBe(60);
  });

  it('présente la borne de fin de grille comme 00:00', () => {
    const result = computeFreeTime([], { startHour: 5, endHour: 24 });
    expect(result.Lundi.freeSlots).toEqual(['05:00 – 00:00']);
  });
});

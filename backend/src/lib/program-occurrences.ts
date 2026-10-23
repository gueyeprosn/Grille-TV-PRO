import { randomUUID } from 'node:crypto'
import { Prisma, ProgramOccurrenceStatus } from '@prisma/client'
import prisma from './prisma.js'

type Database = Prisma.TransactionClient

interface GridSchedule {
  startDate: Date
  endDate: Date
}

interface ProgramSchedule {
  id: string
  title: string
  startTime: string
  endTime: string
  durationMin: number
  days: number[]
  archivedAt: Date | null
}

interface OccurrenceSnapshot {
  programId: string
  serviceDate: Date
  titleSnapshot: string
  startTimeSnapshot: string
  endTimeSnapshot: string
  durationMinSnapshot: number
  status: ProgramOccurrenceStatus | null
}

const DAY_MS = 24 * 60 * 60 * 1000
const DAY_ANCHOR_MINUTES = 5 * 60

function dateOnlyUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function timeToMinutes(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) throw new Error(`Heure de programme invalide : ${value}`)
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) throw new Error(`Heure de programme invalide : ${value}`)
  return hours * 60 + minutes
}

function computedDuration(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime)
  let end = timeToMinutes(endTime)
  if (end <= start) end += 24 * 60
  return end - start
}

export function expandProgramSchedule(
  program: ProgramSchedule,
  grid: GridSchedule,
  today = new Date()
): OccurrenceSnapshot[] {
  if (program.archivedAt) return []
  const days = new Set(program.days)
  if ([...days].some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
    throw new Error(`Jours de diffusion invalides pour le programme ${program.id}`)
  }

  const startDate = dateOnlyUtc(grid.startDate)
  const endDate = dateOnlyUtc(grid.endDate)
  if (startDate > endDate) throw new Error('La période de la grille est invalide')

  const startTime = program.startTime === '24:00' ? '00:00' : program.startTime
  const endTime = program.endTime === '24:00' ? '00:00' : program.endTime
  const duration = computedDuration(startTime, endTime)
  if (duration < 1 || duration > 1440) {
    throw new Error(`Durée calculée invalide pour le programme ${program.id}`)
  }

  const todayDate = dateOnlyUtc(today)
  const occurrences: OccurrenceSnapshot[] = []
  for (let timestamp = startDate.getTime(); timestamp <= endDate.getTime(); timestamp += DAY_MS) {
    const serviceDate = new Date(timestamp)
    if (!days.has(serviceDate.getUTCDay())) continue
    occurrences.push({
      programId: program.id,
      serviceDate,
      titleSnapshot: program.title,
      startTimeSnapshot: startTime,
      endTimeSnapshot: endTime,
      durationMinSnapshot: duration,
      // Les anciens jours de grille n'ont pas de statut par diffusion fiable.
      status: serviceDate < todayDate ? null : ProgramOccurrenceStatus.PLANNED,
    })
  }
  return occurrences
}

export async function synchronizeProgramOccurrences(
  database: Database,
  programId: string,
  today = new Date()
): Promise<void> {
  const program = await database.program.findUnique({
    where: { id: programId },
    include: { grid: { select: { startDate: true, endDate: true } } },
  })
  if (!program) throw new Error('Programme introuvable pendant la synchronisation des diffusions')

  const desired = expandProgramSchedule(program, program.grid, today)
  const todayDate = dateOnlyUtc(today)
  const desiredDates = desired.map((occurrence) => occurrence.serviceDate)
  const existing = await database.programOccurrence.findMany({ where: { programId } })
  const existingByDate = new Map(existing.map((occurrence) => [occurrence.serviceDate.toISOString().slice(0, 10), occurrence]))

  if (desired.length > 0) {
    await database.programOccurrence.createMany({
      data: desired.map((occurrence) => ({ id: randomUUID(), ...occurrence })),
      skipDuplicates: true,
    })
  }

  for (const occurrence of desired) {
    const serviceDateKey = occurrence.serviceDate.toISOString().slice(0, 10)
    const previous = existingByDate.get(serviceDateKey)
    if (!previous || previous.status !== ProgramOccurrenceStatus.PLANNED) continue
    if (occurrence.serviceDate < todayDate) continue
    await database.programOccurrence.updateMany({
      where: { programId, serviceDate: occurrence.serviceDate, status: ProgramOccurrenceStatus.PLANNED },
      data: {
        titleSnapshot: occurrence.titleSnapshot,
        startTimeSnapshot: occurrence.startTimeSnapshot,
        endTimeSnapshot: occurrence.endTimeSnapshot,
        durationMinSnapshot: occurrence.durationMinSnapshot,
      },
    })
  }

  const desiredDateSet = new Set(desiredDates.map((date) => date.toISOString().slice(0, 10)))
  const obsoletePlanned = existing.filter((occurrence) =>
    occurrence.status === ProgramOccurrenceStatus.PLANNED &&
    occurrence.serviceDate >= todayDate &&
    !desiredDateSet.has(occurrence.serviceDate.toISOString().slice(0, 10))
  )
  if (obsoletePlanned.length > 0) {
    await database.programOccurrence.updateMany({
      where: { id: { in: obsoletePlanned.map((occurrence) => occurrence.id) } },
      data: { status: ProgramOccurrenceStatus.CANCELLED },
    })
  }
}

export async function synchronizeAllProgramOccurrences(): Promise<void> {
  const programs = await prisma.program.findMany({ select: { id: true } })
  for (const program of programs) {
    try {
      await prisma.$transaction((transaction) => synchronizeProgramOccurrences(transaction, program.id))
    } catch (error) {
      console.error('Erreur de synchronisation des diffusions du programme', program.id, error)
    }
  }
}

export async function synchronizeGridOccurrences(
  database: Database,
  gridId: string
): Promise<void> {
  const programs = await database.program.findMany({ where: { gridId }, select: { id: true } })
  for (const program of programs) {
    await synchronizeProgramOccurrences(database, program.id)
  }
}

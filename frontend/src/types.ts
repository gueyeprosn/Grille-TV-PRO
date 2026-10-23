export interface LegacyProgram {
  id: string
  title: string
  start: string
  end?: string
  duration?: number
  type?: string
  producer?: string
  day?: string
  categoryId?: string
}

export interface Category {
  id: string
  name: string
  color?: string
}

export interface Filters {
  search?: string
  type?: string
  category?: string
  q?: string
}

export type FreeInfo = Record<string, any>

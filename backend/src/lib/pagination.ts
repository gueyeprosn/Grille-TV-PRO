/**
 * Utilitaires de pagination pour les routes API
 */

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

/**
 * Parse les paramètres de pagination depuis la query string
 */
export function parsePagination(query: any): PaginationParams {
  const page = Math.max(1, parseInt(query.page || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)))
  const sortBy = query.sortBy || 'createdAt'
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc'
  
  return { page, limit, sortBy, sortOrder }
}

/**
 * Crée un résultat paginé
 */
export function createPaginatedResult<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / params.limit!)
  
  return {
    data,
    pagination: {
      page: params.page!,
      limit: params.limit!,
      total,
      totalPages,
      hasNext: params.page! < totalPages,
      hasPrev: params.page! > 1
    }
  }
}

/**
 * Calcule le skip pour Prisma
 */
export function getSkip(page: number, limit: number): number {
  return (page - 1) * limit
}


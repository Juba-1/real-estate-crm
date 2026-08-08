/**
 * Shared list pagination helpers.
 * Workloads choose strategy; this module standardizes offset page contracts.
 */

export const DEFAULT_PAGE_SIZE = 24
export const MAX_PAGE_SIZE = 100

export type PageParams = {
  page?: number | string | string[]
  pageSize?: number | string | string[]
}

export type PaginatedResult<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number | null
  hasMore: boolean
}

function firstParam(
  value: number | string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) {
    return value[0]
  }
  if (typeof value === "number") {
    return String(value)
  }
  return value
}

export function parsePage(params: PageParams): {
  page: number
  pageSize: number
  from: number
  to: number
} {
  const rawPage = Number(firstParam(params.page) ?? "1")
  const rawSize = Number(firstParam(params.pageSize) ?? String(DEFAULT_PAGE_SIZE))
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(
      1,
      Number.isFinite(rawSize) && rawSize > 0
        ? Math.floor(rawSize)
        : DEFAULT_PAGE_SIZE
    )
  )
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  return { page, pageSize, from, to }
}

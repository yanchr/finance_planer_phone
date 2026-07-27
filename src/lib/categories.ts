import { db } from '../db'
import type { Category } from '../types'

export function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort(
    (a, b) =>
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name),
  )
}

export async function reorderCategories(
  categories: Category[],
  id: string,
  direction: -1 | 1,
): Promise<void> {
  const sorted = sortCategories(categories)
  const index = sorted.findIndex((c) => c.id === id)
  const nextIndex = index + direction
  if (index < 0 || nextIndex < 0 || nextIndex >= sorted.length) return

  const reordered = [...sorted]
  const [item] = reordered.splice(index, 1)
  reordered.splice(nextIndex, 0, item)

  await db.transaction('rw', db.categories, async () => {
    await Promise.all(
      reordered.map((cat, i) => db.categories.update(cat.id, { sortOrder: i })),
    )
  })
}

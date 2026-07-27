import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { sortCategories } from '../lib/categories'

export function useSortedCategories() {
  return (
    useLiveQuery(async () => sortCategories(await db.categories.toArray()), []) ??
    []
  )
}

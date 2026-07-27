import type { Category } from '../types'

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-food', name: 'Food', icon: 'utensils', isCustom: false, sortOrder: 0 },
  { id: 'cat-transport', name: 'Transport', icon: 'car', isCustom: false, sortOrder: 1 },
  { id: 'cat-housing', name: 'Housing', icon: 'home', isCustom: false, sortOrder: 2 },
  {
    id: 'cat-entertainment',
    name: 'Entertainment',
    icon: 'ticket',
    isCustom: false,
    sortOrder: 3,
  },
  { id: 'cat-shopping', name: 'Shopping', icon: 'shopping-bag', isCustom: false, sortOrder: 4 },
  { id: 'cat-utilities', name: 'Utilities', icon: 'zap', isCustom: false, sortOrder: 5 },
]

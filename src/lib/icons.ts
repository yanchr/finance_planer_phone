import {
  Car,
  Home,
  ShoppingBag,
  Ticket,
  Utensils,
  Zap,
  Tag,
  type LucideIcon,
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  home: Home,
  ticket: Ticket,
  'shopping-bag': ShoppingBag,
  zap: Zap,
  tag: Tag,
}

export const CATEGORY_ICON_OPTIONS = [
  { id: 'utensils', label: 'Food' },
  { id: 'car', label: 'Transport' },
  { id: 'home', label: 'Home' },
  { id: 'ticket', label: 'Fun' },
  { id: 'shopping-bag', label: 'Shop' },
  { id: 'zap', label: 'Utilities' },
  { id: 'tag', label: 'Other' },
] as const

export function getCategoryIcon(icon: string): LucideIcon {
  return ICON_MAP[icon] ?? Tag
}

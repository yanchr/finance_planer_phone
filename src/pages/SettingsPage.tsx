import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ChevronDown,
  ChevronUp,
  Download,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'
import { db } from '../db'
import { useSortedCategories } from '../hooks/useSortedCategories'
import { downloadBlob, exportBackup, importBackup } from '../lib/backup'
import { reorderCategories } from '../lib/categories'
import { formatCHF } from '../lib/currency'
import { createId } from '../lib/id'
import { CATEGORY_ICON_OPTIONS, getCategoryIcon } from '../lib/icons'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'

export function SettingsPage() {
  const settings = useLiveQuery(() => db.settings.get('settings'), [])
  const categories = useSortedCategories()
  const fileRef = useRef<HTMLInputElement>(null)

  const [budget, setBudget] = useState('')
  const [budgetMsg, setBudgetMsg] = useState('')
  const [backupMsg, setBackupMsg] = useState('')
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('tag')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const currentBudget = settings?.monthlyBudgetCHF ?? 3000

  async function saveBudget(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(budget.replace(',', '.'))
    if (!num || num <= 0) {
      setBudgetMsg('Enter a valid CHF amount')
      return
    }
    await db.settings.put({ id: 'settings', monthlyBudgetCHF: num })
    setBudget('')
    setBudgetMsg('Budget updated')
  }

  async function handleExport() {
    const blob = await exportBackup()
    const stamp = new Date().toISOString().slice(0, 10)
    downloadBlob(blob, `frankly-backup-${stamp}.json`)
    setBackupMsg('Backup downloaded')
  }

  async function handleImport(file: File | undefined) {
    if (!file) return
    try {
      await importBackup(file)
      setBackupMsg('Data restored from backup')
    } catch (err) {
      setBackupMsg(err instanceof Error ? err.message : 'Import failed')
    }
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    const nextOrder =
      categories.reduce((max, c) => Math.max(max, c.sortOrder ?? 0), -1) + 1
    await db.categories.add({
      id: createId(),
      name: newName.trim(),
      icon: newIcon,
      isCustom: true,
      sortOrder: nextOrder,
    })
    setNewName('')
    setNewIcon('tag')
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return
    await db.categories.update(id, { name: editName.trim() })
    setEditingId(null)
  }

  async function deleteCategory(id: string, isCustom: boolean) {
    if (!isCustom) return
    await db.categories.delete(id)
    const remaining = categories.filter((c) => c.id !== id)
    await db.transaction('rw', db.categories, async () => {
      await Promise.all(
        remaining.map((cat, i) =>
          db.categories.update(cat.id, { sortOrder: i }),
        ),
      )
    })
  }

  return (
    <div className="space-y-6 pt-2">
      <header className="animate-fade-up">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Settings
        </h1>
        <p className="mt-0.5 text-sm text-ink-muted">
          Budget, categories & backups
        </p>
      </header>

      <section className="animate-fade-up stagger-1 rounded-3xl border border-line bg-surface-raised p-4">
        <h2 className="text-[13px] font-semibold tracking-wide text-ink-muted uppercase">
          Monthly budget (CHF)
        </h2>
        <p className="font-display mt-1 text-3xl font-semibold text-pine">
          {formatCHF(currentBudget)}
        </p>
        <form onSubmit={saveBudget} className="mt-4 flex gap-2">
          <Field
            value={budget || String(currentBudget)}
            onChange={setBudget}
            inputMode="decimal"
            className="flex-1"
            aria-label="Monthly budget"
          />
          <Button type="submit">Save</Button>
        </form>
        {budgetMsg && (
          <p className="mt-2 text-sm text-pine">{budgetMsg}</p>
        )}
      </section>

      <section className="animate-fade-up stagger-2 space-y-3">
        <div>
          <h2 className="text-[13px] font-semibold tracking-wide text-ink-muted uppercase">
            Categories
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Use the arrows to set the order shown on Today.
          </p>
        </div>
        <ul className="space-y-2">
          {categories.map((cat, index) => {
            const Icon = getCategoryIcon(cat.icon)
            const editing = editingId === cat.id
            return (
              <li
                key={cat.id}
                className="flex items-center gap-1.5 rounded-2xl border border-line bg-surface-raised px-2 py-2.5 sm:px-3"
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    aria-label={`Move ${cat.name} up`}
                    disabled={index === 0}
                    className="rounded-lg p-1.5 text-ink-muted disabled:opacity-25 active:bg-surface-sunken"
                    onClick={() =>
                      void reorderCategories(categories, cat.id, -1)
                    }
                  >
                    <ChevronUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${cat.name} down`}
                    disabled={index === categories.length - 1}
                    className="rounded-lg p-1.5 text-ink-muted disabled:opacity-25 active:bg-surface-sunken"
                    onClick={() =>
                      void reorderCategories(categories, cat.id, 1)
                    }
                  >
                    <ChevronDown className="size-4" />
                  </button>
                </div>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-pine-soft text-pine">
                  <Icon className="size-4" />
                </span>
                {editing ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="min-h-10 min-w-0 flex-1 rounded-xl border border-line px-3 outline-none focus:border-pine"
                    autoFocus
                  />
                ) : (
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {cat.name}
                  </span>
                )}
                {!cat.isCustom && (
                  <span className="shrink-0 rounded-full bg-surface-sunken px-2 py-0.5 text-[10px] font-semibold text-ink-muted">
                    Default
                  </span>
                )}
                {editing ? (
                  <Button
                    type="button"
                    variant="primary"
                    className="min-h-10 shrink-0 px-3 text-sm"
                    onClick={() => void saveEdit(cat.id)}
                  >
                    OK
                  </Button>
                ) : (
                  <button
                    type="button"
                    className="shrink-0 rounded-xl p-2 text-ink-faint active:bg-surface-sunken"
                    onClick={() => {
                      setEditingId(cat.id)
                      setEditName(cat.name)
                    }}
                  >
                    <Pencil className="size-4" />
                  </button>
                )}
                {cat.isCustom && (
                  <button
                    type="button"
                    className="shrink-0 rounded-xl p-2 text-ink-faint active:bg-coral-soft active:text-coral"
                    onClick={() => void deleteCategory(cat.id, cat.isCustom)}
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>

        <form
          onSubmit={addCategory}
          className="rounded-3xl border border-dashed border-line bg-surface-raised/60 p-4"
        >
          <p className="mb-3 text-sm font-semibold">New custom category</p>
          <Field
            label="Name"
            value={newName}
            onChange={setNewName}
            placeholder="Health"
          />
          <p className="mt-3 mb-1.5 text-[12px] font-semibold tracking-wide text-ink-muted uppercase">
            Icon
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {CATEGORY_ICON_OPTIONS.map((opt) => {
              const Icon = getCategoryIcon(opt.id)
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setNewIcon(opt.id)}
                  className={`flex size-11 items-center justify-center rounded-xl border transition ${
                    newIcon === opt.id
                      ? 'border-pine bg-pine-soft text-pine'
                      : 'border-line text-ink-muted'
                  }`}
                >
                  <Icon className="size-5" />
                </button>
              )
            })}
          </div>
          <Button type="submit" className="w-full" variant="secondary">
            <Plus className="size-5" /> Add category
          </Button>
        </form>
      </section>

      <section className="animate-fade-up stagger-3 space-y-3 rounded-3xl border border-line bg-surface-raised p-4">
        <h2 className="text-[13px] font-semibold tracking-wide text-ink-muted uppercase">
          Backup & restore
        </h2>
        <p className="text-sm text-ink-muted">
          Export everything as JSON, or restore from a previous backup.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            onClick={() => void handleExport()}
            className="flex-1"
          >
            <Download className="size-5" /> Export JSON
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-5" /> Import JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              void handleImport(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
        {backupMsg && <p className="text-sm text-pine">{backupMsg}</p>}
      </section>

      <p className="pb-4 text-center text-xs text-ink-faint">
        Frankly · offline-first · base currency CHF
      </p>
    </div>
  )
}

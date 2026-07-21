import Dexie, { type Table } from 'dexie'
import type { Note, Section, Folder, Quote, Reference, InboxItem, Template } from '../types'
import { uid, now } from '../lib/utils'

export const SYNC_TABLES = ['sections', 'folders', 'notes', 'quotes', 'references', 'inbox', 'templates'] as const
export type SyncTable = (typeof SYNC_TABLES)[number]

class MaktabatiDB extends Dexie {
  sections!: Table<Section, string>
  folders!: Table<Folder, string>
  notes!: Table<Note, string>
  quotes!: Table<Quote, string>
  references!: Table<Reference, string>
  inbox!: Table<InboxItem, string>
  templates!: Table<Template, string>
  meta!: Table<{ key: string; value: any }, string>

  constructor() {
    super('maktabati')
    this.version(1).stores({
      sections: 'id, updatedAt, dirty, deleted, order',
      folders: 'id, updatedAt, dirty, deleted, sectionId, parentId',
      notes: 'id, updatedAt, createdAt, dirty, deleted, sectionId, folderId, pinned, favorite, archived, *tags',
      quotes: 'id, updatedAt, dirty, deleted, category',
      references: 'id, updatedAt, dirty, deleted, type',
      inbox: 'id, updatedAt, dirty, deleted, processed',
      templates: 'id, updatedAt, dirty, deleted',
      meta: 'key',
    })
    // v2: index title + wiki links so "related notes" uses indexes instead of full scans
    this.version(2).stores({
      notes: 'id, updatedAt, createdAt, dirty, deleted, sectionId, folderId, pinned, favorite, archived, title, *tags, *links',
    })
    // v3: index content type so browsing a knowledge type stays fast at scale
    this.version(3).stores({
      notes: 'id, updatedAt, createdAt, dirty, deleted, sectionId, folderId, pinned, favorite, archived, title, type, *tags, *links',
    })
  }
}

export const db = new MaktabatiDB()

// Listeners notified after every local write (used to trigger sync push)
const writeListeners: Array<() => void> = []
export const onLocalWrite = (fn: () => void) => writeListeners.push(fn)
const notifyWrite = () => writeListeners.forEach((f) => f())

// Create or update an entity: stamps updatedAt + dirty so the sync engine picks it up
export async function save<T extends { id?: string }>(table: SyncTable, data: T): Promise<string> {
  const id = data.id || uid()
  const existing = await (db as any)[table].get(id)
  const record = {
    createdAt: existing?.createdAt ?? now(),
    ...existing,
    ...data,
    id,
    updatedAt: now(),
    dirty: 1,
    deleted: (data as any).deleted ?? existing?.deleted ?? 0,
  }
  await (db as any)[table].put(record)
  notifyWrite()
  return id
}

// Soft delete (kept locally so the deletion syncs to other devices)
export async function remove(table: SyncTable, id: string) {
  const existing = await (db as any)[table].get(id)
  if (!existing) return
  await (db as any)[table].put({ ...existing, deleted: 1, updatedAt: now(), dirty: 1 })
  notifyWrite()
}

export const getMeta = async (key: string) => (await db.meta.get(key))?.value
export const setMeta = (key: string, value: any) => db.meta.put({ key, value })

// ---- First-run seeding ----
const DEFAULT_SECTIONS: Array<[string, string, string]> = [
  ['العلوم الشرعية', '🕌', '#7fc8a9'],
  ['التاريخ', '📜', '#e0a458'],
  ['الجغرافيا', '🗺️', '#5aa9e6'],
  ['السياسة', '🏛️', '#9aa5b1'],
  ['الاقتصاد', '📈', '#f6bd60'],
  ['التقنية', '💻', '#5aa9e6'],
  ['الذكاء الاصطناعي', '🤖', '#b8a1e3'],
  ['البرمجة', '⌨️', '#7fc8a9'],
  ['اللغة الإنجليزية', '🇬🇧', '#e07a5f'],
  ['الكتب', '📚', '#e0a458'],
  ['الصحة', '🩺', '#e07a5f'],
  ['الإدارة', '🗂️', '#9aa5b1'],
  ['إدارة المستشفيات', '🏥', '#5aa9e6'],
  ['الاستثمار', '💰', '#f6bd60'],
  ['المشاريع', '🚀', '#b8a1e3'],
  ['الحياة الشخصية', '🌱', '#7fc8a9'],
]

export async function seedIfEmpty() {
  const count = await db.sections.count()
  if (count > 0) return
  const t = now()
  await db.sections.bulkAdd(
    DEFAULT_SECTIONS.map(([name, icon, color], i) => ({
      id: uid(), name, icon, color, order: i, createdAt: t, updatedAt: t, dirty: 1, deleted: 0,
    }))
  )
  notifyWrite()
}

// ---- Full export / import (backup) ----
export async function exportAll(): Promise<string> {
  const data: Record<string, any[]> = {}
  for (const t of SYNC_TABLES) data[t] = await (db as any)[t].toArray()
  return JSON.stringify({ app: 'maktabati', version: 1, exportedAt: now(), data }, null, 2)
}

export async function importAll(json: string): Promise<number> {
  const parsed = JSON.parse(json)
  if (parsed?.app !== 'maktabati' || !parsed.data) throw new Error('ملف نسخة احتياطية غير صالح')
  let n = 0
  for (const t of SYNC_TABLES) {
    const rows = parsed.data[t] || []
    for (const row of rows) {
      const existing = await (db as any)[t].get(row.id)
      if (!existing || (row.updatedAt || 0) > (existing.updatedAt || 0)) {
        await (db as any)[t].put({ ...row, dirty: 1 })
        n++
      }
    }
  }
  notifyWrite()
  return n
}

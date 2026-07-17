// Shared entity types. Every synced entity has: id, createdAt, updatedAt (epoch ms),
// deleted (soft delete for sync), dirty (1 = pending push to Firestore).

export interface Base {
  id: string
  createdAt: number
  updatedAt: number
  deleted?: 0 | 1
  dirty?: 0 | 1
}

export interface Section extends Base {
  name: string
  icon: string // emoji
  color: string
  order: number
  description?: string
  pinned?: 0 | 1
}

export interface Folder extends Base {
  name: string
  sectionId: string
  parentId: string | null
  order: number
}

export interface SrsState {
  due: number // epoch ms of next review
  interval: number // days
  ease: number
  reps: number
  lastGrade?: number
}

export interface Note extends Base {
  title: string
  description: string
  contentHTML: string
  contentText: string // plain text extracted for search
  sectionId: string | null
  folderId: string | null
  tags: string[]
  keywords: string[]
  refIds: string[] // linked references
  links: string[] // outgoing wiki-link titles [[...]]
  color: string | null
  pinned: 0 | 1
  favorite: 0 | 1
  archived: 0 | 1
  srs: SrsState | null // null = not in review system
}

export interface Quote extends Base {
  text: string
  author: string
  source: string
  page: string
  category: string
  tags: string[]
  comment: string
}

export type RefType = 'كتاب' | 'مقال' | 'بحث' | 'موقع' | 'PDF' | 'فيديو' | 'دورة' | 'وثيقة'

export interface Reference extends Base {
  type: RefType
  title: string
  author: string
  url: string
  year: string
  notes: string
}

export interface InboxItem extends Base {
  kind: 'رابط' | 'نص' | 'فيديو' | 'صورة' | 'PDF' | 'تغريدة'
  title: string
  content: string // url or text
  note: string
  processed: 0 | 1
}

export interface Template extends Base {
  name: string
  icon: string
  contentHTML: string
  builtin?: boolean
}

export const NOTE_COLORS = ['#5aa9e6', '#7fc8a9', '#f6bd60', '#e07a5f', '#b8a1e3', '#9aa5b1']

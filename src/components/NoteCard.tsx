import { memo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pin, Star, Repeat2, Check, CheckSquare, FolderInput, Tag, Archive, Trash2, X } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, save, remove } from '../db/db'
import Modal from './Modal'
import { useSettings } from '../lib/settings'
import type { Note } from '../types'
import { timeAgo } from '../lib/utils'
import { typeInfo } from '../lib/contentTypes'

interface CardProps {
  note: Note
  selectMode?: boolean
  selected?: boolean
  onToggle?: () => void
  onLongPress?: () => void
}

function NoteCardInner({ note, selectMode, selected, onToggle, onLongPress }: CardProps) {
  const timer = useRef<any>(null)
  const longFired = useRef(false)

  const startPress = () => {
    if (!onLongPress) return
    timer.current = setTimeout(() => {
      longFired.current = true
      onLongPress()
    }, 450)
  }
  const cancelPress = () => clearTimeout(timer.current)

  return (
    <Link
      to={`/note/${note.id}`}
      style={{ color: 'inherit' }}
      onClick={(e) => {
        if (longFired.current) {
          e.preventDefault()
          longFired.current = false
          return
        }
        if (selectMode) {
          e.preventDefault()
          onToggle?.()
        }
      }}
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerMove={cancelPress}
      onPointerLeave={cancelPress}
      onContextMenu={(e) => {
        if (onLongPress && !selectMode) {
          e.preventDefault()
          onLongPress()
        }
      }}
    >
      <div className={`card clickable note-card ${selected ? 'selected' : ''}`}>
        {note.color && <div className="bar" style={{ background: note.color }} />}
        {selectMode && (
          <div className={`sel-badge ${selected ? 'on' : ''}`}>{selected && <Check size={13} />}</div>
        )}
        <h4 style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {note.pinned ? <Pin size={13} style={{ color: 'var(--accent)' }} /> : null}
          {note.favorite ? <Star size={13} style={{ color: 'var(--warning)', fill: 'var(--warning)' }} /> : null}
          {note.title || 'بدون عنوان'}
        </h4>
        {(note.description || note.contentText) && <p>{note.description || note.contentText.slice(0, 140)}</p>}
        <div className="meta">
          {note.type && note.type !== 'note' && (
            <span className="chip" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              {typeInfo(note.type).icon} {typeInfo(note.type).label}
            </span>
          )}
          <span>{timeAgo(note.updatedAt)}</span>
          {note.tags?.slice(0, 2).map((t) => (
            <span key={t} className="chip">#{t}</span>
          ))}
          {note.srs && <Repeat2 size={12} />}
        </div>
      </div>
    </Link>
  )
}

const NoteCard = memo(
  NoteCardInner,
  (a, b) =>
    a.note.id === b.note.id &&
    a.note.updatedAt === b.note.updatedAt &&
    a.selectMode === b.selectMode &&
    a.selected === b.selected
)
export default NoteCard

// ===== Notes list with bulk selection (long-press to enter selection mode) =====
export function NotesGrid({ notes }: { notes: Note[] }) {
  const { settings } = useSettings()
  const [selecting, setSelecting] = useState(false)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [moveOpen, setMoveOpen] = useState(false)
  const sections = useLiveQuery(() => db.sections.orderBy('order').filter((s) => !s.deleted).toArray(), [])

  const toggle = (id: string) =>
    setSel((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  const exit = () => {
    setSelecting(false)
    setSel(new Set())
  }
  const enterWith = (id: string) => {
    if (!selecting) {
      setSelecting(true)
      setSel(new Set([id]))
    }
  }

  const selectedNotes = notes.filter((n) => sel.has(n.id))
  const anyActive = selectedNotes.some((n) => !n.archived)

  async function bulkPatch(patch: (n: Note) => Partial<Note>) {
    for (const n of selectedNotes) await save('notes', { ...n, ...patch(n) })
    exit()
  }
  async function deleteAll() {
    if (!confirm(`حذف ${sel.size} ملاحظة نهائيًا؟`)) return
    for (const id of sel) await remove('notes', id)
    exit()
  }
  async function addTag() {
    const t = prompt('اسم الوسم لإضافته للملاحظات المحددة:')
    const tag = t?.trim().replace(/^#/, '')
    if (!tag) return
    bulkPatch((n) => (n.tags?.includes(tag) ? {} : { tags: [...(n.tags || []), tag] }))
  }
  async function removeTag() {
    const t = prompt('اسم الوسم لإزالته من الملاحظات المحددة:')
    const tag = t?.trim().replace(/^#/, '')
    if (!tag) return
    bulkPatch((n) => ({ tags: (n.tags || []).filter((x) => x !== tag) }))
  }

  const cls =
    settings.noteView === 'list' ? 'notes-list' : settings.noteView === 'grid' ? 'grid cols-3' : 'grid cols-2'

  return (
    <>
      <div className={cls}>
        {notes.map((n) => (
          <NoteCard
            key={n.id}
            note={n}
            selectMode={selecting}
            selected={sel.has(n.id)}
            onToggle={() => toggle(n.id)}
            onLongPress={() => enterWith(n.id)}
          />
        ))}
      </div>

      {selecting && (
        <div className="select-bar">
          <b style={{ fontSize: 13, whiteSpace: 'nowrap' }}><CheckSquare size={14} /> {sel.size}</b>
          <button className="btn sm" onClick={() => setSel(new Set(notes.map((n) => n.id)))}>تحديد الكل</button>
          <button className="btn sm" disabled={!sel.size} onClick={() => setMoveOpen(true)} title="نقل إلى قسم"><FolderInput size={14} /></button>
          <button className="btn sm" disabled={!sel.size} onClick={addTag} title="إضافة وسم"><Tag size={14} />+</button>
          <button className="btn sm" disabled={!sel.size} onClick={removeTag} title="إزالة وسم"><Tag size={14} />−</button>
          <button className="btn sm" disabled={!sel.size} onClick={() => bulkPatch(() => ({ archived: anyActive ? 1 : 0 }))} title={anyActive ? 'أرشفة' : 'استعادة'}>
            <Archive size={14} />
          </button>
          <button className="btn danger sm" disabled={!sel.size} onClick={deleteAll} title="حذف"><Trash2 size={14} /></button>
          <button className="btn ghost sm" onClick={exit} title="إلغاء التحديد"><X size={14} /></button>
        </div>
      )}

      {moveOpen && (
        <Modal title={`نقل ${sel.size} ملاحظة إلى قسم`} onClose={() => setMoveOpen(false)}>
          <div className="grid cols-2">
            {sections?.map((s) => (
              <button
                key={s.id}
                className="card clickable"
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: 'start' }}
                onClick={async () => {
                  for (const n of selectedNotes) await save('notes', { ...n, sectionId: s.id, folderId: null })
                  setMoveOpen(false)
                  exit()
                }}
              >
                <span style={{ fontSize: 18 }}>{s.icon}</span> <b style={{ fontSize: 13 }}>{s.name}</b>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </>
  )
}

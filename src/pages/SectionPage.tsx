import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, save, remove } from '../db/db'
import { NotesGrid } from '../components/NoteCard'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import type { Folder } from '../types'

export default function SectionPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const [folderId, setFolderId] = useState<string | null>(null)
  const [editFolder, setEditFolder] = useState<Partial<Folder> | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const section = useLiveQuery(() => db.sections.get(id!), [id])
  const folders = useLiveQuery(
    () => db.folders.filter((f) => !f.deleted && f.sectionId === id && (f.parentId || null) === folderId).toArray(),
    [id, folderId])
  const currentFolder = useLiveQuery(() => (folderId ? db.folders.get(folderId) : undefined), [folderId])
  const notes = useLiveQuery(
    () => db.notes
      .filter((n) => !n.deleted && n.sectionId === id && (n.folderId || null) === folderId && (showArchived ? true : !n.archived))
      .reverse().sortBy('updatedAt'),
    [id, folderId, showArchived])

  async function newNote() {
    const nid = await save('notes', {
      title: '', description: '', contentHTML: '', contentText: '',
      sectionId: id, folderId, tags: [], keywords: [], refIds: [], links: [],
      color: null, pinned: 0, favorite: 0, archived: 0, srs: null,
    } as any)
    nav(`/note/${nid}`)
  }

  async function submitFolder() {
    if (!editFolder?.name?.trim()) return
    await save('folders', {
      ...editFolder, name: editFolder.name.trim(), sectionId: id,
      parentId: editFolder.parentId ?? folderId, order: editFolder.order ?? 0,
    } as any)
    setEditFolder(null)
  }

  if (!section) return null

  return (
    <div>
      <h1 className="page-title">{section.icon} {section.name}</h1>
      <p className="page-sub">
        {currentFolder ? (
          <>
            <a style={{ cursor: 'pointer' }} onClick={() => setFolderId(currentFolder.parentId || null)}>← رجوع</a>
            {'  '}📂 {currentFolder.name}
          </>
        ) : (section.description || 'كل الملاحظات والمجلدات')}
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn primary" onClick={newNote}>+ ملاحظة</button>
        <button className="btn" onClick={() => setEditFolder({})}>+ مجلد</button>
        <button className={`btn ${showArchived ? 'primary' : ''}`} onClick={() => setShowArchived(!showArchived)}>🗄️ الأرشيف</button>
      </div>

      {folders && folders.length > 0 && (
        <div className="grid cols-3" style={{ marginTop: 18 }}>
          {folders.map((f) => (
            <div key={f.id} className="card clickable" style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={() => setFolderId(f.id)}>
              <span style={{ fontSize: 20 }}>📂</span>
              <b style={{ fontSize: 14, flex: 1 }}>{f.name}</b>
              <button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); setEditFolder(f) }}>✏️</button>
            </div>
          ))}
        </div>
      )}

      <div className="section-h">الملاحظات</div>
      {notes && notes.length > 0 ? (
        <NotesGrid notes={notes} />
      ) : (
        <EmptyState text="لا توجد ملاحظات هنا بعد" />
      )}

      {editFolder && (
        <Modal title={editFolder.id ? 'تعديل المجلد' : 'مجلد جديد'} onClose={() => setEditFolder(null)}>
          <label className="field"><span>اسم المجلد</span>
            <input className="input" value={editFolder.name || ''} onChange={(e) => setEditFolder({ ...editFolder, name: e.target.value })} autoFocus />
          </label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {editFolder.id && (
              <button className="btn danger" onClick={async () => {
                if (confirm('حذف المجلد؟')) { await remove('folders', editFolder.id!); setEditFolder(null) }
              }}>حذف</button>
            )}
            <button className="btn" onClick={() => setEditFolder(null)}>إلغاء</button>
            <button className="btn primary" onClick={submitFolder}>حفظ</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { save } from '../db/db'
import { stripHtml } from '../lib/utils'
import { CONTENT_TYPES, type ContentType } from '../lib/contentTypes'
import Modal from './Modal'

// The entry point to the library: choose *what kind of knowledge* you're adding,
// not just "a note". Each choice seeds the note with that type's starter fields.
export default function AddSheet({ onClose, sectionId = null }: { onClose: () => void; sectionId?: string | null }) {
  const nav = useNavigate()

  async function add(t: ContentType) {
    const id = await save('notes', {
      type: t.key,
      title: '', description: '', contentHTML: t.starter, contentText: stripHtml(t.starter),
      sectionId, folderId: null, tags: [], keywords: [], refIds: [], links: [],
      color: null, pinned: 0, favorite: 0, archived: 0, srs: null,
    } as any)
    onClose()
    nav(`/note/${id}`)
  }

  return (
    <Modal title="أضف إلى مكتبتك" onClose={onClose}>
      <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '-6px 0 14px' }}>
        اختر نوع المعرفة التي تريد حفظها
      </p>
      <div className="grid cols-4" style={{ gap: 10 }}>
        {CONTENT_TYPES.map((t) => (
          <button
            key={t.key} className="card clickable" onClick={() => add(t)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 6px', cursor: 'pointer', textAlign: 'center' }}
          >
            <span style={{ fontSize: 24 }}>{t.icon}</span>
            <b style={{ fontSize: 12 }}>{t.label}</b>
          </button>
        ))}
      </div>
    </Modal>
  )
}

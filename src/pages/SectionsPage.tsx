import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { MoreVertical, Pencil, Pin, PinOff, Trash2, Plus, GripVertical } from 'lucide-react'
import { db, save, remove } from '../db/db'
import Modal from '../components/Modal'
import { timeAgo } from '../lib/utils'
import type { Section } from '../types'

const EMOJIS = ['📁', '🕌', '📜', '🗺️', '🏛️', '📈', '💻', '🤖', '⌨️', '📚', '🩺', '🗂️', '🏥', '💰', '🚀', '🌱', '⚖️', '🎨', '🍎', '✈️', '🧠', '🔬', '🎓', '🕐']
const COLORS = ['#5aa9e6', '#7fc8a9', '#f6bd60', '#e07a5f', '#b8a1e3', '#9aa5b1', '#2a9d8f', '#c76a8a']

export default function SectionsPage() {
  const sections = useLiveQuery(async () => {
    const list = await db.sections.orderBy('order').filter((s) => !s.deleted).toArray()
    // pinned sections float to the top, keeping manual order inside each group
    return list.sort((a, b) => (b.pinned || 0) - (a.pinned || 0))
  }, [])
  const counts = useLiveQuery(async () => {
    const map: Record<string, number> = {}
    await db.notes.filter((n) => !n.deleted).each((n) => {
      if (n.sectionId) map[n.sectionId] = (map[n.sectionId] || 0) + 1
    })
    return map
  }, [])

  const [editing, setEditing] = useState<Partial<Section> | null>(null)
  const [deleting, setDeleting] = useState<Section | null>(null)
  const [deleteMode, setDeleteMode] = useState<'move' | 'none' | 'all'>('none')
  const [moveTarget, setMoveTarget] = useState('')
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)

  async function dropOn(targetId: string) {
    if (!dragId || dragId === targetId || !sections) return
    const list = [...sections]
    const from = list.findIndex((x) => x.id === dragId)
    const to = list.findIndex((x) => x.id === targetId)
    if (from < 0 || to < 0) return
    const [moved] = list.splice(from, 1)
    list.splice(to, 0, moved)
    for (let i = 0; i < list.length; i++) {
      if (list[i].order !== i) await save('sections', { id: list[i].id, order: i } as any)
    }
    setDragId(null)
  }

  async function submit() {
    if (!editing?.name?.trim()) return
    await save('sections', {
      ...editing,
      name: editing.name.trim(),
      icon: editing.icon || '📁',
      color: editing.color || COLORS[0],
      description: editing.description || '',
      order: editing.order ?? (sections?.length || 0),
      pinned: editing.pinned ?? 0,
    } as any)
    setEditing(null)
  }

  async function confirmDelete() {
    if (!deleting) return
    const notes = await db.notes.filter((n) => !n.deleted && n.sectionId === deleting.id).toArray()
    if (deleteMode === 'all') {
      if (!confirm(`تأكيد أخير: سيتم حذف القسم و${notes.length} ملاحظة نهائيًا. متابعة؟`)) return
      for (const n of notes) await remove('notes', n.id)
    } else {
      const target = deleteMode === 'move' ? moveTarget || null : null
      for (const n of notes) await save('notes', { id: n.id, sectionId: target, folderId: null } as any)
    }
    await remove('sections', deleting.id)
    setDeleting(null)
  }

  return (
    <div>
      <h1 className="page-title">الأقسام</h1>
      <p className="page-sub">نظّم معرفتك في أقسام بلا حدود — اسحب البطاقات لإعادة الترتيب</p>
      <button className="btn primary" onClick={() => setEditing({})}><Plus size={16} /> قسم جديد</button>

      <div className="grid cols-2" style={{ marginTop: 18 }}>
        {sections?.map((s) => (
          <div
            key={s.id} className="card"
            style={{ position: 'relative', opacity: dragId === s.id ? 0.4 : 1 }}
            draggable
            onDragStart={() => setDragId(s.id)}
            onDragEnd={() => setDragId(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); dropOn(s.id) }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <GripVertical size={15} style={{ color: 'var(--text-3)', cursor: 'grab', flexShrink: 0 }} />
              <Link to={`/section/${s.id}`} style={{ color: 'inherit', display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                <span className="icon-bubble" style={{ background: `color-mix(in srgb, ${s.color} 16%, transparent)` }}>{s.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <b style={{ fontSize: 14.5, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {s.pinned ? <Pin size={12} style={{ color: s.color }} /> : null}
                    {s.name}
                  </b>
                  {s.description && (
                    <div style={{ fontSize: 12, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.description}
                    </div>
                  )}
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>
                    {counts?.[s.id] || 0} ملاحظة · {timeAgo(s.updatedAt)}
                  </div>
                </div>
              </Link>
              <button className="btn ghost sm" onClick={() => setMenuFor(menuFor === s.id ? null : s.id)}>
                <MoreVertical size={16} />
              </button>
            </div>

            {menuFor === s.id && (
              <div className="menu-pop">
                <button onClick={() => { setMenuFor(null); setEditing(s) }}><Pencil size={15} /> تعديل</button>
                <button onClick={async () => { setMenuFor(null); await save('sections', { id: s.id, pinned: s.pinned ? 0 : 1 } as any) }}>
                  {s.pinned ? <><PinOff size={15} /> إلغاء التثبيت</> : <><Pin size={15} /> تثبيت</>}
                </button>
                <button className="danger" onClick={() => { setMenuFor(null); setDeleting(s); setDeleteMode('none'); setMoveTarget('') }}>
                  <Trash2 size={15} /> حذف
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add / Edit */}
      {editing && (
        <Modal title={editing.id ? 'تعديل القسم' : 'قسم جديد'} onClose={() => setEditing(null)}>
          <label className="field"><span>الاسم *</span>
            <input className="input" value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus />
          </label>
          <label className="field"><span>وصف اختياري</span>
            <input className="input" value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </label>
          <label className="field"><span>الأيقونة</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {EMOJIS.map((e) => (
                <button key={e} className={`chip ${editing.icon === e ? 'on' : ''}`} style={{ fontSize: 18 }} onClick={() => setEditing({ ...editing, icon: e })}>{e}</button>
              ))}
            </div>
          </label>
          <label className="field"><span>اللون</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLORS.map((c) => (
                <button key={c} onClick={() => setEditing({ ...editing, color: c })}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: editing.color === c ? '3px solid var(--text)' : '2px solid var(--border)' }} />
              ))}
            </div>
          </label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setEditing(null)}>إلغاء</button>
            <button className="btn primary" onClick={submit}>حفظ</button>
          </div>
        </Modal>
      )}

      {/* Delete flow */}
      {deleting && (
        <Modal title={`حذف قسم «${deleting.name}»`} onClose={() => setDeleting(null)}>
          <p style={{ fontSize: 14, color: 'var(--text-2)' }}>
            يحتوي هذا القسم على <b style={{ color: 'var(--text)' }}>{counts?.[deleting.id] || 0} ملاحظة</b>. ماذا تريد أن يحدث لها؟
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '12px 0' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, cursor: 'pointer' }}>
              <input type="radio" checked={deleteMode === 'none'} onChange={() => setDeleteMode('none')} style={{ accentColor: 'var(--accent)' }} />
              إبقاء الملاحظات بدون قسم (غير مصنفة)
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, cursor: 'pointer' }}>
              <input type="radio" checked={deleteMode === 'move'} onChange={() => setDeleteMode('move')} style={{ accentColor: 'var(--accent)' }} />
              نقل الملاحظات إلى قسم آخر
            </label>
            {deleteMode === 'move' && (
              <select className="input" value={moveTarget} onChange={(e) => setMoveTarget(e.target.value)}>
                <option value="">— اختر القسم —</option>
                {sections?.filter((x) => x.id !== deleting.id).map((x) => (
                  <option key={x.id} value={x.id}>{x.icon} {x.name}</option>
                ))}
              </select>
            )}
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, cursor: 'pointer', color: 'var(--danger)' }}>
              <input type="radio" checked={deleteMode === 'all'} onChange={() => setDeleteMode('all')} style={{ accentColor: 'var(--danger)' }} />
              حذف القسم وجميع ملاحظاته نهائيًا
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setDeleting(null)}>إلغاء</button>
            <button className="btn danger" disabled={deleteMode === 'move' && !moveTarget} onClick={confirmDelete}>
              <Trash2 size={15} /> تنفيذ الحذف
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

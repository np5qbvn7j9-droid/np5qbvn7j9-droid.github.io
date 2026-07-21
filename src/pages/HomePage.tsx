import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Search, Repeat2, Pin, Clock, Inbox, FolderKanban, LibraryBig } from 'lucide-react'
import { db } from '../db/db'
import { NotesGrid } from '../components/NoteCard'
import { useSettings } from '../lib/settings'
import { startOfToday } from '../lib/utils'
import { CONTENT_TYPES } from '../lib/contentTypes'

export default function HomePage() {
  const [q, setQ] = useState('')
  const nav = useNavigate()
  const { settings } = useSettings()
  const show = settings.home

  const recent = useLiveQuery(
    () => db.notes.orderBy('updatedAt').reverse().filter((n) => !n.deleted && !n.archived).limit(6).toArray(), [])
  const pinned = useLiveQuery(
    () => db.notes.where('pinned').equals(1).filter((n) => !n.deleted && !n.archived).toArray(), [])
  const due = useLiveQuery(
    () => db.notes.filter((n) => !n.deleted && !!n.srs && n.srs!.due <= Date.now()).limit(4).toArray(), [])
  const sections = useLiveQuery(
    () => db.sections.orderBy('order').filter((s) => !s.deleted).toArray(), [])
  const inboxCount = useLiveQuery(
    () => db.inbox.filter((i) => !i.deleted && !i.processed).count(), [], 0)
  const todayCount = useLiveQuery(
    () => db.notes.filter((n) => !n.deleted && n.updatedAt >= startOfToday()).count(), [], 0)
  const totalNotes = useLiveQuery(() => db.notes.filter((n) => !n.deleted).count(), [], 0)
  const totalQuotes = useLiveQuery(() => db.quotes.filter((n) => !n.deleted).count(), [], 0)
  const totalRefs = useLiveQuery(() => db.references.filter((n) => !n.deleted).count(), [], 0)
  // count entries per content type (single pass) to build the "browse by type" grid
  const typeCounts = useLiveQuery(async () => {
    const map: Record<string, number> = {}
    await db.notes.filter((n) => !n.deleted).each((n) => {
      const k = n.type || 'note'
      map[k] = (map[k] || 0) + 1
    })
    return map
  }, [])
  const usedTypes = CONTENT_TYPES
    .map((t) => ({ ...t, count: typeCounts?.[t.key] || 0 }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)

  return (
    <div>
      <h1 className="page-title"><LibraryBig size={22} style={{ verticalAlign: '-4px', marginInlineEnd: 6 }} />مكتبتي</h1>
      <p className="page-sub">مرجعك المعرفي الشخصي — {totalNotes + totalQuotes + totalRefs} معلومة محفوظة</p>

      <form className="search-hero" onSubmit={(e) => { e.preventDefault(); if (q.trim()) nav(`/search?q=${encodeURIComponent(q)}`) }}>
        <Search size={19} style={{ color: 'var(--text-3)' }} />
        <input placeholder="ابحث في مكتبتك… (مثال: اقتباسات عن النجاح، كلمات عن السفر)" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn primary sm" type="submit">بحث</button>
      </form>

      {/* Browse the library by content type */}
      {usedTypes.length > 0 && (
        <>
          <div className="section-h">🗂️ تصفّح مكتبتك <Link to="/search">بحث متقدم ←</Link></div>
          <div className="grid cols-4">
            {usedTypes.map((t) => (
              <Link key={t.key} to={`/search?type=${t.key}`} style={{ color: 'inherit' }}>
                <div className="card clickable" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{t.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <b style={{ fontSize: 13.5 }}>{t.label}</b>
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{t.count}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {show.stats && (
        <div className="grid cols-4" style={{ marginTop: 18 }}>
          <div className="card stat"><div className="num">{totalNotes}</div><div className="lbl">مُدخل</div></div>
          <div className="card stat"><div className="num">{totalQuotes}</div><div className="lbl">اقتباس</div></div>
          <div className="card stat"><div className="num">{totalRefs}</div><div className="lbl">مرجع</div></div>
          <div className="card stat"><div className="num">{todayCount}</div><div className="lbl">نشاط اليوم</div></div>
        </div>
      )}

      {show.due && due && due.length > 0 && (
        <>
          <div className="section-h"><Repeat2 size={16} /> تحتاج مراجعة اليوم <Link to="/review">ابدأ المراجعة ←</Link></div>
          <NotesGrid notes={due} />
        </>
      )}

      {show.pinned && pinned && pinned.length > 0 && (
        <>
          <div className="section-h"><Pin size={16} /> المثبتة</div>
          <NotesGrid notes={pinned} />
        </>
      )}

      {show.recent && (
        <>
          <div className="section-h"><Clock size={16} /> آخر الإضافات <Link to="/timeline">عرض الكل ←</Link></div>
          {recent && recent.length > 0 ? (
            <NotesGrid notes={recent} />
          ) : (
            <div className="empty"><div className="big">📚</div>مكتبتك تبدأ من هنا — اضغط + لإضافة أول معلومة</div>
          )}
        </>
      )}

      {show.inbox && inboxCount > 0 && (
        <Link to="/inbox">
          <div className="card clickable" style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Inbox size={22} style={{ color: 'var(--accent)' }} />
            <div>
              <b>{inboxCount} عنصر في صندوق القراءة</b>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>لديك عناصر محفوظة بانتظار المراجعة</div>
            </div>
          </div>
        </Link>
      )}

      {show.sections && (
        <>
          <div className="section-h"><FolderKanban size={16} /> الأقسام <Link to="/sections">إدارة الأقسام ←</Link></div>
          <div className="grid cols-3">
            {sections?.map((s) => (
              <Link key={s.id} to={`/section/${s.id}`} style={{ color: 'inherit' }}>
                <div className="card clickable" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{s.icon}</span>
                  <b style={{ fontSize: 14 }}>{s.name}</b>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

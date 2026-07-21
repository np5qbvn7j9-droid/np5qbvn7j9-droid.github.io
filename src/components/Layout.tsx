import { type ReactNode, useState, useEffect, useRef, useLayoutEffect } from 'react'
import { NavLink, useNavigate, useLocation, useNavigationType } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Home, FolderKanban, Search, Repeat2, Inbox, Quote, BookMarked, Share2, LayoutTemplate,
  Clock, BarChart3, Settings, Plus, X, Menu, Sun, Moon, SunMoon, Cloud, CloudOff,
  RefreshCw, AlertTriangle, FileText, ClipboardPaste, Link2, PenLine,
} from 'lucide-react'
import { db, save, SYNC_TABLES } from '../db/db'
import { onSyncStatus, type SyncStatus, syncNow } from '../lib/sync'
import { stripHtml } from '../lib/utils'
import { toast, ToastHost } from '../lib/toast'
import UpdateBanner from './UpdateBanner'
import AddSheet from './AddSheet'
import type { Theme } from '../App'

const NAV = [
  { to: '/', Icon: Home, label: 'الرئيسية' },
  { to: '/sections', Icon: FolderKanban, label: 'الأقسام' },
  { to: '/search', Icon: Search, label: 'البحث' },
  { to: '/review', Icon: Repeat2, label: 'المراجعة' },
  { to: '/inbox', Icon: Inbox, label: 'صندوق القراءة' },
]
const NAV2 = [
  { to: '/quotes', Icon: Quote, label: 'الاقتباسات' },
  { to: '/references', Icon: BookMarked, label: 'المراجع' },
  { to: '/graph', Icon: Share2, label: 'الخريطة المعرفية' },
  { to: '/templates', Icon: LayoutTemplate, label: 'القوالب' },
  { to: '/timeline', Icon: Clock, label: 'الخط الزمني' },
  { to: '/dashboard', Icon: BarChart3, label: 'الإحصائيات' },
  { to: '/settings', Icon: Settings, label: 'الإعدادات' },
]

const SYNC_UI: Record<SyncStatus, { Icon: any; label: string }> = {
  off: { Icon: CloudOff, label: 'بدون مزامنة' },
  idle: { Icon: Cloud, label: 'متزامن' },
  syncing: { Icon: RefreshCw, label: 'جارٍ المزامنة…' },
  error: { Icon: AlertTriangle, label: 'خطأ بالمزامنة' },
}

export default function Layout({ children, theme, setTheme, user }: {
  children: ReactNode; theme: Theme; setTheme: (t: Theme) => void; user: any
}) {
  const [open, setOpen] = useState(false)
  const [fab, setFab] = useState(false)
  const [sync, setSync] = useState<SyncStatus>('off')
  const nav = useNavigate()
  const loc = useLocation()
  const navType = useNavigationType()
  const mainRef = useRef<HTMLDivElement>(null)
  const dueCount = useLiveQuery(async () => {
    return db.notes.filter((n) => !n.deleted && !!n.srs && n.srs!.due <= Date.now()).count()
  }, [], 0)

  useEffect(() => { onSyncStatus((s) => setSync(s)) }, [])
  useEffect(() => { setOpen(false); setFab(false) }, [loc.pathname])

  // Online/offline awareness + count of local changes waiting to sync
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  const pendingCount = useLiveQuery(async () => {
    let n = 0
    for (const t of SYNC_TABLES) n += await (db as any)[t].where('dirty').equals(1).count()
    return n
  }, [], 0)

  // One-time toast after a successful in-app update
  useEffect(() => {
    if (sessionStorage.getItem('mk-updated')) {
      sessionStorage.removeItem('mk-updated')
      toast('تم تحديث التطبيق بنجاح', 'success')
    }
  }, [])

  // Scroll restoration: back/forward returns to the saved position, new pages start at top
  useLayoutEffect(() => {
    const el = mainRef.current
    if (!el) return
    if (navType === 'POP') el.scrollTop = Number(sessionStorage.getItem('scroll:' + loc.pathname) || 0)
    else el.scrollTop = 0
  }, [loc.pathname, navType])
  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const fn = () => sessionStorage.setItem('scroll:' + loc.pathname, String(el.scrollTop))
    el.addEventListener('scroll', fn, { passive: true })
    return () => el.removeEventListener('scroll', fn)
  }, [loc.pathname])

  async function newNote(contentHTML = '') {
    const id = await save('notes', {
      title: '', description: '', contentHTML, contentText: stripHtml(contentHTML),
      sectionId: null, folderId: null, tags: [], keywords: [], refIds: [], links: [],
      color: null, pinned: 0, favorite: 0, archived: 0, srs: null,
    } as any)
    nav(`/note/${id}`)
  }

  async function pasteNote() {
    try {
      const text = await navigator.clipboard.readText()
      await newNote(`<p>${text.replace(/\n/g, '</p><p>')}</p>`)
    } catch {
      alert('تعذر قراءة الحافظة — الصق النص داخل ملاحظة جديدة')
      newNote()
    }
  }

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : SunMoon
  const SyncIcon = SYNC_UI[sync].Icon

  return (
    <div className={`app ${open ? 'drawer-open' : ''}`}>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <img src="./icon.svg" alt="" /> مكتبتي
        </div>
        {NAV.map(({ to, Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `navlink ${isActive ? 'active' : ''}`} end={to === '/'}>
            <Icon size={18} strokeWidth={1.9} /> {label}
            {to === '/review' && dueCount ? <span className="chip on" style={{ marginInlineStart: 'auto' }}>{dueCount}</span> : null}
          </NavLink>
        ))}
        <div className="nav-section-title">المكتبة</div>
        {NAV2.map(({ to, Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `navlink ${isActive ? 'active' : ''}`}>
            <Icon size={18} strokeWidth={1.9} /> {label}
          </NavLink>
        ))}
        <div style={{ marginTop: 'auto', padding: '12px 12px 4px', fontSize: 12, color: 'var(--text-3)' }}>
          {/* the sync chip appears only when something needs attention */}
          {sync !== 'off' && (!online || sync === 'error' || sync === 'syncing' || pendingCount > 0) && (
            <button className="btn ghost sm" onClick={() => syncNow()} title="مزامنة الآن">
              {!online ? (
                <><CloudOff size={14} style={{ color: 'var(--danger)' }} /> بدون إنترنت — يعمل محليًا</>
              ) : sync === 'error' ? (
                <><AlertTriangle size={14} style={{ color: 'var(--danger)' }} /> خطأ بالمزامنة — أعد المحاولة</>
              ) : sync === 'syncing' ? (
                <><RefreshCw size={14} className="spin" /> جارٍ المزامنة…</>
              ) : (
                <><SyncIcon size={14} style={{ color: 'var(--warning)' }} /> {pendingCount} تغيير بانتظار المزامنة</>
              )}
            </button>
          )}
          <div style={{ marginTop: 6 }}>
            <button
              className="btn ghost sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'auto' : 'dark')}
            >
              <ThemeIcon size={14} /> {theme === 'dark' ? 'داكن' : theme === 'light' ? 'فاتح' : 'تلقائي'}
            </button>
          </div>
          {user && <div style={{ marginTop: 6, padding: '0 6px' }}>{user.email}</div>}
        </div>
      </aside>

      <div className="main" ref={mainRef}>
        <div className="topbar">
          <button className="btn ghost menu-btn" onClick={() => setOpen(!open)}><Menu size={19} /></button>
          <div style={{ flex: 1 }} />
          <button className="btn sm" onClick={() => nav('/search')}><Search size={15} /> بحث</button>
          <button className="btn primary sm" onClick={() => setFab(true)}><Plus size={15} /> إضافة</button>
        </div>
        {/* Back/forward keeps the page still (no replayed animation) — feels native */}
        <div className={navType === 'POP' ? 'content' : 'content page-anim'} key={loc.pathname}>{children}</div>
      </div>

      {/* Add to library: opens the content-type picker */}
      {fab && <AddSheet onClose={() => setFab(false)} />}
      <button className="fab" onClick={() => setFab(true)} title="أضف إلى مكتبتك"><Plus size={24} /></button>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        {[...NAV.slice(0, 4), NAV2[NAV2.length - 1]].map(({ to, Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')} end={to === '/'}>
            <span className="ic"><Icon size={20} strokeWidth={1.9} /></span> {label}
          </NavLink>
        ))}
      </nav>

      {open && <div className="modal-overlay" style={{ zIndex: 80 }} onClick={() => setOpen(false)} />}
      <UpdateBanner />
      <ToastHost />
    </div>
  )
}

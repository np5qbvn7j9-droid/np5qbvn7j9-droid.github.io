import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { search, type SearchHit } from '../lib/search'
import { CONTENT_TYPES, typeInfo } from '../lib/contentTypes'
import EmptyState from '../components/EmptyState'

const KIND_LABEL = { note: '📝 ملاحظة', quote: '❝ اقتباس', reference: '📚 مرجع' }
const KIND_LINK = { note: '/note/', quote: '/quotes?q=', reference: '/references?q=' }

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const typeKey = params.get('type') || ''
  const [q, setQ] = useState(params.get('q') || '')
  const [hits, setHits] = useState<SearchHit[] | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const query = params.get('q') || ''
    const t = params.get('type') || ''
    setQ(query)
    if (!query.trim() && !t) { setHits(null); return }
    setBusy(true)
    search(query, t || undefined).then((r) => { setHits(r); setBusy(false) })
  }, [params])

  const setType = (t: string) => setParams(t ? (q.trim() ? { q, type: t } : { type: t }) : (q.trim() ? { q } : {}))

  return (
    <div>
      <h1 className="page-title">البحث في مكتبتك</h1>
      <p className="page-sub">
        ابحث في كل شيء — يفهم عبارات مثل «القصائد»، «كلمات عن السفر»، «يومياتي هذا الشهر»
      </p>
      <form className="search-hero" onSubmit={(e) => { e.preventDefault(); setParams(q.trim() ? (typeKey ? { q, type: typeKey } : { q }) : (typeKey ? { type: typeKey } : {})) }}>
        <span>🔍</span>
        <input autoFocus placeholder="اكتب سؤالك أو كلمات البحث…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn primary sm" type="submit">بحث</button>
      </form>

      {/* Browse the library by content type */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
        <button className={`chip ${!typeKey ? 'on' : ''}`} onClick={() => setType('')}>الكل</button>
        {CONTENT_TYPES.map((t) => (
          <button key={t.key} className={`chip ${typeKey === t.key ? 'on' : ''}`} onClick={() => setType(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {busy && <div className="empty">جارٍ البحث…</div>}
      {hits && !busy && (
        hits.length === 0 ? (
          <EmptyState icon="🔎" text={typeKey ? `لا يوجد محتوى من نوع «${typeInfo(typeKey).label}» بعد` : 'لا توجد نتائج — جرّب كلمات أخرى'} />
        ) : (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
              {typeKey ? `${typeInfo(typeKey).icon} ${typeInfo(typeKey).label} — ` : ''}{hits.length} نتيجة
            </div>
            {hits.map((h) => (
              <Link key={h.id} to={h.kind === 'note' ? KIND_LINK.note + h.rawId : KIND_LINK[h.kind] + encodeURIComponent(h.title)} style={{ color: 'inherit' }}>
                <div className="card clickable" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>
                    {h.kind === 'note' ? `${typeInfo(h.ntype).icon} ${typeInfo(h.ntype).label}` : KIND_LABEL[h.kind]}
                  </span>
                  <b style={{ fontSize: 14 }}>{h.title}</b>
                </div>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  )
}

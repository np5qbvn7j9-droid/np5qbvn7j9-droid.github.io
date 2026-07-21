// Content types turn the app from "notes" into a knowledge library.
// Every entry has a `type`; each type carries an icon, a label, and a starter
// template (structured HTML with the fields that type usually needs).

export interface ContentType {
  key: string
  label: string
  icon: string // emoji (content uses emoji; chrome/controls use Lucide)
  starter: string // pre-filled editor HTML
}

export const CONTENT_TYPES: ContentType[] = [
  { key: 'note', label: 'ملاحظة', icon: '📝', starter: '' },
  {
    key: 'quote', label: 'اقتباس', icon: '❝',
    starter: '<blockquote><p></p></blockquote><p><strong>القائل:</strong> </p><p><strong>المصدر:</strong> </p>',
  },
  {
    key: 'word', label: 'كلمة جديدة', icon: '🔤',
    starter: '<p><strong>النطق:</strong> </p><p><strong>المعنى:</strong> </p><h3>أمثلة</h3><ul><li></li></ul><p><strong>مرادفات:</strong> </p>',
  },
  {
    key: 'poem', label: 'قصيدة', icon: '🪶',
    starter: '<p><strong>الشاعر:</strong> </p><p><strong>البحر/المناسبة:</strong> </p><h3>الأبيات</h3><p></p>',
  },
  {
    key: 'hadith', label: 'حديث', icon: '🕌',
    starter: '<blockquote><p></p></blockquote><p><strong>الراوي:</strong> </p><p><strong>التخريج/الدرجة:</strong> </p><h3>الشرح والفائدة</h3><p></p>',
  },
  {
    key: 'ayah', label: 'آية', icon: '📖',
    starter: '<blockquote><p></p></blockquote><p><strong>السورة:</strong> </p><p><strong>رقم الآية:</strong> </p><h3>التفسير والفائدة</h3><p></p>',
  },
  {
    key: 'book', label: 'ملخص كتاب', icon: '📚',
    starter: '<p><strong>المؤلف:</strong> </p><h3>الفكرة الرئيسية</h3><p></p><h3>أهم النقاط</h3><ul><li></li></ul><h3>اقتباسات</h3><blockquote><p></p></blockquote><h3>ما سأطبقه</h3><ul><li></li></ul>',
  },
  {
    key: 'video', label: 'ملخص فيديو', icon: '🎬',
    starter: '<p><strong>المصدر/الرابط:</strong> </p><p><strong>القناة/المقدم:</strong> </p><h3>أهم النقاط</h3><ul><li></li></ul><h3>الخلاصة</h3><p></p>',
  },
  {
    key: 'article', label: 'مقال', icon: '📰',
    starter: '<p><strong>الكاتب/المصدر:</strong> </p><p><strong>الرابط:</strong> </p><h3>الملخص</h3><p></p><h3>اقتباسات</h3><blockquote><p></p></blockquote>',
  },
  {
    key: 'idea', label: 'فكرة', icon: '💡',
    starter: '<h3>الفكرة</h3><p></p><h3>لماذا؟</h3><p></p><h3>خطوات محتملة</h3><ul><li></li></ul>',
  },
  {
    key: 'journal', label: 'يومية', icon: '📔',
    starter: '<p></p>',
  },
  {
    key: 'question', label: 'سؤال', icon: '❓',
    starter: '<h3>السؤال</h3><p></p><h3>الجواب</h3><p></p><h3>مصادر</h3><ul><li></li></ul>',
  },
  {
    key: 'info', label: 'معلومة عامة', icon: '💬',
    starter: '<p></p><p><strong>المصدر:</strong> </p>',
  },
  {
    key: 'reference', label: 'مرجع', icon: '🔖',
    starter: '<p><strong>النوع (كتاب/موقع/بحث):</strong> </p><p><strong>المؤلف/الجهة:</strong> </p><p><strong>الرابط:</strong> </p><h3>ملاحظات</h3><p></p>',
  },
  {
    key: 'project', label: 'مشروع', icon: '🚀',
    starter: '<h3>الفكرة</h3><p></p><h3>الهدف</h3><p></p><h3>المهام</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"></li></ul>',
  },
  {
    key: 'checklist', label: 'قائمة مراجعة', icon: '☑️',
    starter: '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"></li><li data-type="taskItem" data-checked="false"></li></ul>',
  },
  {
    key: 'goal', label: 'هدف', icon: '🎯',
    starter: '<h3>الهدف</h3><p></p><p><strong>الموعد المستهدف:</strong> </p><h3>الخطوات</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"></li></ul><h3>مقياس النجاح</h3><p></p>',
  },
  {
    key: 'experience', label: 'تجربة شخصية', icon: '🌟',
    starter: '<h3>ماذا حدث؟</h3><p></p><h3>ما الذي تعلمته؟</h3><p></p>',
  },
]

const MAP: Record<string, ContentType> = Object.fromEntries(CONTENT_TYPES.map((t) => [t.key, t]))
export const typeInfo = (key?: string | null): ContentType => MAP[key || 'note'] || MAP.note

import type { Priority, TaskStatus, UserRole } from '@/types'

export const WORKSPACE_COLORS = [
  '#534AB7', '#0F6E56', '#993C1D', '#185FA5',
  '#854F0B', '#3B6D11', '#993556', '#1A6B7A',
  '#5A3491', '#2D6A3F',
]

export const LABEL_COLORS = [
  '#61BD4F', '#F2D600', '#FF9F1A', '#EB5A46',
  '#C377E0', '#0079BF', '#00C2E0', '#51E898',
  '#FF78CB', '#344563',
]

export const DEFAULT_LABEL_NAMES = [
  'Acil', 'Takip', 'Onay Bekliyor', 'Bilgi', 'Toplantı',
  'Belge', 'Dış Paydaş', 'Yasal', 'Bütçe', 'Teknik',
]

export const STATUS_LABELS: Record<TaskStatus, string> = {
  bekleyen: 'Bekleyen',
  devam_ediyor: 'Devam Ediyor',
  incelemede: 'İncelemede',
  tamamlandi: 'Tamamlandı',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  dusuk: 'Düşük',
  orta: 'Orta',
  yuksek: 'Yüksek',
  acil: 'Acil',
}

export const PRIORITY_COLORS: Record<Priority, { bg: string; text: string }> = {
  dusuk:   { bg: '#EAF3DE', text: '#3B6D11' },
  orta:    { bg: '#FAEEDA', text: '#854F0B' },
  yuksek:  { bg: '#FAECE7', text: '#993C1D' },
  acil:    { bg: '#FCEBEB', text: '#A32D2D' },
}

export const ROLE_LABELS: Record<UserRole, string> = {
  yk_baskani:       'YK Başkanı',
  yk_uyesi:         'YK Üyesi',
  komisyon_baskani: 'Komisyon Başkanı',
  calisan:          'Çalışan',
  temsilci:         'Temsilci',
}

export const CAT_LABELS: Record<string, string> = {
  yk:          'YÖNETİM',
  komisyon:    'KOMİSYONLAR',
  temsilcilik: 'TEMSİLCİLİKLER',
  birim:       'BİRİMLER',
}

export const CAT_ORDER = ['yk', 'komisyon', 'temsilcilik', 'birim']

export function lightenColor(hex: string, amount = 0.82): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${Math.round(r + (255 - r) * amount)},${Math.round(g + (255 - g) * amount)},${Math.round(b + (255 - b) * amount)})`
}

export function formatDate(s: string | null): string {
  if (!s) return ''
  return new Date(s).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

export function canAccessWorkspace(
  userRole: UserRole,
  userId: string,
  wsAccessRoles: string[],
  wsAccessUserIds: string[]
): boolean {
  if (userRole === 'yk_baskani') return true
  if (wsAccessUserIds.includes(userId)) return true
  if (wsAccessRoles.includes(userRole)) return true
  return false
}

export function canEditWorkspace(
  userRole: UserRole,
  wsAccessRoles: string[]
): boolean {
  if (userRole === 'yk_baskani' || userRole === 'yk_uyesi') return true
  return wsAccessRoles.includes(userRole)
}

// Cover SVG patterns
export const COVER_PATTERNS = [
  (bg: string, ac: string) => `
    <svg viewBox="0 0 700 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:120px;display:block">
      <rect width="700" height="120" fill="${bg}"/>
      <circle cx="80" cy="60" r="90" fill="${ac}" opacity=".14"/>
      <circle cx="620" cy="20" r="70" fill="${ac}" opacity=".1"/>
      <rect x="200" y="38" width="260" height="9" rx="4" fill="${ac}" opacity=".2"/>
      <rect x="200" y="56" width="170" height="7" rx="3" fill="${ac}" opacity=".13"/>
      <rect x="200" y="71" width="210" height="6" rx="3" fill="${ac}" opacity=".1"/>
    </svg>`,
  (bg: string, ac: string) => `
    <svg viewBox="0 0 700 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:120px;display:block">
      <rect width="700" height="120" fill="${bg}"/>
      <polygon points="0,120 220,0 440,120" fill="${ac}" opacity=".12"/>
      <polygon points="220,120 550,0 800,120" fill="${ac}" opacity=".08"/>
      <circle cx="590" cy="90" r="80" fill="${ac}" opacity=".1"/>
    </svg>`,
  (bg: string, ac: string) => `
    <svg viewBox="0 0 700 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:120px;display:block">
      <rect width="700" height="120" fill="${bg}"/>
      <rect x="0" y="0" width="14" height="120" fill="${ac}" opacity=".22"/>
      <rect x="22" y="0" width="7" height="120" fill="${ac}" opacity=".13"/>
      <rect x="35" y="0" width="4" height="120" fill="${ac}" opacity=".08"/>
      <circle cx="460" cy="60" r="110" fill="${ac}" opacity=".1"/>
    </svg>`,
  (bg: string, ac: string) => `
    <svg viewBox="0 0 700 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:120px;display:block">
      <rect width="700" height="120" fill="${bg}"/>
      <rect x="30" y="20" width="90" height="80" rx="12" fill="${ac}" opacity=".13"/>
      <rect x="140" y="32" width="60" height="56" rx="30" fill="${ac}" opacity=".12"/>
      <rect x="222" y="16" width="75" height="75" rx="8" fill="${ac}" opacity=".1"/>
      <rect x="320" y="28" width="95" height="60" rx="10" fill="${ac}" opacity=".1"/>
      <circle cx="560" cy="60" r="70" fill="${ac}" opacity=".08"/>
    </svg>`,
]

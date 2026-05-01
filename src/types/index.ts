export type UserRole =
  | 'yk_baskani'
  | 'yk_uyesi'
  | 'komisyon_baskani'
  | 'calisan'
  | 'temsilci'

export interface Profile {
  id: string
  email: string
  full_name: string
  initials: string
  role: UserRole
  workspace_ids: string[]
  avatar_url?: string
  // YK üyesi alanları
  sicil_no?: string
  gorev?: string
  dogum_tarihi?: string
  telefon?: string
  sosyal_medya?: {
    twitter?: string
    linkedin?: string
    instagram?: string
    facebook?: string
  }
  web_sayfasi?: string
  kimdir?: string
  created_at: string
}

export interface Workspace {
  id: string
  name: string
  category: 'yk' | 'komisyon' | 'temsilcilik' | 'birim'
  color: string
  access_roles: UserRole[]
  access_user_ids: string[]
  boards: string[]
  created_by: string
  created_at: string
}

export interface Label {
  id: number
  workspace_id: string
  name: string
  color: string
  position: number
}

export type TaskStatus = string
export type Priority = 'dusuk' | 'orta' | 'yuksek' | 'acil'

export interface DriveLink {
  name: string
  url: string
}

export interface Comment {
  id: string
  author_id: string
  author_name: string
  author_initials: string
  text: string
  created_at: string
}

export interface TaskAssignee {
  id: string
  full_name: string
  initials: string
}

export interface Task {
  id: string
  workspace_id: string
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  assignees: TaskAssignee[]
  start_date: string | null
  end_date: string | null
  board: string | null
  label_ids: number[]
  drive_links: DriveLink[]
  comments: Comment[]
  cover_pattern: number
  cover_image_url?: string | null
  position: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  workspace_id: string
  workspace_name: string
  text: string
  is_read: boolean
  created_at: string
}

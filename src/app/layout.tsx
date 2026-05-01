import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Meslek Odası — Görev Yönetim Sistemi',
  description: 'Meslek odanız için çalışma alanı bazlı görev yönetim platformu',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          {children}
          <Toaster position="bottom-right" toastOptions={{ style: { fontSize: 13 } }} />
        </AuthProvider>
      </body>
    </html>
  )
}

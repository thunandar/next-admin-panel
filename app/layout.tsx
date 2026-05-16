import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Nexus Admin', template: '%s | Nexus Admin' },
  description: 'Product management dashboard',
  icons: { icon: '/icon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistSans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{const t=localStorage.getItem('admin-theme');if(t==='dark')document.documentElement.classList.add('dark')}catch{}` }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3500,
                style: {
                  background: 'var(--bg-elev)',
                  color: 'var(--ink)',
                  border: '1px solid var(--line)',
                  borderRadius: '10px',
                  fontSize: '14px',
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

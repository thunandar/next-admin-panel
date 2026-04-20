'use client'

import { usePathname } from 'next/navigation'
import { Moon, Sun, Menu } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'

const pageTitles: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/products': 'Products',
  '/admin/products/new': 'New Product',
  '/admin/users': 'Users',
  '/admin/orders': 'Orders',
  '/admin/audit-logs': 'Audit Logs',
  '/admin/profile': 'Profile',
}

function getTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname]
  if (pathname.match(/\/admin\/products\/\d+\/edit/)) return 'Edit Product'
  if (pathname.match(/\/admin\/products\/\d+/)) return 'Product Details'
  if (pathname.match(/\/admin\/users\/\d+/)) return 'User Details'
  return 'Dashboard'
}

interface HeaderProps {
  onMenuClick?: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-20 bg-white dark:bg-[#1e2732] border-b border-gray-100 dark:border-[#38444d] px-4 lg:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            aria-label="Open navigation menu"
            className="lg:hidden p-2 rounded-lg text-gray-500 dark:text-[#8b98a5] hover:bg-gray-100 dark:hover:bg-[#253341] transition-colors"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{getTitle(pathname)}</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-lg text-gray-500 dark:text-[#8b98a5] hover:bg-gray-100 dark:hover:bg-[#253341] transition-colors"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                <p className="text-xs text-gray-500 dark:text-[#8b98a5] capitalize">{user.role}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

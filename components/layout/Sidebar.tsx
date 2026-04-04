'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, Users, User, LogOut, Box, ShoppingCart, ClipboardList, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/users', label: 'Users', icon: Users, adminOnly: true },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart, adminOnly: true },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: ClipboardList, adminOnly: true },
]

const bottomItems = [
  { href: '/admin/profile', label: 'Profile', icon: User },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const isActive = (href: string) =>
    href === '/admin/dashboard' ? pathname === '/admin/dashboard' : pathname.startsWith(href)

  const isPrivileged = user?.role === 'admin' || user?.role === 'super_admin'
  const visibleNav = navItems.filter((item) => !item.adminOnly || isPrivileged)

  const handleNavClick = () => {
    onClose?.()
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 w-64 bg-white dark:bg-[#1e2732] border-r border-gray-200 dark:border-[#38444d] flex flex-col z-30 transition-transform duration-300',
        'lg:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-[#38444d]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Box size={16} className="text-white" />
          </div>
          <span className="text-gray-900 dark:text-white font-semibold text-lg tracking-tight">ProductHub</span>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#253341] transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-3 py-2 text-xs font-semibold text-gray-400 dark:text-[#8b98a5] uppercase tracking-wider">
          Navigation
        </p>
        {visibleNav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={handleNavClick}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive(href)
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-[#8b98a5] hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#253341]',
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-gray-200 dark:border-[#38444d] space-y-0.5">
        {bottomItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={handleNavClick}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive(href)
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-[#8b98a5] hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#253341]',
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-[#8b98a5] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>

      {/* User Info */}
      {user && (
        <div className="px-4 py-4 border-t border-gray-200 dark:border-[#38444d]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.name}</p>
              <p className="text-xs text-gray-500 dark:text-[#8b98a5] capitalize">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

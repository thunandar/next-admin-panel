'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { I } from '@/components/ui/Icons';
import { IconBtn } from '@/components/ui/Button';
import Divider from '@/components/ui/Divider';
import { ReactNode } from 'react';

type Crumb = { label: string; href?: string };

function crumbsFor(pathname: string): Crumb[] {
  const products: Crumb = { label: 'Products', href: '/admin/products' };

  if (pathname.startsWith('/admin/dashboard')) return [{ label: 'Dashboard' }];
  if (pathname.match(/\/admin\/products\/new/)) return [products, { label: 'New' }];
  if (pathname.match(/\/admin\/products\/\d+\/edit/)) return [products, { label: 'Edit' }];
  if (pathname.match(/\/admin\/products\/\d+/)) return [products, { label: 'Detail' }];
  if (pathname.startsWith('/admin/products')) return [{ label: 'Products' }];
  if (pathname.startsWith('/admin/categories')) return [{ label: 'Categories' }];
  if (pathname.startsWith('/admin/orders')) return [{ label: 'Orders' }];
  if (pathname.startsWith('/admin/users')) return [{ label: 'Users' }];
  if (pathname.startsWith('/admin/audit-logs')) return [{ label: 'Audit log' }];
  if (pathname.startsWith('/admin/reviews')) return [{ label: 'Reviews' }];
  if (pathname.startsWith('/admin/profile')) return [{ label: 'Profile' }];
  return [];
}

interface HeaderProps {
  onMenuClick?: () => void;
  right?: ReactNode;
}

export default function Header({ onMenuClick, right }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const crumbs = crumbsFor(pathname);

  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between"
      style={{
        background: 'var(--bg)',
        borderBottom: '1px solid var(--line)',
        height: 56,
        padding: '0 28px',
        gap: 16,
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          aria-label="Toggle navigation menu"
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--ink-3)', background: 'transparent', border: 'none', cursor: 'pointer' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-muted)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
        >
          <I.menu size={18} />
        </button>

        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2"
          style={{ fontSize: 13.5, color: 'var(--ink-3)' }}
        >
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <span key={i} className="inline-flex items-center gap-2">
                {i > 0 && <I.chev_r size={12} style={{ color: 'var(--ink-4)' }} />}
                {isLast || !c.href ? (
                  <span
                    aria-current={isLast ? 'page' : undefined}
                    style={{
                      color: isLast ? 'var(--ink)' : 'var(--ink-3)',
                      fontWeight: isLast ? 500 : 400,
                    }}
                  >
                    {c.label}
                  </span>
                ) : (
                  <Link
                    href={c.href}
                    style={{
                      color: 'var(--ink-3)',
                      fontWeight: 400,
                      textDecoration: 'none',
                      transition: 'color 120ms',
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--ink)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--ink-3)')}
                  >
                    {c.label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {right}
        <IconBtn
          icon={theme === 'dark' ? <I.sun /> : <I.moon />}
          variant="ghost"
          size={32}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={toggleTheme}
        />
        <IconBtn icon={<I.bell />} variant="ghost" size={32} aria-label="Notifications" />
        <Divider vertical style={{ height: 20, margin: '0 4px' }} />
        <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>v3.2.1</span>
      </div>
    </header>
  );
}

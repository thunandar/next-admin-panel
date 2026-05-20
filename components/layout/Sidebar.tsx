'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { I } from '@/components/ui/Icons';
import Avatar from '@/components/ui/Avatar';
import { cloneElement, useEffect, useRef, useState, type ReactElement } from 'react';

type NavItem = {
  href: string;
  label: string;
  icon: ReactElement;
  count?: number;
  adminOnly?: boolean;
};

const PRIMARY: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: <I.home /> },
  { href: '/admin/insights', label: 'Insights', icon: <I.trend_u />, adminOnly: true },
  { href: '/admin/products', label: 'Products', icon: <I.box /> },
  { href: '/admin/categories', label: 'Categories', icon: <I.tag />, adminOnly: true },
  { href: '/admin/vendors', label: 'Vendors', icon: <I.store />, adminOnly: true },
  { href: '/admin/orders', label: 'Orders', icon: <I.bag />, adminOnly: true },
  { href: '/admin/refunds', label: 'Refunds', icon: <I.refresh />, adminOnly: true },
  { href: '/admin/abandoned-carts', label: 'Abandoned carts', icon: <I.cart />, adminOnly: true },
  { href: '/admin/users', label: 'Users', icon: <I.users />, adminOnly: true },
  { href: '/admin/reviews', label: 'Reviews', icon: <I.star />, adminOnly: true },
  { href: '/admin/journal', label: 'Journal', icon: <I.log />, adminOnly: true },
  { href: '/admin/settings', label: 'Settings', icon: <I.settings />, adminOnly: true },
  { href: '/admin/audit-logs', label: 'Audit log', icon: <I.log />, adminOnly: true },
];

const ACCOUNT: NavItem[] = [
  { href: '/admin/profile', label: 'Profile', icon: <I.user /> },
];

interface SidebarProps {
  isOpen?: boolean;
  collapsed?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, collapsed = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const isActive = (href: string) =>
    href === '/admin/dashboard' ? pathname === '/admin/dashboard' : pathname.startsWith(href);

  const isPrivileged = user?.role === 'admin' || user?.role === 'super_admin';
  const q = query.trim().toLowerCase();
  const matches = (i: NavItem) => !q || i.label.toLowerCase().includes(q);
  const primaryVisible = PRIMARY.filter((i) => (!i.adminOnly || isPrivileged) && matches(i));
  const accountVisible = ACCOUNT.filter(matches);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!userMenuRef.current?.contains(e.target as Node)) setUserMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [userMenuOpen]);

  const renderItem = (item: NavItem) => {
    const on = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={cn('flex items-center gap-2.5 rounded-lg transition-colors')}
        style={{
          height: 34,
          padding: '0 10px',
          background: on ? 'var(--bg-elev)' : 'transparent',
          color: on ? 'var(--ink)' : 'var(--ink-3)',
          fontSize: 13.5,
          fontWeight: on ? 500 : 400,
          letterSpacing: -0.1,
          boxShadow: on ? 'var(--shadow-1)' : 'none',
        }}
        onMouseEnter={(e) => {
          if (!on) (e.currentTarget as HTMLAnchorElement).style.color = 'var(--ink)';
        }}
        onMouseLeave={(e) => {
          if (!on) (e.currentTarget as HTMLAnchorElement).style.color = 'var(--ink-3)';
        }}
      >
        <span className="inline-flex">
          {cloneElement(item.icon as ReactElement<{ size?: number }>, { size: 16 })}
        </span>
        <span className="flex-1 text-left">{item.label}</span>
        {item.count !== undefined && (
          <span
            className="t-num"
            style={{ fontSize: 11, color: 'var(--ink-4)' }}
          >
            {item.count}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 w-[232px] flex flex-col z-30 transition-transform duration-300',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        collapsed ? 'lg:-translate-x-full' : 'lg:translate-x-0',
      )}
      style={{
        background: 'var(--bg-muted)',
        borderRight: '1px solid var(--line)',
        padding: '14px 10px 14px',
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5" style={{ padding: '4px 8px 16px' }}>
        <div
          className="rounded-lg flex items-center justify-center"
          style={{
            width: 28,
            height: 28,
            background: 'var(--ink)',
            color: 'var(--bg)',
            fontFamily: 'var(--serif)',
            fontStyle: 'italic',
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          n
        </div>
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>Nexus</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>nexus.shop · Live</div>
        </div>
      </div>

      {/* Search — inline input, filters the nav */}
      <label
        className="flex items-center gap-2 w-full"
        style={{
          height: 32,
          padding: '0 10px',
          margin: '0 0 14px',
          background: 'var(--bg-elev)',
          border: '1px solid var(--line)',
          borderRadius: 8,
          color: 'var(--ink-3)',
          cursor: 'text',
        }}
      >
        <I.search size={14} />
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          style={{
            flex: 1,
            background: 'transparent',
            border: 0,
            outline: 'none',
            fontSize: 12.5,
            color: 'var(--ink)',
            minWidth: 0,
          }}
        />
        <span
          style={{
            fontSize: 10.5,
            padding: '1px 5px',
            borderRadius: 4,
            border: '1px solid var(--line-2)',
            color: 'var(--ink-4)',
            fontFamily: 'var(--mono)',
          }}
        >
          ⌘K
        </span>
      </label>

      <div className="flex flex-col gap-px">{primaryVisible.map(renderItem)}</div>

      {accountVisible.length > 0 && (
        <div className="t-micro" style={{ color: 'var(--ink-4)', padding: '20px 10px 8px' }}>
          Account
        </div>
      )}
      <div className="flex flex-col gap-px">{accountVisible.map(renderItem)}</div>

      {q && primaryVisible.length === 0 && accountVisible.length === 0 && (
        <div style={{ padding: '12px 10px', fontSize: 12.5, color: 'var(--ink-4)' }}>
          No matches.
        </div>
      )}

      <button
        type="button"
        onClick={logout}
        className="flex items-center gap-2.5 rounded-lg transition-colors"
        style={{
          height: 34,
          padding: '0 10px',
          background: 'transparent',
          color: 'var(--ink-3)',
          fontSize: 13.5,
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          marginTop: 1,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)';
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--danger-tint)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-3)';
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        }}
      >
        <I.x size={16} />
        <span className="flex-1">Sign out</span>
      </button>

      <div className="flex-1" />

      {/* Storefront status */}
      <div
        style={{
          padding: 12,
          background: 'var(--bg-elev)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          marginBottom: 10,
        }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <span
            style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--success)' }}
          />
          <span className="t-micro" style={{ color: 'var(--ink-3)' }}>
            Storefront
          </span>
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: 'var(--ink-2)',
            lineHeight: 1.4,
            marginBottom: 8,
          }}
        >
          All systems normal.{' '}
          <span style={{ color: 'var(--ink)', fontWeight: 500 }}>234ms</span> avg response.
        </div>
        <a
          href={process.env.NEXT_PUBLIC_SHOP_URL || 'https://next-user-site.vercel.app/shop'}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-1.5"
          style={{
            width: '100%',
            height: 28,
            border: '1px solid var(--line-2)',
            borderRadius: 6,
            background: 'transparent',
            color: 'var(--ink-2)',
            fontSize: 12,
            textDecoration: 'none',
          }}
        >
          <I.external size={12} /> Open store
        </a>
      </div>

      {/* User chip */}
      {user && (
        <div ref={userMenuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 w-full"
            style={{
              padding: '8px 8px',
              borderRadius: 10,
              background: userMenuOpen ? 'var(--bg-elev)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Avatar name={user.name} src={user.avatarUrl ?? undefined} size={28} />
            <div className="flex-1 min-w-0">
              <div
                className="truncate"
                style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)' }}
              >
                {user.name}
              </div>
              <div
                className="truncate capitalize"
                style={{ fontSize: 11, color: 'var(--ink-3)' }}
              >
                {user.role.replace('_', ' ')}
              </div>
            </div>
            <span
              style={{
                display: 'inline-flex',
                color: 'var(--ink-3)',
                transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
            >
              <I.chev_d size={14} />
            </span>
          </button>

          <div
            role="menu"
            aria-hidden={!userMenuOpen}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              borderRadius: 10,
              boxShadow: 'var(--shadow-2, 0 8px 24px rgba(0,0,0,0.08))',
              padding: 4,
              zIndex: 40,
              opacity: userMenuOpen ? 1 : 0,
              transform: userMenuOpen ? 'translateY(0) scale(1)' : 'translateY(4px) scale(0.98)',
              transformOrigin: 'bottom center',
              pointerEvents: userMenuOpen ? 'auto' : 'none',
              visibility: userMenuOpen ? 'visible' : 'hidden',
              transition:
                'opacity 160ms ease, transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1), visibility 0s linear ' +
                (userMenuOpen ? '0s' : '180ms'),
            }}
          >
              <Link
                href="/admin/profile"
                role="menuitem"
                onClick={() => {
                  setUserMenuOpen(false);
                  onClose?.();
                }}
                className="flex items-center gap-2 rounded-md"
                style={{
                  height: 32,
                  padding: '0 8px',
                  fontSize: 13,
                  color: 'var(--ink-2)',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'var(--bg-elev)';
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--ink)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--ink-2)';
                }}
              >
                <I.user size={14} />
                <span>Profile</span>
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
                className="flex items-center gap-2 rounded-md w-full"
                style={{
                  height: 32,
                  padding: '0 8px',
                  fontSize: 13,
                  color: 'var(--ink-2)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--danger-tint)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-2)';
                }}
              >
                <I.x size={14} />
                <span>Sign out</span>
              </button>
            </div>
        </div>
      )}
    </aside>
  );
}

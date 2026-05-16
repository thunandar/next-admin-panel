'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import Sidebar from './Sidebar';
import Header from './Header';

const STORAGE_KEY = 'nexus.sidebarCollapsed';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') setDesktopCollapsed(true);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, desktopCollapsed ? '1' : '0');
    } catch {}
  }, [desktopCollapsed]);

  const handleMenuClick = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
      setDesktopCollapsed((c) => !c);
    } else {
      setMobileOpen(true);
    }
  };

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ background: 'rgba(22,20,15,0.5)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        isOpen={mobileOpen}
        collapsed={desktopCollapsed}
        onClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0" style={{ marginLeft: 0 }}>
        <div
          className={cn(
            'flex-1 flex flex-col min-w-0 transition-[padding] duration-300',
            desktopCollapsed ? 'lg:pl-0' : 'lg:pl-[232px]',
          )}
        >
          <Header onMenuClick={handleMenuClick} />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}

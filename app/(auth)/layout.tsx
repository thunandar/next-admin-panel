export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1fr_1.2fr]" style={{ background: 'var(--bg)' }}>
      <div className="flex flex-col justify-center" style={{ padding: '40px 40px' }}>
        <div className="w-full max-w-[480px] mx-auto">{children}</div>
      </div>

      <aside
        className="hidden lg:flex relative overflow-hidden"
        style={{
          background: 'var(--ink)',
          color: 'var(--bg)',
          padding: 60,
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div className="flex justify-between relative z-10">
          <span
            className="t-micro"
            style={{ color: 'var(--ink-4)' }}
          >
            Nexus · v3.2
          </span>
          <span className="t-micro" style={{ color: 'var(--ink-4)' }}>
            Issue 014
          </span>
        </div>

        <div className="relative z-10">
          <div
            style={{
              fontFamily: 'var(--serif)',
              fontStyle: 'italic',
              fontSize: 56,
              lineHeight: 1.05,
              color: 'var(--bg)',
            }}
          >
            &ldquo;Yesterday we fulfilled
            <br />
            more orders than any
            <br />
            day this quarter.&rdquo;
          </div>
          <div style={{ marginTop: 24, fontSize: 13, color: 'var(--ink-4)' }}>
            — Maison Brut · Nexus customer since 2024
          </div>
        </div>

        <div className="flex justify-between items-end relative z-10">
          <div style={{ fontSize: 12, color: 'var(--ink-4)', maxWidth: 280, lineHeight: 1.5 }}>
            12,800 merchants run their storefront on Nexus, from a one-person studio to a
            200-person brand.
          </div>
          <div className="flex gap-4" style={{ fontSize: 12, color: 'var(--ink-4)' }}>
            <span>About</span>
            <span>Privacy</span>
            <span>Status</span>
          </div>
        </div>

        {/* decorative */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            right: -120,
            top: -120,
            width: 380,
            height: 380,
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            right: -60,
            top: -60,
            width: 260,
            height: 260,
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            right: 80,
            top: 220,
            width: 14,
            height: 14,
            borderRadius: 999,
            background: 'var(--terracotta)',
          }}
        />
      </aside>
    </div>
  );
}

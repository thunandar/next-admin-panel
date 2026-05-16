import type { CSSProperties } from 'react';

export interface AvatarProps {
  name?: string;
  size?: number;
  src?: string | null;
  tone?: string;
  className?: string;
  style?: CSSProperties;
}

const PALETTE = ['#C26A47', '#6B7A57', '#6B4458', '#4F6B7A', '#C28D3A', '#8B6B47', '#4F6B3D'];

function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

function colorOf(name: string) {
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return PALETTE[hash % PALETTE.length];
}

export default function Avatar({ name = '', size = 32, src, tone, className, style }: AvatarProps) {
  const initials = initialsOf(name);
  const bg = tone || colorOf(name);
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: src ? `center/cover url(${src})` : bg,
        color: '#fff',
        fontSize: size * 0.4,
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        letterSpacing: -0.5,
        userSelect: 'none',
        ...style,
      }}
    >
      {!src && initials}
    </div>
  );
}

export { Avatar };

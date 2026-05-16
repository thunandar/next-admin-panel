import type { CSSProperties, ReactNode } from 'react';

export interface PlaceholderImgProps {
  label?: string;
  w?: number | string;
  h?: number | string;
  tone?: [string, string];
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

const PALETTES: [string, string][] = [
  ['#E8C99B', '#C26A47'],
  ['#DDE3D0', '#6B7A57'],
  ['#D8E2E8', '#4F6B7A'],
  ['#F2DCCC', '#C26A47'],
  ['#E5E1D6', '#A8A294'],
  ['#F5E6C8', '#C28D3A'],
];

function hashOf(s: string) {
  return [...s].reduce((a, c) => a + c.charCodeAt(0), 0);
}

export default function PlaceholderImg({
  label,
  w = '100%',
  h = 200,
  tone,
  className,
  style,
  children,
}: PlaceholderImgProps) {
  const [c1, c2] = (tone ?? PALETTES[hashOf(label || '') % PALETTES.length] ?? PALETTES[0]) as [string, string];
  return (
    <div
      className={className}
      style={{
        width: w,
        height: h,
        borderRadius: 12,
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${c1} 0%, ${c2} 120%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        color: 'rgba(255,255,255,0.85)',
        ...style,
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.25), transparent 60%)',
        }}
      />
      {children ??
        (label && (
          <div
            style={{
              position: 'relative',
              fontFamily: 'var(--serif)',
              fontStyle: 'italic',
              fontSize: 24,
              opacity: 0.85,
              mixBlendMode: 'overlay',
            }}
          >
            {label}
          </div>
        ))}
    </div>
  );
}

export { PlaceholderImg };

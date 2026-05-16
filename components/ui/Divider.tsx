import type { CSSProperties } from 'react';

export default function Divider({ vertical, style }: { vertical?: boolean; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: 'var(--line)',
        width: vertical ? 1 : '100%',
        height: vertical ? '100%' : 1,
        ...style,
      }}
    />
  );
}

export { Divider };

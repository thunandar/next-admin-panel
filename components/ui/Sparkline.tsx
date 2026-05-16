import type { CSSProperties } from 'react';

export interface SparklineProps {
  data: number[];
  color?: string;
  w?: number;
  h?: number;
  style?: CSSProperties;
}

export default function Sparkline({ data, color = 'var(--ink)', w = 80, h = 24, style }: SparklineProps) {
  if (!data?.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible', ...style }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export { Sparkline };

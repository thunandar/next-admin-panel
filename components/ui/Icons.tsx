import * as React from 'react';

type IconProps = {
  size?: number;
  stroke?: number;
  fill?: string;
  className?: string;
  style?: React.CSSProperties;
};

type IconComponent = (p: IconProps) => React.ReactElement;

const Icon = ({
  d,
  size = 18,
  stroke = 1.6,
  fill = 'none',
  children,
  className,
  style,
}: IconProps & { d?: string; children?: React.ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill={fill}
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle', ...style }}
  >
    {d ? <path d={d} /> : children}
  </svg>
);

export const I = {
  home: (p: IconProps) => <Icon {...p} d="M3 8l7-5 7 5v9a1 1 0 01-1 1h-3v-6H7v6H4a1 1 0 01-1-1V8z" />,
  grid: (p: IconProps) => (
    <Icon {...p}>
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="11" y="3" width="6" height="6" rx="1" />
      <rect x="3" y="11" width="6" height="6" rx="1" />
      <rect x="11" y="11" width="6" height="6" rx="1" />
    </Icon>
  ),
  box: (p: IconProps) => (
    <Icon {...p}>
      <path d="M3 6.5l7-3.5 7 3.5v7l-7 3.5-7-3.5v-7z" />
      <path d="M3 6.5l7 3.5 7-3.5M10 10v7" />
    </Icon>
  ),
  cart: (p: IconProps) => (
    <Icon {...p}>
      <path d="M2.5 3h2l1.5 10.5a1 1 0 001 .9h8.5a1 1 0 001-.83L17.5 6.5H6" />
      <circle cx="8" cy="17" r="1.2" />
      <circle cx="15" cy="17" r="1.2" />
    </Icon>
  ),
  bag: (p: IconProps) => (
    <Icon {...p}>
      <path d="M4 7h12l-1 10.5a1 1 0 01-1 .9H6a1 1 0 01-1-.9L4 7z" />
      <path d="M7 7V5a3 3 0 016 0v2" />
    </Icon>
  ),
  users: (p: IconProps) => (
    <Icon {...p}>
      <circle cx="7.5" cy="7" r="3" />
      <path d="M2 17a5.5 5.5 0 0111 0M14 5.5a2.5 2.5 0 010 5M18 17a4 4 0 00-3-3.87" />
    </Icon>
  ),
  user: (p: IconProps) => (
    <Icon {...p}>
      <circle cx="10" cy="7" r="3" />
      <path d="M3.5 17a6.5 6.5 0 0113 0" />
    </Icon>
  ),
  scroll: (p: IconProps) => (
    <Icon {...p}>
      <path d="M5 3h9l3 3v11H5z" />
      <path d="M14 3v3h3M8 9h6M8 12h6M8 15h4" />
    </Icon>
  ),
  heart: (p: IconProps) => <Icon {...p} d="M10 17s-6-3.6-6-8.2A3.5 3.5 0 0110 6a3.5 3.5 0 016 2.8c0 4.6-6 8.2-6 8.2z" />,
  heart_f: (p: IconProps) => <Icon {...p} fill="currentColor" d="M10 17s-6-3.6-6-8.2A3.5 3.5 0 0110 6a3.5 3.5 0 016 2.8c0 4.6-6 8.2-6 8.2z" />,
  search: (p: IconProps) => (
    <Icon {...p}>
      <circle cx="9" cy="9" r="5.5" />
      <path d="M13 13l3.5 3.5" />
    </Icon>
  ),
  bell: (p: IconProps) => <Icon {...p} d="M5 14V9a5 5 0 0110 0v5l1 2H4l1-2zM8 17a2 2 0 004 0" />,
  settings: (p: IconProps) => (
    <Icon {...p}>
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 1.5v2M10 16.5v2M3.5 10h-2M18.5 10h-2M5.4 5.4L4 4M16 16l-1.4-1.4M5.4 14.6L4 16M16 4l-1.4 1.4" />
    </Icon>
  ),
  plus: (p: IconProps) => <Icon {...p} d="M10 4v12M4 10h12" />,
  minus: (p: IconProps) => <Icon {...p} d="M4 10h12" />,
  check: (p: IconProps) => <Icon {...p} d="M4 10.5l3.5 3.5L16 6" />,
  x: (p: IconProps) => <Icon {...p} d="M5 5l10 10M15 5L5 15" />,
  edit: (p: IconProps) => <Icon {...p} d="M14 3l3 3-9 9H5v-3l9-9z" />,
  trash: (p: IconProps) => <Icon {...p} d="M3.5 5.5h13M8 5.5V4a1 1 0 011-1h2a1 1 0 011 1v1.5M5.5 5.5l1 11a1 1 0 001 .9h5a1 1 0 001-.9l1-11" />,
  copy: (p: IconProps) => (
    <Icon {...p}>
      <rect x="6" y="6" width="11" height="11" rx="1.5" />
      <path d="M3 14V4a1 1 0 011-1h10" />
    </Icon>
  ),
  download: (p: IconProps) => <Icon {...p} d="M10 3v10M5.5 9.5L10 14l4.5-4.5M3 17h14" />,
  upload: (p: IconProps) => <Icon {...p} d="M10 14V4M5.5 7.5L10 3l4.5 4.5M3 17h14" />,
  filter: (p: IconProps) => <Icon {...p} d="M3 5h14M5.5 10h9M8.5 15h3" />,
  sort: (p: IconProps) => <Icon {...p} d="M6 4v12M3 13l3 3 3-3M14 16V4M11 7l3-3 3 3" />,
  more: (p: IconProps) => (
    <Icon {...p}>
      <circle cx="10" cy="5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="10" cy="10" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="10" cy="15" r="1.2" fill="currentColor" stroke="none" />
    </Icon>
  ),
  chev_d: (p: IconProps) => <Icon {...p} d="M5 8l5 5 5-5" />,
  chev_r: (p: IconProps) => <Icon {...p} d="M8 5l5 5-5 5" />,
  chev_l: (p: IconProps) => <Icon {...p} d="M12 5l-5 5 5 5" />,
  chev_u: (p: IconProps) => <Icon {...p} d="M5 12l5-5 5 5" />,
  arr_r: (p: IconProps) => <Icon {...p} d="M4 10h12M11 5l5 5-5 5" />,
  arr_u: (p: IconProps) => <Icon {...p} d="M10 16V4M5 9l5-5 5 5" />,
  arr_d: (p: IconProps) => <Icon {...p} d="M10 4v12M5 11l5 5 5-5" />,
  arr_ul: (p: IconProps) => <Icon {...p} d="M14 14L4 4M4 4h7M4 4v7" />,
  star: (p: IconProps) => <Icon {...p} d="M10 2.5l2.4 4.9 5.4.8-3.9 3.8.9 5.4L10 14.9l-4.8 2.5.9-5.4L2.2 8.2l5.4-.8L10 2.5z" />,
  star_f: (p: IconProps) => <Icon {...p} fill="currentColor" d="M10 2.5l2.4 4.9 5.4.8-3.9 3.8.9 5.4L10 14.9l-4.8 2.5.9-5.4L2.2 8.2l5.4-.8L10 2.5z" />,
  eye: (p: IconProps) => (
    <Icon {...p}>
      <path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" />
      <circle cx="10" cy="10" r="2.5" />
    </Icon>
  ),
  eye_off: (p: IconProps) => (
    <Icon {...p}>
      <path d="M3 3l14 14" />
      <path d="M8.2 5.2A8.6 8.6 0 0110 5c5 0 8 6 8 6a14 14 0 01-2.8 3.3M6 6.8A13.8 13.8 0 002 11s3 6 8 6a8.6 8.6 0 003-.5" />
      <path d="M8.6 8.6a2.5 2.5 0 003.5 3.5" />
    </Icon>
  ),
  lock: (p: IconProps) => (
    <Icon {...p}>
      <rect x="4" y="9" width="12" height="9" rx="1.5" />
      <path d="M7 9V6a3 3 0 016 0v3" />
    </Icon>
  ),
  mail: (p: IconProps) => (
    <Icon {...p}>
      <rect x="3" y="5" width="14" height="11" rx="1.5" />
      <path d="M3.5 6l6.5 5 6.5-5" />
    </Icon>
  ),
  card: (p: IconProps) => (
    <Icon {...p}>
      <rect x="2.5" y="5" width="15" height="11" rx="1.5" />
      <path d="M2.5 9h15M5.5 13h2" />
    </Icon>
  ),
  tag: (p: IconProps) => (
    <Icon {...p}>
      <path d="M3 3h7l7 7-7 7-7-7V3z" />
      <circle cx="6.5" cy="6.5" r="1" />
    </Icon>
  ),
  truck: (p: IconProps) => (
    <Icon {...p}>
      <path d="M2 5h10v9H2zM12 8h4l2 3v3h-6" />
      <circle cx="6" cy="16" r="1.5" />
      <circle cx="15" cy="16" r="1.5" />
    </Icon>
  ),
  globe: (p: IconProps) => (
    <Icon {...p}>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M2.5 10h15M10 2.5c2.5 2.5 2.5 12.5 0 15M10 2.5c-2.5 2.5-2.5 12.5 0 15" />
    </Icon>
  ),
  spark: (p: IconProps) => <Icon {...p} d="M10 3v3M10 14v3M3 10h3M14 10h3M5.5 5.5l2 2M12.5 12.5l2 2M5.5 14.5l2-2M12.5 7.5l2-2" />,
  refresh: (p: IconProps) => <Icon {...p} d="M3 8a7 7 0 0112-3l2 2M17 4v3h-3M17 12a7 7 0 01-12 3l-2-2M3 16v-3h3" />,
  shield: (p: IconProps) => <Icon {...p} d="M10 2.5l6 2.5v5c0 4-3 6.5-6 7.5-3-1-6-3.5-6-7.5V5l6-2.5z" />,
  flame: (p: IconProps) => <Icon {...p} d="M10 2.5s4 4 4 8a4 4 0 01-8 0c0-2 1-3 1-3s.5 2 2 2c0-3-1-4 1-7z" />,
  moon: (p: IconProps) => <Icon {...p} d="M16 11.5A6.5 6.5 0 118.5 4a5 5 0 007.5 7.5z" />,
  sun: (p: IconProps) => (
    <Icon {...p}>
      <circle cx="10" cy="10" r="3" />
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.5 4.5l1.5 1.5M14 14l1.5 1.5M4.5 15.5L6 14M14 6l1.5-1.5" />
    </Icon>
  ),
  menu: (p: IconProps) => <Icon {...p} d="M3 6h14M3 10h14M3 14h14" />,
  external: (p: IconProps) => <Icon {...p} d="M9 4H4v12h12v-5M11 3h6v6M9 11l8-8" />,
  store: (p: IconProps) => <Icon {...p} d="M3 8h14l-1-4H4L3 8zM4 8v8h12V8M8 16v-4h4v4" />,
  ship: (p: IconProps) => (
    <Icon {...p}>
      <rect x="2.5" y="6" width="15" height="9" rx="1" />
      <path d="M2.5 10h15M10 6V3" />
    </Icon>
  ),
  refund: (p: IconProps) => <Icon {...p} d="M3 10a7 7 0 1014-1M3 10l3-3M3 10l3 3" />,
  chat: (p: IconProps) => <Icon {...p} d="M3 4h14v10h-7l-4 3v-3H3V4z" />,
  pin: (p: IconProps) => (
    <Icon {...p}>
      <path d="M10 11v6M5 8a5 5 0 1110 0c0 4-5 8-5 8s-5-4-5-8z" />
      <circle cx="10" cy="8" r="2" />
    </Icon>
  ),
  log: (p: IconProps) => <Icon {...p} d="M3 5h14M3 10h14M3 15h14M6 5v10" />,
  trend_u: (p: IconProps) => <Icon {...p} d="M3 14l5-5 3 3 6-7M11 5h6v6" />,
  trend_d: (p: IconProps) => <Icon {...p} d="M3 6l5 5 3-3 6 7M11 15h6V9" />,
};

export default I;

export type { IconComponent };

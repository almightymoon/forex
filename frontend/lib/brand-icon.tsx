import { ImageResponse } from 'next/og';

type BrandIconProps = {
  size: number;
  markSize: number;
  strokeWidth: number;
};

export function BrandIconMark({ size, markSize, strokeWidth }: BrandIconProps) {
  const chartInset = size * 0.18;
  const chartTop = size * 0.28;
  const chartBottom = size * 0.68;

  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #020617 0%, #0f172a 45%, #1e3a8a 100%)',
        borderRadius: size * 0.21,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: 'absolute', inset: 0 }}
      >
        <polyline
          points={`${chartInset},${chartBottom} ${size * 0.34},${size * 0.53} ${size * 0.48},${size * 0.59} ${size - chartInset},${chartTop}`}
          fill="none"
          stroke="#60a5fa"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div
        style={{
          fontSize: markSize,
          fontWeight: 700,
          color: '#f8fafc',
          letterSpacing: markSize * -0.05,
          fontFamily: 'system-ui, sans-serif',
          lineHeight: 1,
          marginTop: size * 0.08,
        }}
      >
        FN
      </div>
    </div>
  );
}

export function renderBrandIcon(size: number) {
  const markSize = Math.round(size * 0.33);
  const strokeWidth = Math.max(2, Math.round(size * 0.055));

  return new ImageResponse(
    <BrandIconMark size={size} markSize={markSize} strokeWidth={strokeWidth} />,
    { width: size, height: size }
  );
}

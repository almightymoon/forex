import { ImageResponse } from 'next/og';
import { siteConfig } from '../lib/seo';

export const runtime = 'edge';
export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '72px',
          background: 'linear-gradient(135deg, #020617 0%, #0f172a 45%, #1e3a8a 100%)',
          color: '#f8fafc',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#93c5fd',
            marginBottom: 24,
          }}
        >
          Premier Forex Education
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 1.05,
            maxWidth: 900,
            marginBottom: 28,
          }}
        >
          {siteConfig.name}
        </div>
        <div style={{ fontSize: 34, color: '#cbd5e1', maxWidth: 820, lineHeight: 1.35 }}>
          {siteConfig.tagline}
        </div>
        <div style={{ marginTop: 48, fontSize: 24, color: '#94a3b8' }}>
          Courses · Live Sessions · Trading Signals · Mentorship
        </div>
      </div>
    ),
    { ...size }
  );
}

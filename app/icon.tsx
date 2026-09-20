import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = {
  width: 512,
  height: 512,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 240,
          background: 'linear-gradient(135deg, #1877F2 0%, #0E57B8 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: 112,
          fontWeight: 900,
          fontFamily: 'system-ui, sans-serif',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 180, lineHeight: 1, letterSpacing: -6 }}>CC</span>
          <span
            style={{
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: 4,
              textTransform: 'uppercase',
              marginTop: 12,
              color: '#FACC15',
            }}
          >
            CityConnect
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

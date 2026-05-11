import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          borderRadius: 48,
          backgroundColor: '#D14D72',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 80,
          fontWeight: 900,
          letterSpacing: '-4px',
        }}
      >
        BB
      </div>
    ),
    { width: 192, height: 192 }
  );
}

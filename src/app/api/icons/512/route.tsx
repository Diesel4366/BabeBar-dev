import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          borderRadius: 120,
          backgroundColor: '#D14D72',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 200,
          fontWeight: 900,
          letterSpacing: '-10px',
        }}
      >
        BB
      </div>
    ),
    { width: 512, height: 512 }
  );
}

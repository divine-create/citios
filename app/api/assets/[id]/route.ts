import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/prisma/db';

// Streams a self-hosted microsite Asset (stored as base64 in Postgres) back
// as its real binary content, so it can be used directly in `<img src>`.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await db.orm.public.Asset.where({ id }).all().first();
  if (!asset) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const buffer = Buffer.from(asset.data, 'base64');
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': asset.mimeType,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

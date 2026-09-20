import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/prisma/db";

// Serves self-hosted microsite/product images (Asset rows store base64 in
// `data` or direct S3 URL). Public read by design: asset ids are unguessable UUIDs referenced
// from public storefront HTML (product images, logos, receipt uploads).
// When S3 is used, this route 302-redirects directly to the S3 bucket asset.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Cheap shape guard — avoids a DB round trip for malformed ids.
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const asset = await db.orm.public.Asset.where({ id }).all().first();
  if (!asset) {
    return new NextResponse("Not found", { status: 404 });
  }

  // If stored data is an S3 URL or external URL, redirect directly to S3
  if (asset.data.startsWith("http://") || asset.data.startsWith("https://")) {
    return NextResponse.redirect(asset.data, 302);
  }

  const buffer = Buffer.from(asset.data, "base64");
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": asset.mimeType || "application/octet-stream",
      "Content-Length": String(buffer.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

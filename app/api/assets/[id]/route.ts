import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/prisma/db";

// Serves self-hosted microsite/product images (Asset rows store base64 in
// `data`). Public read by design: asset ids are unguessable UUIDs referenced
// from public storefront HTML (product images, logos, receipt uploads).
// Swapping to an object store later only changes this route + the Asset model.
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

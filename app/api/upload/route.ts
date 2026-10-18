import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'UNAUTHORIZED: Active session required' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    // Validate mime type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'video/mp4', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: `Unsupported media type: ${file.type}` }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Derive extension
    let ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || ext.length > 5) {
      ext = file.type.split('/')[1] || 'jpg';
    }

    // 1. Try S3 if AWS credentials are configured
    try {
      const { getS3Config, uploadBufferToS3 } = await import('@/lib/s3');
      if (getS3Config()) {
        const { publicUrl } = await uploadBufferToS3({
          buffer,
          contentType: file.type,
          fileName: file.name,
          folder: 'uploads',
        });
        return NextResponse.json({
          success: true,
          url: publicUrl,
          fileName: file.name,
          size: file.size,
          mimeType: file.type,
        });
      }
    } catch (s3Err) {
      console.warn('S3 upload failed, falling back to local storage:', s3Err);
    }

    const uniqueFileName = `${uuidv4()}.${ext}`;

    // 2. Target public/uploads folder on local filesystem, with base64 fallback for read-only serverless
    let publicUrl = `/uploads/${uniqueFileName}`;
    try {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filePath = path.join(uploadsDir, uniqueFileName);
      fs.writeFileSync(filePath, buffer);
    } catch (fsErr) {
      console.warn('Filesystem write unavailable, falling back to inline data URL:', fsErr);
      publicUrl = `data:${file.type};base64,${buffer.toString('base64')}`;
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: file.name,
      size: file.size,
      mimeType: file.type,
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload media file' }, { status: 500 });
  }
}

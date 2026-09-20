'use server'

import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { getS3Client } from '@/lib/s3';

export async function getPresignedUploadUrl(contentType: string, extension: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    throw new Error('Not authenticated');
  }

  const s3Data = getS3Client();
  if (!s3Data) {
    throw new Error('AWS credentials are not configured.');
  }

  const { client, bucketName, region } = s3Data;
  const uniqueId = uuidv4();
  const key = "uploads/" + uniqueId + "." + extension;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  // URL expires in 60 seconds
  const signedUrl = await getSignedUrl(client, command, { expiresIn: 60 });
  const publicUrl = "https://" + bucketName + ".s3." + region + ".amazonaws.com/" + key;

  return { signedUrl, publicUrl };
}
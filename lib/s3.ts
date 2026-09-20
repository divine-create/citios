import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

export interface S3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

export function getS3Config(): S3Config | null {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucketName = process.env.AWS_BUCKET_NAME;

  if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
    return null;
  }

  return { region, accessKeyId, secretAccessKey, bucketName };
}

export function getS3Client(): { client: S3Client; bucketName: string; region: string } | null {
  const config = getS3Config();
  if (!config) return null;

  const client = new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return {
    client,
    bucketName: config.bucketName,
    region: config.region,
  };
}

export async function uploadBufferToS3(params: {
  buffer: Buffer;
  contentType: string;
  fileName?: string;
  folder?: string;
}): Promise<{ publicUrl: string; key: string }> {
  const s3Data = getS3Client();
  if (!s3Data) {
    throw new Error('AWS credentials are not configured.');
  }

  const { client, bucketName, region } = s3Data;
  const ext = params.fileName?.split('.').pop() || (params.contentType.includes('/') ? params.contentType.split('/')[1] : 'jpg');
  const uniqueId = uuidv4();
  const folder = params.folder || 'uploads';
  const key = `${folder}/${uniqueId}.${ext}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: params.buffer,
      ContentType: params.contentType,
    })
  );

  const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
  return { publicUrl, key };
}

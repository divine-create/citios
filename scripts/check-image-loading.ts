import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

interface ProductRow {
  id: string;
  name: string;
  price: number;
  imageAssetId: string | null;
  organizationId: string;
  org_name: string;
}

interface ImageCheckResult {
  product: ProductRow;
  status: 'OK' | 'BROKEN';
  httpStatus?: number;
  contentType?: string;
  reason?: string;
}

async function checkImageUrl(url: string): Promise<{ ok: boolean; httpStatus?: number; contentType?: string; reason?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    // Try HEAD first
    let res = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      signal: controller.signal,
    }).catch(() => null);

    // Some servers return 405 or 403 on HEAD, fallback to GET range or small GET
    if (!res || res.status === 405 || res.status === 403 || !res.ok) {
      const getController = new AbortController();
      const getTimeout = setTimeout(() => getController.abort(), 7000);
      try {
        res = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Range': 'bytes=0-1024',
          },
          signal: getController.signal,
        });
      } catch (err: any) {
        clearTimeout(getTimeout);
        return { ok: false, reason: err.message || 'Fetch failed' };
      } finally {
        clearTimeout(getTimeout);
      }
    } else {
      clearTimeout(timeout);
    }

    if (!res) {
      return { ok: false, reason: 'No response' };
    }

    const httpStatus = res.status;
    const contentType = res.headers.get('content-type') || '';

    // Status 200..299 or 206 (Partial Content from range request)
    if (res.status >= 200 && res.status < 300) {
      if (contentType.includes('text/html') && !contentType.includes('image')) {
        // Returned HTML (e.g., custom 404 error page with 200 status)
        return { ok: false, httpStatus, contentType, reason: 'Returned HTML instead of image' };
      }
      return { ok: true, httpStatus, contentType };
    }

    return { ok: false, httpStatus, contentType, reason: `HTTP ${httpStatus}` };
  } catch (err: any) {
    return { ok: false, reason: err.message || 'Network error' };
  }
}

async function checkProductImage(p: ProductRow): Promise<ImageCheckResult> {
  const img = (p.imageAssetId || '').trim();
  if (!img) {
    return { product: p, status: 'BROKEN', reason: 'Missing or empty imageAssetId' };
  }

  // Relative path (e.g. /icons/...)
  if (img.startsWith('/')) {
    const localPath = path.join(process.cwd(), 'public', img.replace(/^\//, ''));
    if (fs.existsSync(localPath)) {
      return { product: p, status: 'OK', reason: 'Local file exists in public/' };
    } else {
      return { product: p, status: 'BROKEN', reason: `Local file does not exist: public/${img}` };
    }
  }

  // Full URL
  if (img.startsWith('http://') || img.startsWith('https://')) {
    const res = await checkImageUrl(img);
    if (res.ok) {
      return { product: p, status: 'OK', httpStatus: res.httpStatus, contentType: res.contentType };
    } else {
      return { product: p, status: 'BROKEN', httpStatus: res.httpStatus, contentType: res.contentType, reason: res.reason };
    }
  }

  return { product: p, status: 'BROKEN', reason: `Unknown image reference format: ${img}` };
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    const res = await client.query(`
      SELECT p.id, p.name, p.price, p."imageAssetId", p."organizationId", o.name as org_name
      FROM "retailProduct" p
      JOIN "organization" o ON p."organizationId" = o.id
      ORDER BY o.name, p.name
    `);

    const products: ProductRow[] = res.rows;
    console.log(`Checking image URLs for ${products.length} products...`);

    const results: ImageCheckResult[] = [];
    const concurrency = 15;

    for (let i = 0; i < products.length; i += concurrency) {
      const chunk = products.slice(i, i + concurrency);
      const chunkResults = await Promise.all(chunk.map(checkProductImage));
      results.push(...chunkResults);
      process.stdout.write(`Checked ${results.length}/${products.length} products...\r`);
    }

    console.log('\n--- SCAN COMPLETED ---');

    const okProducts = results.filter((r) => r.status === 'OK');
    const brokenProducts = results.filter((r) => r.status === 'BROKEN');

    console.log(`Valid Images: ${okProducts.length}`);
    console.log(`Broken Images: ${brokenProducts.length}`);

    if (brokenProducts.length > 0) {
      console.log('\n=== BROKEN PRODUCTS TO REMOVE ===');
      for (const b of brokenProducts) {
        console.log(` - [${b.product.org_name}] "${b.product.name}" (id: ${b.product.id})`);
        console.log(`   Image: ${b.product.imageAssetId}`);
        console.log(`   Reason: ${b.reason} (HTTP ${b.httpStatus ?? 'N/A'}, Content-Type: ${b.contentType ?? 'N/A'})`);
      }

      fs.writeFileSync(
        'scripts/broken-products.json',
        JSON.stringify(brokenProducts.map((b) => ({
          id: b.product.id,
          name: b.product.name,
          orgId: b.product.organizationId,
          orgName: b.product.org_name,
          image: b.product.imageAssetId,
          reason: b.reason,
          httpStatus: b.httpStatus,
        })), null, 2)
      );
      console.log('\nWrote broken products details to scripts/broken-products.json');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);

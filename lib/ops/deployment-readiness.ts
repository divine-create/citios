import { db } from '@/src/prisma/db';

export interface ReadinessCheckResult {
  status: 'READY' | 'DEGRADED' | 'NOT_READY';
  timestamp: string;
  uptimeSeconds: number;
  checks: {
    database: { status: 'OK' | 'FAIL'; latencyMs: number; error?: string };
    environment: { status: 'OK' | 'WARN'; missingVariables: string[] };
    schema: { status: 'OK' | 'FAIL'; activeCitiesCount: number; error?: string };
    temporalCodec: { status: 'OK' | 'FAIL' };
  };
}

const startTime = Date.now();

export async function checkDatabaseLiveness(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const res = await db.orm.public.City.limit(1).all();
    return { ok: !!res, latencyMs: Date.now() - start };
  } catch (err: any) {
    return { ok: false, latencyMs: Date.now() - start, error: err.message };
  }
}

export function checkEnvironmentVariables(): { ok: boolean; missing: string[] } {
  const required = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL'];
  const missing = required.filter((v) => !process.env[v]);
  return { ok: missing.length === 0, missing };
}

export async function checkSchemaIntegrity(): Promise<{ ok: boolean; citiesCount: number; error?: string }> {
  try {
    const cities = await db.orm.public.City.where({ isActive: true }).limit(5).all();
    return { ok: true, citiesCount: cities.length };
  } catch (err: any) {
    return { ok: false, citiesCount: 0, error: err.message };
  }
}

export function checkTemporalCodec(): { ok: boolean } {
  try {
    const inst = (globalThis as any).Temporal.Now.instant();
    return { ok: !!inst };
  } catch {
    return { ok: false };
  }
}

export async function getDeploymentReadinessReport(): Promise<ReadinessCheckResult> {
  const [dbLiveness, schemaCheck] = await Promise.all([
    checkDatabaseLiveness(),
    checkSchemaIntegrity(),
  ]);

  const envCheck = checkEnvironmentVariables();
  const temporalCheck = checkTemporalCodec();

  const isDbOk = dbLiveness.ok && schemaCheck.ok;
  const isEnvOk = envCheck.ok;
  const isTemporalOk = temporalCheck.ok;

  let overallStatus: 'READY' | 'DEGRADED' | 'NOT_READY' = 'READY';
  if (!isDbOk || !isTemporalOk) {
    overallStatus = 'NOT_READY';
  } else if (!isEnvOk) {
    overallStatus = 'DEGRADED';
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    checks: {
      database: {
        status: dbLiveness.ok ? 'OK' : 'FAIL',
        latencyMs: dbLiveness.latencyMs,
        error: dbLiveness.error,
      },
      environment: {
        status: envCheck.ok ? 'OK' : 'WARN',
        missingVariables: envCheck.missing,
      },
      schema: {
        status: schemaCheck.ok ? 'OK' : 'FAIL',
        activeCitiesCount: schemaCheck.citiesCount,
        error: schemaCheck.error,
      },
      temporalCodec: {
        status: temporalCheck.ok ? 'OK' : 'FAIL',
      },
    },
  };
}

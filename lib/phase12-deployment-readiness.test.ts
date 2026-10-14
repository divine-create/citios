import test from 'node:test';
import assert from 'node:assert';
import { NextRequest } from 'next/server';

process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'integration-test-secret';

import {
  checkDatabaseLiveness,
  checkEnvironmentVariables,
  checkSchemaIntegrity,
  checkTemporalCodec,
  getDeploymentReadinessReport,
} from '@/lib/ops/deployment-readiness';
import { GET as healthRouteHandler } from '@/app/api/health/route';

test('Phase 12 Deployment Readiness & Operational Health Verification Suite', async (t) => {
  await t.test('1. Database Liveness: Fast SQL ping returns within latency budget', async () => {
    const liveness = await checkDatabaseLiveness();
    assert.strictEqual(liveness.ok, true, 'Database liveness check must succeed');
    assert.strictEqual(typeof liveness.latencyMs, 'number');
    assert.ok(liveness.latencyMs < 5000, `Database latency must be reasonable (was ${liveness.latencyMs}ms)`);
  });

  await t.test('2. Schema & Registry Verification: Active cities accessible via ORM', async () => {
    const schema = await checkSchemaIntegrity();
    assert.strictEqual(schema.ok, true, 'Prisma schema contract must query cleanly');
    assert.ok(schema.citiesCount > 0, 'Active cities must exist in the registry for pilot launch');
  });

  await t.test('3. Environment Configuration: Critical production variables loaded', () => {
    const envCheck = checkEnvironmentVariables();
    assert.strictEqual(envCheck.ok, true, `Mandatory environment variables missing: ${envCheck.missing.join(', ')}`);
  });

  await t.test('4. Temporal Runtime Codec: Temporal.Instant polyfill initialized', () => {
    const temporalCheck = checkTemporalCodec();
    assert.strictEqual(temporalCheck.ok, true, 'Temporal polyfill must be available on globalThis');
  });

  await t.test('5. Full Deployment Readiness Report: Overall status is READY', async () => {
    const report = await getDeploymentReadinessReport();
    assert.strictEqual(report.status, 'READY', 'Production readiness report must return status READY');
    assert.strictEqual(report.checks.database.status, 'OK');
    assert.strictEqual(report.checks.environment.status, 'OK');
    assert.strictEqual(report.checks.schema.status, 'OK');
    assert.strictEqual(report.checks.temporalCodec.status, 'OK');
    assert.ok(typeof report.uptimeSeconds === 'number');
  });

  await t.test('6. Production Health HTTP Route: Liveness and Readiness Probes', async () => {
    // 1. Liveness check: GET /api/health
    const livenessReq = new NextRequest('http://localhost:3000/api/health');
    const livenessRes = await healthRouteHandler(livenessReq);
    assert.strictEqual(livenessRes.status, 200);

    const livenessBody = await livenessRes.json();
    assert.strictEqual(livenessBody.status, 'ok');
    assert.strictEqual(livenessBody.service, 'cityos-api');
    assert.ok(livenessBody.timestamp);

    // 2. Readiness probe: GET /api/health?readiness=true
    const readinessReq = new NextRequest('http://localhost:3000/api/health?readiness=true');
    const readinessRes = await healthRouteHandler(readinessReq);
    assert.strictEqual(readinessRes.status, 200);

    const readinessBody = await readinessRes.json();
    assert.strictEqual(readinessBody.status, 'READY');
    assert.strictEqual(readinessBody.checks.database.status, 'OK');
    assert.strictEqual(readinessBody.checks.schema.status, 'OK');
  });
});

import { NextRequest, NextResponse } from 'next/server';
import { getDeploymentReadinessReport } from '@/lib/ops/deployment-readiness';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const isReadiness = req.nextUrl.searchParams.get('readiness') === 'true';

  if (isReadiness) {
    const report = await getDeploymentReadinessReport();
    const httpStatus = report.status === 'NOT_READY' ? 503 : 200;
    return NextResponse.json(report, { status: httpStatus });
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'cityos-api',
  });
}

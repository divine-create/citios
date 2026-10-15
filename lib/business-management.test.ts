import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getWorkspaceUrlForOrg } from './actions/business';

describe('Business Management & Workspace Routing', () => {
  it('should resolve workspace URLs for all supported verticals accurately', async () => {
    const testOrgId = 'test-org-12345';
    
    const retailUrl = await getWorkspaceUrlForOrg(testOrgId, 'RETAIL');
    assert.strictEqual(retailUrl, `/workspaces/shopos/${testOrgId}`);

    const restaurantUrl = await getWorkspaceUrlForOrg(testOrgId, 'RESTAURANT');
    assert.strictEqual(restaurantUrl, `/workspaces/restaurantos/${testOrgId}/management/overview`);

    const serviceUrl = await getWorkspaceUrlForOrg(testOrgId, 'SERVICES');
    assert.strictEqual(serviceUrl, `/workspaces/serviceos/${testOrgId}`);

    const schoolUrl = await getWorkspaceUrlForOrg(testOrgId, 'SCHOOL');
    assert.strictEqual(schoolUrl, `/school/admin?org=${testOrgId}`);

    const hotelUrl = await getWorkspaceUrlForOrg(testOrgId, 'HOTEL');
    assert.strictEqual(hotelUrl, `/hotel/manager?org=${testOrgId}`);

    const logisticsUrl = await getWorkspaceUrlForOrg(testOrgId, 'LOGISTICS');
    assert.strictEqual(logisticsUrl, `/business/logisticsos/dashboard?org=${testOrgId}`);

    const eventsUrl = await getWorkspaceUrlForOrg(testOrgId, 'EVENT_ORGANIZER');
    assert.strictEqual(eventsUrl, `/admin/events?org=${testOrgId}`);

    const healthcareUrl = await getWorkspaceUrlForOrg(testOrgId, 'HEALTHCARE');
    assert.strictEqual(healthcareUrl, `/admin/healthcare?org=${testOrgId}`);
  });

  it('should fall back to shopos workspace for unknown verticals', async () => {
    const testOrgId = 'test-org-unknown';
    const fallbackUrl = await getWorkspaceUrlForOrg(testOrgId, 'UNKNOWN_VERTICAL');
    assert.strictEqual(fallbackUrl, `/workspaces/shopos/${testOrgId}`);
  });
});

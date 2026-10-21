import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isTestOrDemoOrganization, isTestOrDemoProduct } from './storefront-filter';

describe('storefront-filter', () => {
  it('preserves authentic Calabar retail shops, restaurants, and service providers', () => {
    assert.equal(isTestOrDemoOrganization({ id: 'istore-calabar', name: 'iStore Calabar' }), false);
    assert.equal(isTestOrDemoOrganization({ id: 'cygroup-calabar', name: 'Cy.com Phone Accessories' }), false);
    assert.equal(isTestOrDemoOrganization({ id: 'software-guru-tech-calabar', name: 'Software Guru Technology' }), false);
    assert.equal(isTestOrDemoOrganization({ id: '3c9212da-52a4-427c-94b6-cb8b80ef45ca', name: 'Crunchies Fried Chicken (Marian)' }), false);
    assert.equal(isTestOrDemoOrganization({ id: 'service-centelleo-calabar', name: 'Centelleo Professional Cleaning & Laundry' }), false);
  });

  it('filters out test and demo organizations', () => {
    assert.equal(isTestOrDemoOrganization({ id: '82c9f137-5c8a-45ec-a2cc-45ab8775d686', name: 'Test Enterprise 14129a' }), true);
    assert.equal(isTestOrDemoOrganization({ id: '7c5d2ba0-7de1-48bb-bac8-fd73f82a399e', name: 'Victoria Grocers e03e3d' }), true);
    assert.equal(isTestOrDemoOrganization({ id: 'd0ec2cef-1a3b-4b83-923b-f1e164b100ea', name: 'Lagos Mart 41873b' }), true);
    assert.equal(isTestOrDemoOrganization({ id: '9c0ec9cc-71b5-4a77-a2aa-eac48ee2e57a', name: 'Bistro 1d6f2a' }), true);
    assert.equal(isTestOrDemoOrganization({ id: 'org_service_a_4e4c529b', name: 'Lagos Pro Services 4e4c529b' }), true);
    assert.equal(isTestOrDemoOrganization({ id: 'log-1792169859885-oofapj', name: 'Logistics Co' }), true);
    assert.equal(isTestOrDemoOrganization({ id: 'org-1792517793812-xdu6ay', name: 'Merchant' }), true);
    assert.equal(isTestOrDemoOrganization({ id: 'org2-1792517795291-a1tx9v', name: 'Other Merchant' }), true);
    assert.equal(isTestOrDemoOrganization({ id: '8bdcfc1a-9284-4ab4-b847-4ec89e7bf799', name: 'Unconfigured Shop' }), true);
    assert.equal(isTestOrDemoOrganization({ id: '55155fd3-33f7-4f74-802a-21d89ff5cbb9', name: 'Valid Supermarket' }), true);
    assert.equal(isTestOrDemoOrganization({ id: 'baa8a6cb-55e5-4515-8bd8-a01658b73436', name: 'CityMart Express 083428' }), true);
    assert.equal(isTestOrDemoOrganization({ id: '0c7477c3-138a-4ac2-8fab-ac55251e71c0', name: 'Corner Store 7d850c' }), true);
    assert.equal(isTestOrDemoOrganization({ id: 'ac2ef446-0c6c-41ee-934c-0b49be576da7', name: 'Payout Test Org 1792517889961' }), true);
  });

  it('filters out test and demo products', () => {
    assert.equal(isTestOrDemoProduct({ id: 'p1', name: 'Test Item', organizationId: 'istore-calabar' }), true);
    assert.equal(isTestOrDemoProduct({ id: 'p2', name: 'iPhone 16 Pro Max', organizationId: 'istore-calabar' }), false);
    assert.equal(isTestOrDemoProduct({ id: 'p3', name: 'Organic Basmati Rice 5kg', organizationId: 'org_test_123' }), true);
    assert.equal(isTestOrDemoProduct({ id: 'p4', name: 'Widget X', organizationId: 'istore-calabar' }), true);
    assert.equal(isTestOrDemoProduct({ id: 'p5', name: 'Standard Bread', organizationId: 'istore-calabar' }), true);
  });
});

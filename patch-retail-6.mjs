import fs from 'fs';

let content = fs.readFileSync('lib/actions/retail.ts', 'utf8');

// Patch getShopDashboardData
const oldDash = /export async function getShopDashboardData\(organizationId: string\) \{/g;
const newDash = 'export async function getShopDashboardData(organizationId: string, locationId?: string | null) {';
content = content.replace(oldDash, newDash);

// Patch getRegisters
const oldReg = /export async function getRegisters\(organizationId: string\) \{/g;
const newReg = 'export async function getRegisters(organizationId: string, locationId?: string | null) {';
content = content.replace(oldReg, newReg);

// Patch getShiftHistory
const oldShift = /export async function getShiftHistory\(organizationId: string\) \{/g;
const newShift = 'export async function getShiftHistory(organizationId: string, locationId?: string | null) {';
content = content.replace(oldShift, newShift);

// Patch getOrders
const oldOrders = /export async function getOrders\(organizationId: string\) \{/g;
const newOrders = 'export async function getOrders(organizationId: string, locationId?: string | null) {';
content = content.replace(oldOrders, newOrders);

// Patch getOpenShift
const oldOpenShift = /export async function getOpenShift\(organizationId: string\) \{/g;
const newOpenShift = 'export async function getOpenShift(organizationId: string, locationId?: string | null) {';
content = content.replace(oldOpenShift, newOpenShift);

fs.writeFileSync('lib/actions/retail.ts', content);
console.log('Patched signatures');

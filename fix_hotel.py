import sys

with open('lib/actions/hotel.ts', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace(
'''export async function createReservation(input: {
  organizationId: string;
  roomId: string;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  roomBlockId?: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST']);''',
'''export async function createReservation(input: {
  organizationId: string;
  roomId: string;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  roomBlockId?: string;
  byResident?: boolean;
}) {
  try {
    if (!input.byResident) {
      await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST']);
    }'''
)

with open('lib/actions/hotel.ts', 'w', encoding='utf-8') as f:
    f.write(c)

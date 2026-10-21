import fs from 'fs';

let content = fs.readFileSync('src/prisma/contract.prisma', 'utf8');

const target1 = `model DeliveryJob {
  id              String       @id @default(uuid())
  providerId      String?`;

// Normalize line breaks for matching
const isCRLF = content.includes('\r\n');
const eol = isCRLF ? '\r\n' : '\n';

const searchTarget1 = target1.replace(/\n/g, eol);

if (!content.includes(searchTarget1)) {
  console.error('Target 1 not found');
  process.exit(1);
}

const replacement1 = `model DeliveryJob {
  id              String       @id @default(uuid())
  providerId      String?      // The logistics company owning the delivery
  
  // Tracking reference for customer/resident tracking portal
  trackingReference String?    @unique
  
  pickupContactName String?
  pickupContactPhone String?
  
  dropoffContactName String?
  dropoffContactPhone String?
  
  packageDescription String?
  packageWeightKg    Float?
  serviceLevel       String?      @default("STANDARD")
  
  // Proof of delivery OTP
  recipientOtp       String?
  
  // Exceptions & termination details
  cancellationReason String?
  failureReason      String?
  
  customerDataId     String?
  
  updatedAt          DateTime     @default(now())`.replace(/\n/g, eol);

content = content.replace(searchTarget1, replacement1);

const djPos = content.indexOf('model DeliveryJob');
const endDjPos = content.indexOf('model DeliveryAssignment', djPos);
const djSub = content.substring(djPos, endDjPos);

const targetIdx = `  @@index([createdAt])${eol}}`;
const replacementIdx = `  @@index([createdAt])${eol}  @@index([customerDataId])${eol}  @@index([trackingReference])${eol}}`;

const djSubReplaced = djSub.replace(targetIdx, replacementIdx);
content = content.substring(0, djPos) + djSubReplaced + content.substring(endDjPos);

const targetSettings = `  platformFeeRate Decimal      @default(0.10)${eol}  ${eol}  createdAt       DateTime     @default(now())`;
const replacementSettings = `  platformFeeRate Decimal      @default(0.10)${eol}  isNetworkParticipant Boolean  @default(false)${eol}  serviceRadiusKm Float?${eol}  ${eol}  createdAt       DateTime     @default(now())`;

if (!content.includes(targetSettings)) {
  console.error('Target settings not found');
  process.exit(1);
}

content = content.replace(targetSettings, replacementSettings);

fs.writeFileSync('src/prisma/contract.prisma', content, 'utf8');
console.log('Successfully updated src/prisma/contract.prisma');

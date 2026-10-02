import re
import sys

def modify_prisma():
    with open('src/prisma/contract.prisma', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Update Organization
    org_append = """
  // LogisticsOS
  providerFleets       LogisticsFleet[]         @relation("ProviderFleets")
  providerVehicles     LogisticsVehicle[]       @relation("ProviderVehicles")
  providerDrivers      LogisticsDriverProfile[] @relation("ProviderDrivers")
  providerDeliveryJobs DeliveryJob[]            @relation("ProviderDeliveryJobs")
}"""
    content = re.sub(r'  bookings      Booking\[\]      @relation\("OrgBookings"\)\n}', 
                     f'  bookings      Booking[]      @relation("OrgBookings")\n{org_append}', 
                     content)

    # 2. Update Person
    person_append = """
  // LogisticsOS
  logisticsDriverProfiles LogisticsDriverProfile[] @relation("PersonLogisticsDriver")
  legacyDeliveries        DeliveryJob[]            @relation("LegacyDriver")
}"""
    content = re.sub(r'  updatedAt      DateTime           @default\(now\(\)\)\n}', 
                     f'  updatedAt      DateTime           @default(now())\n{person_append}', 
                     content)

    # 3. Replace DeliveryJob and append new models
    # We will find the exact DeliveryJob block and replace it
    delivery_job_regex = r'model DeliveryJob \{.*?\n\}'
    
    new_logistics_models = """
enum DeliverySourceType {
  RESTAURANT_ORDER
  RETAIL_ORDER
  HOTEL_REQUEST
  SERVICE_JOB
  HEALTH_REQUEST
  DIRECT_DELIVERY
}

enum DeliveryStatus {
  REQUESTED
  PRICED
  CREATED
  DISPATCHED
  ASSIGNED
  AT_PICKUP
  PICKED_UP
  IN_TRANSIT
  AT_DROPOFF
  DELIVERED
  COMPLETED
  CANCELLED
  FAILED
}

enum AssignmentStatus {
  PENDING
  ACCEPTED
  REJECTED
  CANCELLED
  COMPLETED
}

enum LogisticsDriverStatus {
  OFFLINE
  ONLINE
  BUSY
  SUSPENDED
}

enum VehicleStatus {
  ACTIVE
  INACTIVE
  MAINTENANCE
}

model LogisticsFleet {
  id              String       @id @default(uuid())
  providerId      String       // Links to Organization where type = LOGISTICS
  name            String
  description     String?
  isActive        Boolean      @default(true)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @default(now())
  
  provider        Organization @relation("ProviderFleets", fields: [providerId], references: [id], onDelete: Cascade)
  vehicles        LogisticsVehicle[]
}

model LogisticsVehicle {
  id              String       @id @default(uuid())
  providerId      String
  fleetId         String?
  type            String       // e.g., CAR, VAN, TRUCK, BIKE
  licensePlate    String
  capacityPayload Float?
  capacityVolume  Float?
  status          VehicleStatus @default(ACTIVE)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @default(now())

  provider        Organization @relation("ProviderVehicles", fields: [providerId], references: [id], onDelete: Cascade)
  fleet           LogisticsFleet? @relation(fields: [fleetId], references: [id])
  assignments     DeliveryAssignment[]
  drivers         LogisticsDriverProfile[]
}

model LogisticsDriverProfile {
  id              String       @id @default(uuid())
  personId        String
  providerId      String
  status          LogisticsDriverStatus @default(OFFLINE)
  onboardingComplete Boolean @default(false)
  currentVehicleId String?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @default(now())

  person          Person       @relation("PersonLogisticsDriver", fields: [personId], references: [id], onDelete: Cascade)
  provider        Organization @relation("ProviderDrivers", fields: [providerId], references: [id], onDelete: Cascade)
  currentVehicle  LogisticsVehicle? @relation(fields: [currentVehicleId], references: [id])
  assignments     DeliveryAssignment[]
}

model DeliveryJob {
  id              String       @id @default(uuid())
  providerId      String?      // The logistics company owning the delivery (optional for legacy)
  
  // Delivery Source (Provider-Neutral)
  sourceType      DeliverySourceType?
  sourceId        String?      // e.g. restaurantOrderId or retailOrderId
  
  status          DeliveryStatus @default(REQUESTED)
  
  // Idempotency
  idempotencyKey  String?      @unique

  pickupAddress   String?
  pickupLat       Float?
  pickupLng       Float?
  
  dropoffAddress  String
  dropoffLat      Float?
  dropoffLng      Float?
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @default(now())

  provider        Organization? @relation("ProviderDeliveryJobs", fields: [providerId], references: [id])
  assignments     DeliveryAssignment[]
  trackingEvents  DeliveryTrackingEvent[]
  proofOfDelivery ProofOfDelivery[]
  
  // Legacy / Compatibility fields
  restaurantOrderId String?    @unique
  restaurantOrder   RestaurantOrder? @relation(fields: [restaurantOrderId], references: [id])
  driverId          String?    // Legacy
  driver            Person?    @relation("LegacyDriver", fields: [driverId], references: [id])
  
  // Keep string status for legacy if needed? We replaced it with DeliveryStatus enum.
  // We'll let Prisma handle the type change (migration will require care, but acceptable for Phase 1 domain foundation).
}

model DeliveryAssignment {
  id              String       @id @default(uuid())
  deliveryJobId   String
  driverProfileId String
  vehicleId       String?
  status          AssignmentStatus @default(PENDING)
  assignedAt      DateTime     @default(now())
  respondedAt     DateTime?
  completedAt     DateTime?
  
  deliveryJob     DeliveryJob  @relation(fields: [deliveryJobId], references: [id], onDelete: Cascade)
  driverProfile   LogisticsDriverProfile @relation(fields: [driverProfileId], references: [id])
  vehicle         LogisticsVehicle? @relation(fields: [vehicleId], references: [id])

  // Idempotency constraint to prevent duplicate active assignments
  @@unique([deliveryJobId, driverProfileId, status]) 
}

model DeliveryTrackingEvent {
  id              String       @id @default(uuid())
  deliveryJobId   String
  status          DeliveryStatus
  latitude        Float?
  longitude       Float?
  notes           String?
  recordedAt      DateTime     @default(now())

  deliveryJob     DeliveryJob  @relation(fields: [deliveryJobId], references: [id], onDelete: Cascade)
}

model ProofOfDelivery {
  id              String       @id @default(uuid())
  deliveryJobId   String
  type            String       // e.g., SIGNATURE, PHOTO, PIN
  evidenceUrl     String?      // Reference to Asset/Image
  recipientName   String?
  notes           String?
  verifiedAt      DateTime     @default(now())
  latitude        Float?
  longitude       Float?

  deliveryJob     DeliveryJob  @relation(fields: [deliveryJobId], references: [id], onDelete: Cascade)
}
"""
    
    content = re.sub(delivery_job_regex, new_logistics_models, content, flags=re.DOTALL)

    with open('src/prisma/contract.prisma', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Prisma schema updated successfully.")

if __name__ == "__main__":
    modify_prisma()

import re

with open('src/prisma/contract.prisma', 'r') as f:
    lines = f.readlines()

new_lines = []
skip = False
model_name = ""

models_to_drop = {
    "Account", "Session", "User", "OrganizationMember", "RetailCustomer", "OrgCustomer",
    "Student", "StudentParent", "StaffProfile", "ServiceStaff", "Wallet", "Transaction"
}

# New models to add at the top
new_models_top = """
// ============================================================================
// IAM & GLOBAL IDENTITY
// ============================================================================

model Person {
  id             String             @id @default(uuid())
  firstName      String
  lastName       String
  dateOfBirth    DateTime?
  
  account        Account?           
  identifiers    PersonIdentifier[]
  profile        ResidentProfile?
  
  // Cross-tenant interactions
  memberships    Membership[]
  relationships  Relationship[]
  
  // Family
  guardianLinks  FamilyLink[]       @relation("GuardianToWard")
  wardLinks      FamilyLink[]       @relation("WardToGuardian")
  
  // Financial
  wallets        Wallet[]
  
  // Miscellaneous Global Connections
  gigProfile     GigWorkerProfile?
  reservations   Reservation[]      @relation("GuestReservations")
  tickets        Ticket[]           @relation("UserTickets")
  bookings       Booking[]          @relation("UserBookings")
  restaurantOrders RestaurantOrder[] @relation("ResidentRestaurantOrders")
  comments       Comment[]          @relation("UserComments")
  postLikes      PostLike[]
  noticeReads    NoticeRead[]
  sentMessages   Message[]          @relation("SentMessages")
  receivedMessages MessageRecipient[]
  enrolmentRequests EnrolmentRequest[] @relation("RequestedBy")
  reviewedRequests EnrolmentRequest[]  @relation("ReviewedBy")
  createdEvents  SchoolEvent[]      @relation("CreatedSchoolEvents")
  createdNotices Notice[]           @relation("UserNotices")
  studentNotes   StudentNote[]      @relation("UserStudentNotes")
  
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @default(now())
}

model PersonIdentifier {
  id              String   @id @default(uuid())
  personId        String
  type            String   // 'EMAIL' | 'PHONE'
  normalizedValue String   
  isVerified      Boolean  @default(false)
  verifiedAt      DateTime?
  
  person          Person   @relation(fields: [personId], references: [id], onDelete: Cascade)
  claims          IdentityClaim[]
  
  @@unique([type, normalizedValue])
  @@index([normalizedValue])
}

model Account {
  id            String         @id @default(uuid())
  personId      String         @unique
  passwordHash  String?
  isActive      Boolean        @default(true)
  lastLoginAt   DateTime?
  
  person        Person         @relation(fields: [personId], references: [id], onDelete: Cascade)
  providers     AuthProvider[]
  sessions      Session[]
  
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @default(now())
}

model Session {
  id           String   @id @default(uuid())
  sessionToken String   @unique
  accountId    String
  expires      DateTime
  account      Account  @relation(fields: [accountId], references: [id], onDelete: Cascade)
}

model AuthProvider {
  id                String   @id @default(uuid())
  accountId         String
  providerId        String   
  providerAccountId String   
  
  account           Account  @relation(fields: [accountId], references: [id], onDelete: Cascade)
  
  @@unique([providerId, providerAccountId])
}

model ResidentProfile {
  id        String  @id @default(uuid())
  personId  String  @unique
  avatarUrl String?
  timezone  String  @default("UTC")
  
  person    Person  @relation(fields: [personId], references: [id], onDelete: Cascade)
}

model IdentityClaim {
  id                 String           @id @default(uuid())
  personIdentifierId String
  claimedByAccountId String
  status             String           
  claimedAt          DateTime         @default(now())
  resolvedAt         DateTime?
  
  identifier         PersonIdentifier @relation(fields: [personIdentifierId], references: [id], onDelete: Cascade)
}

// ============================================================================
// WORKFORCE & CONSUMER RELATIONSHIPS
// ============================================================================

model Membership {
  id             String       @id @default(uuid())
  organizationId String
  personId       String
  
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  person         Person       @relation(fields: [personId], references: [id], onDelete: Cascade)
  
  roles          MembershipRole[]
  locationAccess MembershipLocation[]
  staffData      StaffData?
  
  // Domain Links
  timetableSlots TimetableSlot[]
  timetableRequirements TimetableRequirement[]
  leaveRequests  LeaveRequest[]
  attendance     StaffAttendance[]
  subjects       TeacherSubject[]
  classTeachers  ClassTeacher[]
  formTeachers   ClassSection[] @relation("ClassSectionFormTeacher")
  appointments   Appointment[]  @relation("DoctorAppointments")
  serviceAppointments ServiceAppointment[]
  serviceJobs    ServiceJob[]
  
  createdAt      DateTime     @default(now())
  
  @@unique([organizationId, personId])
  @@index([personId])
}

model MembershipRole {
  id           String     @id @default(uuid())
  membershipId String
  role         String     
  
  membership   Membership @relation(fields: [membershipId], references: [id], onDelete: Cascade)
  
  @@unique([membershipId, role])
}

model MembershipLocation {
  id           String     @id @default(uuid())
  membershipId String
  locationId   String
  
  membership   Membership @relation(fields: [membershipId], references: [id], onDelete: Cascade)
  location     Location   @relation(fields: [locationId], references: [id], onDelete: Cascade)
  
  @@unique([membershipId, locationId])
}

model Relationship {
  id             String       @id @default(uuid())
  organizationId String
  personId       String
  type           String       
  
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  person         Person       @relation(fields: [personId], references: [id], onDelete: Cascade)
  
  studentData    StudentData?
  customerData   CustomerData?
  patientData    PatientData?
  guardianAuths  GuardianAuthorization[]
  
  createdAt      DateTime     @default(now())
  
  @@unique([organizationId, personId, type])
  @@index([personId])
}

model StudentData {
  id             String       @id @default(uuid())
  relationshipId String       @unique
  admissionNo    String?
  yearLevel      Int?
  
  relationship   Relationship @relation(fields: [relationshipId], references: [id], onDelete: Cascade)
  
  classEnrolments ClassEnrolment[]
  attendance      Attendance[]
  grades          Grade[]
  feeInvoices     FeeInvoice[]
  documents       Document[]
  exitRecord      StudentExit?
  transferIn      StudentTransferIn?
  behaviourIncidents BehaviourIncident[]
  suspensions     Suspension[]
  truancyAlerts   TruancyAlert[]
  notes           StudentNote[]
  waitlistEntries WaitlistEntry[]
  enrolmentRequests EnrolmentRequest[]
  classSectionId  String?
  classSection    ClassSection? @relation(fields: [classSectionId], references: [id])
}

model CustomerData {
  id             String       @id @default(uuid())
  relationshipId String       @unique
  loyaltyPoints  Int          @default(0)
  notes          String?
  
  relationship   Relationship @relation(fields: [relationshipId], references: [id], onDelete: Cascade)
  
  retailOrders   RetailOrder[]
  serviceAppointments ServiceAppointment[]
  serviceJobs    ServiceJob[]
  quotes         ServiceJobQuote[]
  invoices       ServiceInvoice[]
}

model PatientData {
  id             String       @id @default(uuid())
  relationshipId String       @unique
  medicalNotes   String?
  
  relationship   Relationship @relation(fields: [relationshipId], references: [id], onDelete: Cascade)
  
  appointments   Appointment[] @relation("PatientAppointments")
  prescriptions  Prescription[] @relation("PatientPrescriptions")
  pharmacyOrders PharmacyOrder[] @relation("PatientPharmacyOrders")
}

model StaffData {
  id             String       @id @default(uuid())
  membershipId   String       @unique
  employeeId     String?
  bio            String?
  department     String?
  
  membership     Membership   @relation(fields: [membershipId], references: [id], onDelete: Cascade)
}

model Invitation {
  id             String       @id @default(uuid())
  organizationId String
  email          String?
  phone          String?
  role           String
  token          String       @unique
  expiresAt      DateTime
  
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}

model FamilyLink {
  id               String   @id @default(uuid())
  guardianPersonId String
  wardPersonId     String
  type             String   
  
  guardian         Person   @relation("GuardianToWard", fields: [guardianPersonId], references: [id], onDelete: Cascade)
  ward             Person   @relation("WardToGuardian", fields: [wardPersonId], references: [id], onDelete: Cascade)
  
  @@unique([guardianPersonId, wardPersonId])
}

model GuardianAuthorization {
  id                 String       @id @default(uuid())
  organizationId     String
  guardianPersonId   String
  wardRelationshipId String
  permissions        String       
  
  organization       Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  wardRelationship   Relationship @relation(fields: [wardRelationshipId], references: [id], onDelete: Cascade)
  
  @@unique([organizationId, guardianPersonId, wardRelationshipId])
}

model Location {
  id             String       @id @default(uuid())
  organizationId String
  name           String
  address        String?
  
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  memberAccess   MembershipLocation[]
}

// ============================================================================
// FINANCIAL & LEDGER
// ============================================================================

model Wallet {
  id             String       @id @default(uuid())
  balance        Float        @default(0.0) 
  currency       String       @default("USD")
  
  personId       String?      
  organizationId String?      
  
  person         Person?      @relation(fields: [personId], references: [id], onDelete: Restrict)
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: Restrict)
  
  entries        LedgerEntry[]
  
  @@unique([personId])
  @@unique([organizationId])
}

model Transaction {
  id             String       @id @default(uuid())
  status         String       
  reference      String?
  description    String?
  
  entries        LedgerEntry[]
  
  createdAt      DateTime     @default(now())
}

model LedgerEntry {
  id             String       @id @default(uuid())
  walletId       String
  transactionId  String
  amount         Float        
  currency       String
  
  wallet         Wallet       @relation(fields: [walletId], references: [id], onDelete: Restrict)
  transaction    Transaction  @relation(fields: [transactionId], references: [id], onDelete: Restrict)
  
  createdAt      DateTime     @default(now())
  
  @@index([walletId])
  @@index([transactionId])
}
"""

for line in lines:
    if line.startswith("model "):
        model_name = line.split(" ")[1].split("{")[0].strip()
        if model_name in models_to_drop:
            skip = True
        else:
            skip = False
    elif line.startswith("enum "):
        skip = False

    if not skip:
        # Regex replacements for User -> Person
        line = re.sub(r'\bUser\b(?!(\s*@relation|\s*@unique|\s*@index))', 'Person', line)
        line = re.sub(r'userId(\s+String)', r'personId\1', line)
        line = re.sub(r'fields: \[userId\]', 'fields: [personId]', line)
        
        # Replace OrgCustomer -> CustomerData
        line = re.sub(r'customerId(\s+String)', r'customerDataId\1', line)
        line = re.sub(r'fields: \[customerId\]', 'fields: [customerDataId]', line)
        line = re.sub(r'\bOrgCustomer\b', 'CustomerData', line)
        line = re.sub(r'\bRetailCustomer\b', 'CustomerData', line)

        # Replace ServiceStaff -> Membership
        line = re.sub(r'staffId(\s+String)', r'membershipId\1', line)
        line = re.sub(r'fields: \[staffId\]', 'fields: [membershipId]', line)
        line = re.sub(r'\bServiceStaff\b', 'Membership', line)
        line = re.sub(r'\bStaffProfile\b', 'Membership', line)
        
        # Replace Student -> StudentData
        line = re.sub(r'studentId(\s+String)', r'studentDataId\1', line)
        line = re.sub(r'fields: \[studentId\]', 'fields: [studentDataId]', line)
        line = re.sub(r'\bStudent\b', 'StudentData', line)
        line = re.sub(r'\bStudent\?([^\n]*@relation)', r'StudentData?\1', line)

        # Remove deleted relations from Organization
        if model_name == "Organization":
            if "members " in line or "orgCustomers" in line or "retailCustomers" in line or "serviceStaff" in line or "students " in line:
                continue
            
        new_lines.append(line)

# Remove the original universal identity section (from the top up to City model or similar)
final_lines = []
in_header = True
for line in new_lines:
    if "model City" in line:
        in_header = False
    if not in_header:
        final_lines.append(line)

with open('scratch/new_contract.prisma', 'w') as f:
    f.write(new_models_top)
    f.write("\n")
    f.writelines(final_lines)

print("Created scratch/new_contract.prisma")

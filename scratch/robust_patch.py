import re

def main():
    with open('src/prisma/contract.prisma', 'r') as f:
        content = f.read()

    models_to_remove = [
        "Account", "Session", "User", "OrganizationMember", "RetailCustomer", 
        "OrgCustomer", "Student", "StudentParent", "StaffProfile", 
        "ServiceStaff", "Wallet", "Transaction"
    ]
    
    for model in models_to_remove:
        pattern = r"model\s+" + model + r"\s+\{(?:[^{}]|(?:\{[^{}]*\}))*?\}"
        content = re.sub(pattern, "", content)

    # User -> Person for specified models
    def replace_user(model_name, id_field_old, id_field_new, relation_name=None):
        nonlocal content
        # This function is not used, doing it manually for precision
        pass

    # 1. GigWorkerProfile
    content = re.sub(r'(\bGigWorkerProfile\b[\s\S]*?)userId(\s+String)', r'\1personId\2', content)
    content = re.sub(r'(\bGigWorkerProfile\b[\s\S]*?)user(\s+)User(\s+)@relation\(fields:\s*\[userId\]', r'\1person\2Person\3@relation(fields: [personId]', content)

    # 2. Task
    content = re.sub(r'(\bTask\b[\s\S]*?)requesterId(\s+String)', r'\1requesterPersonId\2', content)
    content = re.sub(r'(\bTask\b[\s\S]*?)requester(\s+)User', r'\1requester\2Person', content)
    content = re.sub(r'(\bTask\b[\s\S]*?)fields:\s*\[requesterId\]', r'\1fields: [requesterPersonId]', content)

    content = re.sub(r'(\bTask\b[\s\S]*?)courierId(\s+String\?)', r'\1courierPersonId\2', content)
    content = re.sub(r'(\bTask\b[\s\S]*?)courier(\s+)User\?', r'\1courier\2Person?', content)
    content = re.sub(r'(\bTask\b[\s\S]*?)fields:\s*\[courierId\]', r'\1fields: [courierPersonId]', content)

    # 3. PostLike
    content = re.sub(r'(\bPostLike\b[\s\S]*?)userId(\s+String)', r'\1personId\2', content)
    content = re.sub(r'(\bPostLike\b[\s\S]*?)user(\s+)User', r'\1person\2Person', content)
    content = re.sub(r'(\bPostLike\b[\s\S]*?)fields:\s*\[userId\]', r'\1fields: [personId]', content)
    content = re.sub(r'(\bPostLike\b[\s\S]*?)@@unique\(\[postId,\s*userId\]\)', r'\1@@unique([postId, personId])', content)

    # 4. Comment
    content = re.sub(r'(\bComment\b[\s\S]*?)userId(\s+String)', r'\1personId\2', content)
    content = re.sub(r'(\bComment\b[\s\S]*?)user(\s+)User', r'\1person\2Person', content)
    content = re.sub(r'(\bComment\b[\s\S]*?)fields:\s*\[userId\]', r'\1fields: [personId]', content)

    # 5. Reservation
    content = re.sub(r'(\bReservation\b[\s\S]*?)guestId(\s+String\?)', r'\1guestPersonId\2', content)
    content = re.sub(r'(\bReservation\b[\s\S]*?)guest(\s+)User\?', r'\1guest\2Person?', content)
    content = re.sub(r'(\bReservation\b[\s\S]*?)fields:\s*\[guestId\]', r'\1fields: [guestPersonId]', content)

    # 6. RestaurantOrder
    content = re.sub(r'(\bRestaurantOrder\b[\s\S]*?)residentId(\s+String\?)', r'\1residentPersonId\2', content)
    content = re.sub(r'(\bRestaurantOrder\b[\s\S]*?)resident(\s+)User\?', r'\1resident\2Person?', content)
    content = re.sub(r'(\bRestaurantOrder\b[\s\S]*?)fields:\s*\[residentId\]', r'\1fields: [residentPersonId]', content)

    # 7. Ticket
    content = re.sub(r'(\bTicket\b[\s\S]*?)userId(\s+String)', r'\1personId\2', content)
    content = re.sub(r'(\bTicket\b[\s\S]*?)user(\s+)User', r'\1person\2Person', content)
    content = re.sub(r'(\bTicket\b[\s\S]*?)fields:\s*\[userId\]', r'\1fields: [personId]', content)

    # 8. Booking
    content = re.sub(r'(\bBooking\b[\s\S]*?)userId(\s+String)', r'\1personId\2', content)
    content = re.sub(r'(\bBooking\b[\s\S]*?)user(\s+)User', r'\1person\2Person', content)
    content = re.sub(r'(\bBooking\b[\s\S]*?)fields:\s*\[userId\]', r'\1fields: [personId]', content)

    # 9. Appointment
    content = re.sub(r'(\bAppointment\b[\s\S]*?)patientId(\s+String)', r'\1patientPersonId\2', content)
    content = re.sub(r'(\bAppointment\b[\s\S]*?)patient(\s+)User', r'\1patient\2Person', content)
    content = re.sub(r'(\bAppointment\b[\s\S]*?)fields:\s*\[patientId\]', r'\1fields: [patientPersonId]', content)

    content = re.sub(r'(\bAppointment\b[\s\S]*?)doctorId(\s+String)', r'\1staffMembershipId\2', content)
    content = re.sub(r'(\bAppointment\b[\s\S]*?)doctor(\s+)OrganizationMember', r'\1doctor\2Membership', content)
    content = re.sub(r'(\bAppointment\b[\s\S]*?)fields:\s*\[doctorId\]', r'\1fields: [staffMembershipId]', content)

    # 10. Prescription
    content = re.sub(r'(\bPrescription\b[\s\S]*?)patientId(\s+String)', r'\1patientPersonId\2', content)
    content = re.sub(r'(\bPrescription\b[\s\S]*?)patient(\s+)User', r'\1patient\2Person', content)
    content = re.sub(r'(\bPrescription\b[\s\S]*?)fields:\s*\[patientId\]', r'\1fields: [patientPersonId]', content)

    # 11. PharmacyOrder
    content = re.sub(r'(\bPharmacyOrder\b[\s\S]*?)residentId(\s+String\?)', r'\1residentPersonId\2', content)
    content = re.sub(r'(\bPharmacyOrder\b[\s\S]*?)resident(\s+)User\?', r'\1resident\2Person?', content)
    content = re.sub(r'(\bPharmacyOrder\b[\s\S]*?)fields:\s*\[residentId\]', r'\1fields: [residentPersonId]', content)

    # 12. NoticeRead
    content = re.sub(r'(\bNoticeRead\b[\s\S]*?)userId(\s+String)', r'\1personId\2', content)
    content = re.sub(r'(\bNoticeRead\b[\s\S]*?)user(\s+)User', r'\1person\2Person', content)
    content = re.sub(r'(\bNoticeRead\b[\s\S]*?)fields:\s*\[userId\]', r'\1fields: [personId]', content)
    content = re.sub(r'(\bNoticeRead\b[\s\S]*?)@@unique\(\[noticeId,\s*userId\]\)', r'\1@@unique([noticeId, personId])', content)

    # 13. Message
    content = re.sub(r'(\bMessage\b[\s\S]*?)senderId(\s+String)', r'\1senderPersonId\2', content)
    content = re.sub(r'(\bMessage\b[\s\S]*?)sender(\s+)User', r'\1sender\2Person', content)
    content = re.sub(r'(\bMessage\b[\s\S]*?)fields:\s*\[senderId\]', r'\1fields: [senderPersonId]', content)

    # 14. MessageRecipient
    content = re.sub(r'(\bMessageRecipient\b[\s\S]*?)userId(\s+String)', r'\1personId\2', content)
    content = re.sub(r'(\bMessageRecipient\b[\s\S]*?)user(\s+)User', r'\1person\2Person', content)
    content = re.sub(r'(\bMessageRecipient\b[\s\S]*?)fields:\s*\[userId\]', r'\1fields: [personId]', content)
    content = re.sub(r'(\bMessageRecipient\b[\s\S]*?)@@unique\(\[messageId,\s*userId\]\)', r'\1@@unique([messageId, personId])', content)

    # 15. EnrolmentRequest
    content = re.sub(r'(\bEnrolmentRequest\b[\s\S]*?)requestedById(\s+String)', r'\1requestedByPersonId\2', content)
    content = re.sub(r'(\bEnrolmentRequest\b[\s\S]*?)requestedBy(\s+)User', r'\1requestedBy\2Person', content)
    content = re.sub(r'(\bEnrolmentRequest\b[\s\S]*?)fields:\s*\[requestedById\]', r'\1fields: [requestedByPersonId]', content)

    content = re.sub(r'(\bEnrolmentRequest\b[\s\S]*?)reviewedById(\s+String\?)', r'\1reviewedByPersonId\2', content)
    content = re.sub(r'(\bEnrolmentRequest\b[\s\S]*?)reviewedBy(\s+)User\?', r'\1reviewedBy\2Person?', content)
    content = re.sub(r'(\bEnrolmentRequest\b[\s\S]*?)fields:\s*\[reviewedById\]', r'\1fields: [reviewedByPersonId]', content)

    content = re.sub(r'(\bEnrolmentRequest\b[\s\S]*?)studentId(\s+String)', r'\1studentDataId\2', content)
    content = re.sub(r'(\bEnrolmentRequest\b[\s\S]*?)student(\s+)Student(\s)', r'\1student\2StudentData\3', content)
    content = re.sub(r'(\bEnrolmentRequest\b[\s\S]*?)fields:\s*\[studentId\]', r'\1fields: [studentDataId]', content)
    content = re.sub(r'(\bEnrolmentRequest\b[\s\S]*?)@@unique\(\[classId,\s*studentId\]\)', r'\1@@unique([classId, studentDataId])', content)

    # 16. SchoolEvent
    content = re.sub(r'(\bSchoolEvent\b[\s\S]*?)createdById(\s+String)', r'\1createdByPersonId\2', content)
    content = re.sub(r'(\bSchoolEvent\b[\s\S]*?)createdBy(\s+)User', r'\1createdBy\2Person', content)
    content = re.sub(r'(\bSchoolEvent\b[\s\S]*?)fields:\s*\[createdById\]', r'\1fields: [createdByPersonId]', content)

    # 17. Notice
    content = re.sub(r'(\bNotice\b[\s\S]*?)authorId(\s+String)', r'\1authorPersonId\2', content)
    content = re.sub(r'(\bNotice\b[\s\S]*?)author(\s+)User', r'\1author\2Person', content)
    content = re.sub(r'(\bNotice\b[\s\S]*?)fields:\s*\[authorId\]', r'\1fields: [authorPersonId]', content)

    # 18. StudentNote
    content = re.sub(r'(\bStudentNote\b[\s\S]*?)authorId(\s+String)', r'\1authorPersonId\2', content)
    content = re.sub(r'(\bStudentNote\b[\s\S]*?)author(\s+)User', r'\1author\2Person', content)
    content = re.sub(r'(\bStudentNote\b[\s\S]*?)fields:\s*\[authorId\]', r'\1fields: [authorPersonId]', content)

    content = re.sub(r'(\bStudentNote\b[\s\S]*?)studentId(\s+String)', r'\1studentDataId\2', content)
    content = re.sub(r'(\bStudentNote\b[\s\S]*?)student(\s+)Student(\s)', r'\1student\2StudentData\3', content)
    content = re.sub(r'(\bStudentNote\b[\s\S]*?)fields:\s*\[studentId\]', r'\1fields: [studentDataId]', content)

    # Replace Student -> StudentData globally where applicable
    models_with_student = ["Document", "WaitlistEntry", "ClassEnrolment", "Attendance", "Grade", "FeeInvoice", "StudentExit", "StudentTransferIn", "BehaviourIncident", "Suspension", "TruancyAlert", "AttendanceCodeUsage"]
    for model in models_with_student:
        content = re.sub(r'(\b' + model + r'\b[\s\S]*?)studentId(\s+String)', r'\1studentDataId\2', content)
        content = re.sub(r'(\b' + model + r'\b[\s\S]*?)student(\s+)Student(\s)', r'\1student\2StudentData\3', content)
        content = re.sub(r'(\b' + model + r'\b[\s\S]*?)fields:\s*\[studentId\]', r'\1fields: [studentDataId]', content)
        # Fix composites
        content = re.sub(r'(\b' + model + r'\b[\s\S]*?)@@unique\(\[([^\]]*?)\s*,\s*studentId(.*?)\]\)', r'\1@@unique([\2, studentDataId\3])', content)
        content = re.sub(r'(\b' + model + r'\b[\s\S]*?)@@unique\(\[studentId(.*?)\]\)', r'\1@@unique([studentDataId\2])', content)

    # Fix ClassSection students array
    content = re.sub(r'(\bClassSection\b[\s\S]*?)students(\s+)Student\[\]', r'\1students\2StudentData[]', content)
    content = re.sub(r'(\bReportCard\b[\s\S]*?)studentId(\s+String)', r'\1studentDataId\2', content)

    # Replacements for StaffProfile -> Membership
    models_with_staff = ["ClassTeacher", "TeacherSubject", "TimetableSlot", "TimetableRequirement", "LeaveRequest", "StaffAttendance"]
    for model in models_with_staff:
        content = re.sub(r'(\b' + model + r'\b[\s\S]*?)staffId(\s+String)', r'\1membershipId\2', content)
        content = re.sub(r'(\b' + model + r'\b[\s\S]*?)staff(\s+)StaffProfile(\s)', r'\1staff\2Membership\3', content)
        content = re.sub(r'(\b' + model + r'\b[\s\S]*?)fields:\s*\[staffId\]', r'\1fields: [membershipId]', content)
        content = re.sub(r'(\b' + model + r'\b[\s\S]*?)@@unique\(\[([^\]]*?)\s*,\s*staffId(.*?)\]\)', r'\1@@unique([\2, membershipId\3])', content)
        content = re.sub(r'(\b' + model + r'\b[\s\S]*?)@@unique\(\[staffId(.*?)\]\)', r'\1@@unique([membershipId\2])', content)

    content = re.sub(r'(\bClassSection\b[\s\S]*?)formTeacherId(\s+String\?)', r'\1formMembershipId\2', content)
    content = re.sub(r'(\bClassSection\b[\s\S]*?)formTeacher(\s+)StaffProfile\?', r'\1formTeacher\2Membership?', content)
    content = re.sub(r'(\bClassSection\b[\s\S]*?)fields:\s*\[formTeacherId\]', r'\1fields: [formMembershipId]', content)

    # Replacements for ServiceStaff -> Membership
    for model in ["ServiceAppointment", "ServiceJob"]:
        content = re.sub(r'(\b' + model + r'\b[\s\S]*?)staffId(\s+String\?)', r'\1membershipId\2', content)
        content = re.sub(r'(\b' + model + r'\b[\s\S]*?)staff(\s+)ServiceStaff\?', r'\1staff\2Membership?', content)
        content = re.sub(r'(\b' + model + r'\b[\s\S]*?)fields:\s*\[staffId\]', r'\1fields: [membershipId]', content)

    # Replacements for OrgCustomer -> CustomerData
    for model in ["ServiceAppointment", "ServiceJob", "ServiceJobQuote", "ServiceInvoice"]:
        content = re.sub(r'(\b' + model + r'\b[\s\S]*?)customerId(\s+String)', r'\1customerDataId\2', content)
        content = re.sub(r'(\b' + model + r'\b[\s\S]*?)customer(\s+)OrgCustomer(\s)', r'\1customer\2CustomerData\3', content)
        content = re.sub(r'(\b' + model + r'\b[\s\S]*?)fields:\s*\[customerId\]', r'\1fields: [customerDataId]', content)

    # Replacements for RetailCustomer -> CustomerData
    content = re.sub(r'(\bRetailOrder\b[\s\S]*?)customerId(\s+String\?)', r'\1customerDataId\2', content)
    content = re.sub(r'(\bRetailOrder\b[\s\S]*?)customer(\s+)RetailCustomer\?', r'\1customer\2CustomerData?', content)
    content = re.sub(r'(\bRetailOrder\b[\s\S]*?)fields:\s*\[customerId\]', r'\1fields: [customerDataId]', content)

    # Organization cleanups
    content = re.sub(r'members\s+OrganizationMember\[\]\s*\n?', '', content)
    content = re.sub(r'students\s+Student\[\]\s+@relation\("SchoolStudents"\)\s*\n?', '', content)
    content = re.sub(r'orgCustomers\s+OrgCustomer\[\]\s+@relation\("OrgCustomers"\)\s*\n?', '', content)
    content = re.sub(r'retailCustomers\s+RetailCustomer\[\]\s+@relation\("OrgRetailCustomers"\)\s*\n?', '', content)
    content = re.sub(r'serviceStaff\s+ServiceStaff\[\]\s+@relation\("OrgServiceStaff"\)\s*\n?', '', content)
    content = re.sub(r'wallet\s+Wallet\?\s*\n?', '', content)


    # The new models chunk
    new_models = """
model Person {
  id             String             @id @default(uuid())
  firstName      String
  lastName       String
  dateOfBirth    DateTime?
  
  account        Account?           
  identifiers    PersonIdentifier[]
  profile        ResidentProfile?
  
  memberships    Membership[]
  relationships  Relationship[]
  
  guardianLinks  FamilyLink[]       @relation("GuardianToWard")
  wardLinks      FamilyLink[]       @relation("WardToGuardian")
  wallets        Wallet[]

  gigProfile     GigWorkerProfile?
  requestedTasks Task[]             @relation("TaskRequester")
  acceptedTasks  Task[]             @relation("TaskCourier")
  reservations   Reservation[]      @relation("GuestReservations")
  restaurantOrders RestaurantOrder[] @relation("ResidentRestaurantOrders")
  tickets        Ticket[]           @relation("UserTickets")
  bookings       Booking[]          @relation("UserBookings")
  appointments   Appointment[]      @relation("PatientAppointments")
  prescriptions  Prescription[]     @relation("PatientPrescriptions")
  pharmacyOrders PharmacyOrder[]    @relation("ResidentPharmacyOrders")
  postLikes      PostLike[]
  comments       Comment[]          @relation("UserComments")
  noticeReads    NoticeRead[]       @relation("UserNoticeReads")
  sentMessages   Message[]          @relation("SentMessages")
  receivedMessages MessageRecipient[] @relation("ReceivedMessages")
  enrolmentRequests EnrolmentRequest[] @relation("RequestedBy")
  reviewedRequests EnrolmentRequest[] @relation("ReviewedBy")
  createdEvents  SchoolEvent[]      @relation("CreatedSchoolEvents")
  createdNotices Notice[]           @relation("UserNotices")
  studentNotes   StudentNote[]      @relation("UserStudentNotes")
  
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @default(now())
}

model PersonIdentifier {
  id              String   @id @default(uuid())
  personId        String
  type            String   
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
  
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @default(now())
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

model Membership {
  id             String       @id @default(uuid())
  organizationId String
  personId       String
  
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  person         Person       @relation(fields: [personId], references: [id], onDelete: Cascade)
  
  roles          MembershipRole[]
  locationAccess MembershipLocation[]
  staffData      StaffData?

  classes                 ClassTeacher[]
  timetableSlots          TimetableSlot[]
  timetableRequirements   TimetableRequirement[]
  leaveRequests           LeaveRequest[]
  attendance              StaffAttendance[]
  subjects                TeacherSubject[]      
  formClasses             ClassSection[]        @relation("ClassSectionFormTeacher")
  doctorAppointments      Appointment[]         @relation("DoctorAppointments")
  serviceAppointments     ServiceAppointment[]
  serviceJobs             ServiceJob[]
  
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
  
  classSectionId String?
  classSection   ClassSection? @relation(fields: [classSectionId], references: [id])
  
  relationship   Relationship @relation(fields: [relationshipId], references: [id], onDelete: Cascade)
  
  classEnrolments     ClassEnrolment[]
  attendance          Attendance[]
  grades              Grade[]
  feeInvoices         FeeInvoice[]
  documents           Document[]
  exitRecord          StudentExit?
  transferIn          StudentTransferIn?
  behaviourIncidents  BehaviourIncident[]
  suspensions         Suspension[]
  truancyAlerts       TruancyAlert[]
  notes               StudentNote[]
  waitlistEntries     WaitlistEntry[]
  enrolmentRequests   EnrolmentRequest[]
}

model CustomerData {
  id             String       @id @default(uuid())
  relationshipId String       @unique
  loyaltyPoints  Int          @default(0)
  notes          String?
  
  relationship   Relationship @relation(fields: [relationshipId], references: [id], onDelete: Cascade)

  retailOrders   RetailOrder[]
  appointments   ServiceAppointment[]
  jobs           ServiceJob[]
  quotes         ServiceJobQuote[]
  invoices       ServiceInvoice[]
}

model PatientData {
  id             String       @id @default(uuid())
  relationshipId String       @unique
  medicalNotes   String?
  
  relationship   Relationship @relation(fields: [relationshipId], references: [id], onDelete: Cascade)
}

model StaffData {
  id             String       @id @default(uuid())
  membershipId   String       @unique
  employeeId     String?
  bio            String?
  
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
    
    with open('src/prisma/contract.prisma', 'w') as f:
        f.write(new_models + "\n" + content)
        
    print("Robust patch complete")

if __name__ == "__main__":
    main()

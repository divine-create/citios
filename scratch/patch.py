import re
import sys

def main():
    try:
        with open('src/prisma/contract.prisma', 'r') as f:
            content = f.read()
    except FileNotFoundError:
        print("contract.prisma not found")
        sys.exit(1)

    # Models to completely remove
    models_to_remove = [
        "Account", "Session", "User", "OrganizationMember", "RetailCustomer", 
        "OrgCustomer", "Student", "StudentParent", "StaffProfile", 
        "ServiceStaff", "Wallet", "Transaction"
    ]
    
    for model in models_to_remove:
        # Regex to match the model block
        # matches `model Name { ... }` supporting nested blocks or whatever, but prisma usually doesn't have nested
        pattern = r"model\s+" + model + r"\s+\{(?:[^{}]|(?:\{[^{}]*\}))*?\}"
        content = re.sub(pattern, "", content)
        # Also remove enums if they are obsolete, but none are strictly necessary to remove

    # 1. GigWorkerProfile
    content = content.replace("userId         String   @unique", "personId       String   @unique")
    content = content.replace("user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)", "person         Person   @relation(fields: [personId], references: [id], onDelete: Cascade)")

    # 2. Task
    content = content.replace("requesterId      String", "requesterPersonId String")
    content = content.replace("courierId        String?", "courierPersonId   String?")
    content = content.replace("requester        User          @relation(\"TaskRequester\", fields: [requesterId], references: [id])", "requester        Person        @relation(\"TaskRequester\", fields: [requesterPersonId], references: [id])")
    content = content.replace("courier          User?         @relation(\"TaskCourier\", fields: [courierId], references: [id])", "courier          Person?       @relation(\"TaskCourier\", fields: [courierPersonId], references: [id])")

    # 3. PostLike
    content = content.replace("userId         String", "personId       String")
    content = content.replace("user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)", "person         Person       @relation(fields: [personId], references: [id], onDelete: Cascade)")
    content = content.replace("@@unique([postId, userId])", "@@unique([postId, personId])")

    # 4. Comment
    content = content.replace("userId         String", "personId       String")
    content = content.replace("user           User         @relation(\"UserComments\", fields: [userId], references: [id], onDelete: Cascade)", "person         Person       @relation(\"UserComments\", fields: [personId], references: [id], onDelete: Cascade)")

    # 5. Reservation
    content = content.replace("guestId        String?", "guestPersonId  String?")
    content = content.replace("guest          User?        @relation(\"GuestReservations\", fields: [guestId], references: [id])", "guest          Person?      @relation(\"GuestReservations\", fields: [guestPersonId], references: [id])")

    # 6. RestaurantOrder
    content = content.replace("residentId     String?", "residentPersonId String?")
    content = content.replace("resident       User?        @relation(\"ResidentRestaurantOrders\", fields: [residentId], references: [id])", "resident       Person?      @relation(\"ResidentRestaurantOrders\", fields: [residentPersonId], references: [id])")

    # 7. Ticket
    content = content.replace("userId         String", "personId       String")
    content = content.replace("user           User         @relation(\"UserTickets\", fields: [userId], references: [id], onDelete: Cascade)", "person         Person       @relation(\"UserTickets\", fields: [personId], references: [id], onDelete: Cascade)")

    # 8. Booking
    content = content.replace("userId         String", "personId       String")
    content = content.replace("user           User           @relation(\"UserBookings\", fields: [userId], references: [id], onDelete: Cascade)", "person         Person         @relation(\"UserBookings\", fields: [personId], references: [id], onDelete: Cascade)")

    # 9. Appointment
    content = content.replace("patientId      String", "patientPersonId String")
    content = content.replace("doctorId       String", "staffMembershipId String")
    content = content.replace("patient        User               @relation(\"PatientAppointments\", fields: [patientId], references: [id], onDelete: Cascade)", "patient        Person             @relation(\"PatientAppointments\", fields: [patientPersonId], references: [id], onDelete: Cascade)")
    content = content.replace("doctor         OrganizationMember @relation(\"DoctorAppointments\", fields: [doctorId], references: [id], onDelete: Cascade)", "doctor         Membership         @relation(\"DoctorAppointments\", fields: [staffMembershipId], references: [id], onDelete: Cascade)")

    # 10. Prescription
    content = content.replace("patientId      String", "patientPersonId String")
    content = content.replace("patient        User               @relation(\"PatientPrescriptions\", fields: [patientId], references: [id], onDelete: Cascade)", "patient        Person             @relation(\"PatientPrescriptions\", fields: [patientPersonId], references: [id], onDelete: Cascade)")

    # 11. PharmacyOrder
    content = content.replace("residentId     String?", "residentPersonId String?")
    content = content.replace("resident       User?               @relation(\"ResidentPharmacyOrders\", fields: [residentId], references: [id], onDelete: Cascade)", "resident       Person?             @relation(\"ResidentPharmacyOrders\", fields: [residentPersonId], references: [id], onDelete: Cascade)")

    # 12. NoticeRead
    content = content.replace("userId    String", "personId  String")
    content = content.replace("user      User     @relation(\"UserNoticeReads\", fields: [userId], references: [id], onDelete: Cascade)", "person    Person   @relation(\"UserNoticeReads\", fields: [personId], references: [id], onDelete: Cascade)")
    content = content.replace("@@unique([noticeId, userId])", "@@unique([noticeId, personId])")

    # 13. Message
    content = content.replace("senderId   String", "senderPersonId String")
    content = content.replace("sender     User               @relation(\"SentMessages\", fields: [senderId], references: [id])", "sender     Person             @relation(\"SentMessages\", fields: [senderPersonId], references: [id])")

    # 14. MessageRecipient
    content = content.replace("userId    String", "personId  String")
    content = content.replace("user      User     @relation(\"ReceivedMessages\", fields: [userId], references: [id], onDelete: Cascade)", "person    Person   @relation(\"ReceivedMessages\", fields: [personId], references: [id], onDelete: Cascade)")
    content = content.replace("@@unique([messageId, userId])", "@@unique([messageId, personId])")

    # 15. EnrolmentRequest
    content = content.replace("requestedById    String", "requestedByPersonId String")
    content = content.replace("reviewedById     String?", "reviewedByPersonId  String?")
    content = content.replace("requestedBy      User      @relation(\"RequestedBy\", fields: [requestedById], references: [id])", "requestedBy      Person    @relation(\"RequestedBy\", fields: [requestedByPersonId], references: [id])")
    content = content.replace("reviewedBy       User?     @relation(\"ReviewedBy\", fields: [reviewedById], references: [id])", "reviewedBy       Person?   @relation(\"ReviewedBy\", fields: [reviewedByPersonId], references: [id])")
    content = content.replace("studentId        String", "studentDataId    String")
    content = content.replace("student          Student   @relation(fields: [studentId], references: [id], onDelete: Cascade)", "student          StudentData @relation(fields: [studentDataId], references: [id], onDelete: Cascade)")
    content = content.replace("@@unique([classId, studentId])", "@@unique([classId, studentDataId])")

    # 16. SchoolEvent
    content = content.replace("createdById String", "createdByPersonId String")
    content = content.replace("createdBy   User     @relation(\"CreatedSchoolEvents\", fields: [createdById], references: [id])", "createdBy   Person   @relation(\"CreatedSchoolEvents\", fields: [createdByPersonId], references: [id])")

    # 17. Notice
    content = content.replace("authorId    String", "authorPersonId String")
    content = content.replace("author      User       @relation(\"UserNotices\", fields: [authorId], references: [id])", "author      Person     @relation(\"UserNotices\", fields: [authorPersonId], references: [id])")

    # 18. StudentNote
    content = content.replace("authorId  String", "authorPersonId String")
    content = content.replace("author    User     @relation(\"UserStudentNotes\", fields: [authorId], references: [id], onDelete: Cascade)", "author    Person   @relation(\"UserStudentNotes\", fields: [authorPersonId], references: [id], onDelete: Cascade)")
    content = content.replace("studentId String", "studentDataId String")
    content = content.replace("student   Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)", "student   StudentData @relation(fields: [studentDataId], references: [id], onDelete: Cascade)")

    # Replacements for Student relations in other models
    for model_with_student in ["Document", "WaitlistEntry", "ClassEnrolment", "Attendance", "Grade", "FeeInvoice", "StudentExit", "StudentTransferIn", "BehaviourIncident", "Suspension", "TruancyAlert", "AttendanceCodeUsage"]:
        content = content.replace(f"studentId  String", f"studentDataId String")
        content = content.replace(f"studentId         String", f"studentDataId     String")
        content = content.replace(f"studentId    String", f"studentDataId String")
        content = content.replace(f"studentId   String", f"studentDataId String")
        content = content.replace(f"studentId String", f"studentDataId String")
        content = content.replace(f"student    Student  @relation(fields: [studentId]", f"student    StudentData @relation(fields: [studentDataId]")
        content = content.replace(f"student     Student   @relation(fields: [studentId]", f"student     StudentData @relation(fields: [studentDataId]")
        content = content.replace(f"student           Student  @relation(fields: [studentId]", f"student           StudentData @relation(fields: [studentDataId]")
        content = content.replace(f"student         Student  @relation(fields: [studentId]", f"student         StudentData @relation(fields: [studentDataId]")
        content = content.replace(f"student      Student     @relation(fields: [studentId]", f"student      StudentData @relation(fields: [studentDataId]")
        content = content.replace(f"student          Student           @relation(fields: [studentId]", f"student          StudentData       @relation(fields: [studentDataId]")

    content = content.replace("@@unique([classId, studentId])", "@@unique([classId, studentDataId])")
    content = content.replace("@@unique([gradebookId, studentId])", "@@unique([gradebookId, studentDataId])")
    content = content.replace("@@unique([studentId, termId])", "@@unique([studentDataId, termId])")
    content = content.replace("@@unique([studentId, date])", "@@unique([studentDataId, date])")
    content = content.replace("@@unique([codeId, studentId])", "@@unique([codeId, studentDataId])")

    # Replacements for ReportCard
    content = content.replace("studentId      String", "studentDataId  String")

    # Replacements for StaffProfile
    content = content.replace("formTeacherId  String?", "formMembershipId String?")
    content = content.replace("formTeacher    StaffProfile? @relation(\"ClassSectionFormTeacher\", fields: [formTeacherId], references: [id])", "formTeacher    Membership?   @relation(\"ClassSectionFormTeacher\", fields: [formMembershipId], references: [id])")
    
    for staff_ref in ["ClassTeacher", "TeacherSubject", "TimetableSlot", "TimetableRequirement", "LeaveRequest", "StaffAttendance"]:
        content = content.replace("staffId   String", "membershipId String")
        content = content.replace("staffId  String", "membershipId String")
        content = content.replace("staffId         String", "membershipId String")
        content = content.replace("staffId         String?", "membershipId String?")
        content = content.replace("staffId   String?", "membershipId String?")
        content = content.replace("staff     StaffProfile", "staff     Membership")
        content = content.replace("staff           StaffProfile", "staff           Membership")
        content = content.replace("staff       StaffProfile", "staff       Membership")
        content = content.replace("staff    StaffProfile", "staff    Membership")
        content = content.replace("fields: [staffId]", "fields: [membershipId]")
    content = content.replace("@@unique([classId, staffId])", "@@unique([classId, membershipId])")
    content = content.replace("@@unique([staffId, subjectId])", "@@unique([membershipId, subjectId])")
    content = content.replace("@@unique([staffId, date])", "@@unique([membershipId, date])")

    # Replacements for ServiceStaff
    content = content.replace("staffId        String?", "membershipId   String?")
    content = content.replace("staff          ServiceStaff?", "staff          Membership?")

    # Replacements for OrgCustomer
    content = content.replace("customerId     String", "customerDataId String")
    content = content.replace("customer       OrgCustomer", "customer       CustomerData")
    content = content.replace("fields: [customerId]", "fields: [customerDataId]")

    # Replacements for RetailCustomer
    content = content.replace("customerId     String?", "customerDataId String?")
    content = content.replace("customer       RetailCustomer?", "customer       CustomerData?")

    # Remove references to `Organization.members`, `Organization.students`, `Organization.orgCustomers`, `Organization.retailCustomers`, `Organization.serviceStaff`
    content = re.sub(r'members\s+OrganizationMember\[\]', '', content)
    content = re.sub(r'students\s+Student\[\]\s+@relation\(\"SchoolStudents\"\)', '', content)
    content = re.sub(r'orgCustomers\s+OrgCustomer\[\]\s+@relation\(\"OrgCustomers\"\)', '', content)
    content = re.sub(r'retailCustomers\s+RetailCustomer\[\]\s+@relation\(\"OrgRetailCustomers\"\)', '', content)
    content = re.sub(r'serviceStaff\s+ServiceStaff\[\]\s+@relation\(\"OrgServiceStaff\"\)', '', content)
    content = re.sub(r'wallet\s+Wallet\?', '', content)

    # Now append the new models
    new_models = """

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
  subjects                TeacherSubject[]      @relation("StaffSubjects")
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

    content = content + "\n" + new_models
    
    with open('scratch/new_contract.prisma', 'w') as f:
        f.write(content)
        
    print("Patch complete")

if __name__ == "__main__":
    main()

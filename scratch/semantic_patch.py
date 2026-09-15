import re
import sys

def main():
    try:
        with open('src/prisma/contract.prisma', 'r') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading file: {e}")
        sys.exit(1)

    # Helper for regex replace
    def r(pattern, repl):
        nonlocal content
        content = re.sub(pattern, repl, content)

    # 1. Notice
    r(r'authorPersonId(\s+)String', r'authorMembershipId\1String')
    r(r'author(\s+)Person(\s+)@relation\("UserNotices",\s*fields:\s*\[authorPersonId\]', r'author\1Membership\2@relation("UserNotices", fields: [authorMembershipId]')
    r(r'createdNotices(\s+)Notice\[\](\s+)@relation\("UserNotices"\)\s*\n', '')

    # 2. SchoolEvent
    r(r'createdByPersonId(\s+)String', r'createdByMembershipId\1String')
    r(r'createdBy(\s+)Person(\s+)@relation\("CreatedSchoolEvents",\s*fields:\s*\[createdByPersonId\]', r'createdBy\1Membership\2@relation("CreatedSchoolEvents", fields: [createdByMembershipId]')
    r(r'createdEvents(\s+)SchoolEvent\[\](\s+)@relation\("CreatedSchoolEvents"\)\s*\n', '')

    # 3. StudentNote
    r(r'authorPersonId(\s+)String', r'authorMembershipId\1String')
    r(r'author(\s+)Person(\s+)@relation\("UserStudentNotes",\s*fields:\s*\[authorPersonId\]', r'author\1Membership\2@relation("UserStudentNotes", fields: [authorMembershipId]')
    r(r'studentNotes(\s+)StudentNote\[\](\s+)@relation\("UserStudentNotes"\)\s*\n', '')

    # 4. EnrolmentRequest
    r(r'reviewedByPersonId(\s+)String\?', r'reviewedByMembershipId\1String?')
    r(r'reviewedBy(\s+)Person\?(\s+)@relation\("ReviewedBy",\s*fields:\s*\[reviewedByPersonId\]', r'reviewedBy\1Membership?\2@relation("ReviewedBy", fields: [reviewedByMembershipId]')
    r(r'reviewedRequests(\s+)EnrolmentRequest\[\](\s+)@relation\("ReviewedBy"\)\s*\n', '')

    # 5. Appointment
    r(r'patientPersonId(\s+)String', r'patientDataId\1String')
    r(r'patient(\s+)Person(\s+)@relation\("PatientAppointments",\s*fields:\s*\[patientPersonId\]', r'patient\1PatientData\2@relation("PatientAppointments", fields: [patientDataId]')
    r(r'appointments(\s+)Appointment\[\](\s+)@relation\("PatientAppointments"\)\s*\n', '')

    # 6. Prescription
    r(r'patientPersonId(\s+)String', r'patientDataId\1String')
    r(r'patient(\s+)Person(\s+)@relation\("PatientPrescriptions",\s*fields:\s*\[patientPersonId\]', r'patient\1PatientData\2@relation("PatientPrescriptions", fields: [patientDataId]')
    r(r'prescriptions(\s+)Prescription\[\](\s+)@relation\("PatientPrescriptions"\)\s*\n', '')

    # 7. PharmacyOrder
    r(r'residentPersonId(\s+)String\?', r'patientDataId\1String?')
    r(r'resident(\s+)Person\?(\s+)@relation\("ResidentPharmacyOrders",\s*fields:\s*\[residentPersonId\]', r'patient\1PatientData?\2@relation("PatientPharmacyOrders", fields: [patientDataId]')
    r(r'pharmacyOrders(\s+)PharmacyOrder\[\](\s+)@relation\("ResidentPharmacyOrders"\)\s*\n', '')

    # 8. Reservation
    r(r'guestPersonId(\s+)String\?', r'guestRelationshipId\1String?')
    r(r'guest(\s+)Person\?(\s+)@relation\("GuestReservations",\s*fields:\s*\[guestPersonId\]', r'guestRelationship\1Relationship?\2@relation("GuestReservations", fields: [guestRelationshipId]')
    r(r'reservations(\s+)Reservation\[\](\s+)@relation\("GuestReservations"\)\s*\n', '')

    # 9. RestaurantOrder
    r(r'residentPersonId(\s+)String\?', r'customerDataId\1String?')
    r(r'resident(\s+)Person\?(\s+)@relation\("ResidentRestaurantOrders",\s*fields:\s*\[residentPersonId\]', r'customer\1CustomerData?\2@relation("CustomerRestaurantOrders", fields: [customerDataId]')
    r(r'restaurantOrders(\s+)RestaurantOrder\[\](\s+)@relation\("ResidentRestaurantOrders"\)\s*\n', '')

    # 10. Task
    r(r'courierPersonId(\s+)String\?', r'courierProfileId\1String?')
    r(r'courier(\s+)Person\?(\s+)@relation\("TaskCourier",\s*fields:\s*\[courierPersonId\]', r'courier\1GigWorkerProfile?\2@relation("TaskCourier", fields: [courierProfileId]')
    r(r'acceptedTasks(\s+)Task\[\](\s+)@relation\("TaskCourier"\)\s*\n', '')


    # Add back-relations
    content = content.replace(
        "model Membership {",
        "model Membership {\n  createdNotices Notice[] @relation(\"UserNotices\")\n  createdEvents SchoolEvent[] @relation(\"CreatedSchoolEvents\")\n  studentNotes StudentNote[] @relation(\"UserStudentNotes\")\n  reviewedRequests EnrolmentRequest[] @relation(\"ReviewedBy\")"
    )
    
    content = content.replace(
        "model PatientData {",
        "model PatientData {\n  appointments Appointment[] @relation(\"PatientAppointments\")\n  prescriptions Prescription[] @relation(\"PatientPrescriptions\")\n  pharmacyOrders PharmacyOrder[] @relation(\"PatientPharmacyOrders\")"
    )
    
    content = content.replace(
        "model Relationship {",
        "model Relationship {\n  guestReservations Reservation[] @relation(\"GuestReservations\")"
    )
    
    content = content.replace(
        "model CustomerData {",
        "model CustomerData {\n  restaurantOrders RestaurantOrder[] @relation(\"CustomerRestaurantOrders\")"
    )
    
    content = content.replace(
        "model GigWorkerProfile {",
        "model GigWorkerProfile {\n  acceptedTasks Task[] @relation(\"TaskCourier\")"
    )


    try:
        with open('src/prisma/contract.prisma', 'w') as f:
            f.write(content)
        print("Semantic patch applied successfully")
    except Exception as e:
        print(f"Error writing file: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

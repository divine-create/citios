import re
import sys

def main():
    try:
        with open('src/prisma/contract.prisma', 'r') as f:
            content = f.read()
    except FileNotFoundError:
        print("contract.prisma not found")
        sys.exit(1)

    # 1. LeaveRequest
    content = content.replace("staff     StaffProfile   @relation(fields: [staffId], references: [id])", "staff     Membership   @relation(fields: [membershipId], references: [id])")
    content = content.replace("staffId   String", "membershipId String")

    # 2. StaffAttendance
    content = content.replace("staff     StaffProfile @relation(fields: [staffId], references: [id], onDelete: Cascade)", "staff     Membership @relation(fields: [membershipId], references: [id], onDelete: Cascade)")
    content = content.replace("staffId   String", "membershipId String")

    # 3. ClassSection
    content = content.replace("students        Student[]", "students        StudentData[]")
    
    # 4. FeeInvoice
    content = content.replace("student     Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)", "student     StudentData  @relation(fields: [studentDataId], references: [id], onDelete: Cascade)")
    content = content.replace("studentId   String", "studentDataId String")
    
    # 5. StudentTransferIn
    content = content.replace("student       Student       @relation(fields: [studentId], references: [id], onDelete: Cascade)", "student       StudentData       @relation(fields: [studentDataId], references: [id], onDelete: Cascade)")
    content = content.replace("studentId     String        @unique", "studentDataId     String        @unique")

    # Fix leftover references
    content = content.replace("student     Student", "student     StudentData")
    content = content.replace("staff       StaffProfile", "staff       Membership")

    with open('src/prisma/contract.prisma', 'w') as f:
        f.write(content)
        
    print("Fix patch complete")

if __name__ == "__main__":
    main()

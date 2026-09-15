import sys

def main():
    with open('src/prisma/contract.prisma', 'r') as f:
        content = f.read()

    # Blind replace the remaining type references
    content = content.replace("StaffProfile", "Membership")
    content = content.replace("ServiceStaff", "Membership")
    content = content.replace("RetailCustomer", "CustomerData")
    content = content.replace("OrgCustomer", "CustomerData")
    
    with open('src/prisma/contract.prisma', 'w') as f:
        f.write(content)
        
    print("Fix3 patch complete")

if __name__ == "__main__":
    main()

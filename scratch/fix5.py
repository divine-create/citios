import sys

def main():
    with open('src/prisma/contract.prisma', 'r') as f:
        content = f.read()

    # Fix RestaurantOrder
    content = content.replace("patientDataId     String?      // The user who placed the order", "customerDataId     String?      // The user who placed the order")
    
    with open('src/prisma/contract.prisma', 'w') as f:
        f.write(content)
        
    print("Fix5 patch complete")

if __name__ == "__main__":
    main()

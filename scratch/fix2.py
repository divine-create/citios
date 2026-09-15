import sys

def main():
    with open('src/prisma/contract.prisma', 'r') as f:
        content = f.read()

    # Just hard replace these strings since we know they exist.
    content = content.replace("staff     StaffProfile?", "staff     Membership?")
    content = content.replace("staff       StaffProfile?", "staff       Membership?")
    content = content.replace("staff     StaffProfile", "staff     Membership")
    content = content.replace("staff       StaffProfile", "staff       Membership")
    
    with open('src/prisma/contract.prisma', 'w') as f:
        f.write(content)
        
    print("Fix2 patch complete")

if __name__ == "__main__":
    main()

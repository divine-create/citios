import re

with open("src/prisma/contract.prisma", "r", encoding="utf-8") as f:
    c = f.read()

c = re.sub(
    r'(model Person\s*\{[^\}]+?dateOfBirth\s+DateTime\?)',
    r'\1\n  isSystemAdmin  Boolean            @default(false)',
    c
)

with open("src/prisma/contract.prisma", "w", encoding="utf-8") as f:
    f.write(c)

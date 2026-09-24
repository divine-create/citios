with open('src/prisma/contract.prisma', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add timezone to Location model (after longitude)
if 'timezone       String       @default("UTC")' not in content:
    content = content.replace(
        '  latitude       Float?\r\n  longitude      Float?\r\n  \r\n  organization',
        '  latitude       Float?\r\n  longitude      Float?\r\n  timezone       String       @default("UTC")\r\n  \r\n  organization',
        1
    )
    print('Timezone added to Location')
else:
    print('Timezone already exists in Location')

# 2. Add kitchenOverdueMinutes to RestaurantSettings before createdAt/updatedAt
if 'kitchenOverdueMinutes' not in content:
    content = content.replace(
        '  hasSetPayment  Boolean @default(false)\r\n    hasMenu        Boolean @default(false)\r\n    hasTables      Boolean @default(false)\r\n  \r\n    createdAt DateTime @default(now())\r\n    updatedAt DateTime @default(now())\r\n  }',
        '  hasSetPayment  Boolean @default(false)\r\n    hasMenu        Boolean @default(false)\r\n    hasTables      Boolean @default(false)\r\n\r\n  kitchenOverdueMinutes Int @default(20)\r\n\r\n    createdAt DateTime @default(now())\r\n    updatedAt DateTime @default(now())\r\n  }',
        1
    )
    print('kitchenOverdueMinutes added to RestaurantSettings')
else:
    print('kitchenOverdueMinutes already exists')

with open('src/prisma/contract.prisma', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')

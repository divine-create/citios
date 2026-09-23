import sys
import re

with open('app/actions/food.ts', 'r', encoding='utf-8') as f:
    c = f.read()

c = re.sub(
    r'export async function placeRestaurantOrder\(input: \{\s*orgId\?: string;.*?items: ',
    r'export async function placeRestaurantOrder(input: {\n  orgId?: string;\n  locationId: string;\n  items: ',
    c,
    flags=re.DOTALL
)

with open('app/actions/food.ts', 'w', encoding='utf-8') as f:
    f.write(c)

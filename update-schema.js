import fs from 'fs';

let code = fs.readFileSync('src/prisma/contract.prisma', 'utf8');

// 1. Add capability toggles to RestaurantSettings
code = code.replace(
  /nextOrderNumber Int    @default\(1\)/,
  `nextOrderNumber Int    @default(1)

  // Phase C Capabilities
  enableVariants       Boolean @default(false)
  enableModifiers      Boolean @default(false)
  enableRecipes        Boolean @default(false)
  enableInventory      Boolean @default(false)
  enableFoodCosting    Boolean @default(false)
  enableProduction     Boolean @default(false)`
);

// 2. Add Modifier models and update MenuItem
if (!code.includes('model ModifierGroup')) {
  const modifierModels = `
model ModifierGroup {
  id             String       @id @default(uuid())
  organizationId String
  name           String       // e.g. "Size", "Toppings", "Milk"
  description    String?
  isRequired     Boolean      @default(false)
  minSelections  Int          @default(0)
  maxSelections  Int?
  displayOrder   Int          @default(0)
  isActive       Boolean      @default(true)

  options        ModifierOption[]
  menuItems      MenuItemModifierGroup[]

  createdAt DateTime @default(now())
}

model ModifierOption {
  id               String       @id @default(uuid())
  modifierGroupId  String
  group            ModifierGroup @relation(fields: [modifierGroupId], references: [id], onDelete: Cascade)
  
  name             String
  description      String?
  priceDelta       Float        @default(0)
  displayOrder     Int          @default(0)
  isActive         Boolean      @default(true)

  inventoryItemId  String?
  inventoryItem    RestaurantInventoryItem? @relation(fields: [inventoryItemId], references: [id])
  inventoryQuantity Float?

  orderItemModifiers OrderItemModifier[]

  createdAt DateTime @default(now())
}

model MenuItemModifierGroup {
  id               String       @id @default(uuid())
  menuItemId       String
  menuItem         MenuItem     @relation(fields: [menuItemId], references: [id], onDelete: Cascade)
  modifierGroupId  String
  group            ModifierGroup @relation(fields: [modifierGroupId], references: [id], onDelete: Cascade)

  displayOrder     Int          @default(0)

  @@unique([menuItemId, modifierGroupId])
}

model OrderItemModifier {
  id               String          @id @default(uuid())
  orderItemId      String
  orderItem        OrderItem       @relation(fields: [orderItemId], references: [id], onDelete: Cascade)
  
  modifierOptionId String?
  option           ModifierOption? @relation(fields: [modifierOptionId], references: [id], onDelete: SetNull)
  
  name             String
  priceDelta       Float           @default(0)
}
`;
  code += modifierModels;
}

// 3. Update MenuItem to link to Recipe and ModifierGroup
code = code.replace(
  /inventoryItem\s*RestaurantInventoryItem\?\s*@relation\(fields:\s*\[inventoryItemId\],\s*references:\s*\[id\]\)/,
  `inventoryItem   RestaurantInventoryItem? @relation(fields: [inventoryItemId], references: [id])

  recipe          RestaurantRecipe? @relation("MenuItemRecipe")
  modifierGroups  MenuItemModifierGroup[]`
);

// 4. Update RestaurantRecipe to link to MenuItem
code = code.replace(
  /producedItem\s*RestaurantInventoryItem\?\s*@relation\("ItemRecipe"\)/,
  `producedItem   RestaurantInventoryItem? @relation("ItemRecipe")
  
  menuItemId     String?      @unique
  menuItem       MenuItem?    @relation("MenuItemRecipe", fields: [menuItemId], references: [id])`
);

// 5. Update OrderItem to include snapshots and modifiers
code = code.replace(
  /notes\s*String\?\s*\/\/\s*Special instructions/,
  `notes          String?         // Special instructions
  
  variantId      String?
  variantName    String?
  menuItemName   String?
  
  modifiers      OrderItemModifier[]`
);

fs.writeFileSync('src/prisma/contract.prisma', code);

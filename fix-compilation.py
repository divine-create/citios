import sys
import re

with open('lib/actions/restaurantos.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Fix settings used before declaration
# Move `const settings = await db.orm.public.RestaurantSettings...` up to the top of createPosOrder
settings_block = """    // Settings: tax, service charge, next call-out number.
    const settings = await db.orm.public.RestaurantSettings
      .where({ organizationId: input.organizationId })
      .all()
      .first();"""
if settings_block in code:
    code = code.replace(settings_block, "    // Settings was moved up.")
    # Insert it right after the active shift check
    code = code.replace("const lineItems: any[] = [];", 
        "const settings = await db.orm.public.RestaurantSettings.where({ organizationId: input.organizationId }).all().first();\n      const lineItems: any[] = [];")

# Fix ModifierOption.where({ id: { in: item.modifierOptionIds } })
code = code.replace("id: { in: item.modifierOptionIds }", "id: item.modifierOptionIds")

# Fix ModifierOption.create({ organizationId }) 
code = code.replace("organizationId: input.organizationId,\n    modifierGroupId: input.modifierGroupId", "modifierGroupId: input.modifierGroupId")

# Restore createProductionRun and recordWaste from HEAD~1
import subprocess
head1_code = subprocess.check_output(['git', 'show', 'HEAD~1:lib/actions/restaurantos.ts']).decode('utf-8')

# Extract createProductionRun from HEAD~1
match_prod = re.search(r'export async function createProductionRun[\s\S]*?^  \}\n  \n  export async function getProductionRuns', head1_code, re.MULTILINE)
if match_prod:
    prod_code = match_prod.group(0).replace('export async function getProductionRuns', '')
    
    # Extract recordWaste from HEAD~1
    match_waste = re.search(r'export async function recordWaste[\s\S]*?^  \}\n  \n  \n  export async function getRestaurantShifts', head1_code, re.MULTILINE)
    if match_waste:
        waste_code = match_waste.group(0).replace('export async function getRestaurantShifts', '')
        
        # Now replace the mangled createProductionRun in current code
        mangled_regex = re.compile(r'export async function createProductionRun[\s\S]*?export async function getProductionRuns', re.MULTILINE)
        
        # Add capability gates to prod_code
        prod_code = prod_code.replace("const mem = await requireMembership(input.organizationId);", 
            "const mem = await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'KITCHEN', 'INVENTORY_STAFF']);\n      await requireRestaurantCapability(input.organizationId, 'enableProduction');")
            
        code = mangled_regex.sub(prod_code + "\n" + waste_code + "\n  export async function getProductionRuns", code)


with open('lib/actions/restaurantos.ts', 'w', encoding='utf-8') as f:
    f.write(code)

print("Fixed restaurantos.ts")

import re

def main():
    with open('lib/actions/retail.ts', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Ensure import of requireMembership exists at the top
    if 'requireMembership' not in content:
        content = re.sub(r'import \{ db \} from \'@/src/prisma/db\';', "import { db } from '@/src/prisma/db';\nimport { requireMembership } from '@/lib/auth';", content)
    
    # We will manually inject the auth calls into the functions using regex

    # createCategory
    content = re.sub(r'(export async function createCategory\(input: \{ organizationId: string;[^\)]+\}\) \{\n\s*try \{)',
                     r'\1\n    await requireMembership(input.organizationId, [\'OWNER\', \'ADMIN\', \'MANAGER\']);', content)
    
    # updateCategory
    content = re.sub(r'(export async function updateCategory\(categoryId: string, input: \{[^\)]+\}\) \{\n\s*try \{)',
                     r'\1\n    const cat = await db.orm.public.ProductCategory.where({ id: categoryId }).all().first();\n    if (cat) await requireMembership(cat.organizationId, [\'OWNER\', \'ADMIN\', \'MANAGER\']);', content)
    
    # deleteCategory
    content = re.sub(r'(export async function deleteCategory\(categoryId: string\) \{\n\s*try \{)',
                     r'\1\n    const cat = await db.orm.public.ProductCategory.where({ id: categoryId }).all().first();\n    if (cat) await requireMembership(cat.organizationId, [\'OWNER\', \'ADMIN\', \'MANAGER\']);', content)
    
    # createProduct
    content = re.sub(r'(export async function createProduct\(input: \{[\s\S]*?\}\) \{\n\s*try \{)',
                     r'\1\n    await requireMembership(input.organizationId, [\'OWNER\', \'ADMIN\', \'MANAGER\']);', content)
    
    # updateProduct
    content = re.sub(r'(export async function updateProduct\(productId: string, input: \{[\s\S]*?\}\) \{\n\s*try \{)',
                     r'\1\n    const prod = await db.orm.public.RetailProduct.where({ id: productId }).all().first();\n    if (prod) await requireMembership(prod.organizationId, [\'OWNER\', \'ADMIN\', \'MANAGER\']);', content)
    
    # deleteProduct
    content = re.sub(r'(export async function deleteProduct\(productId: string\) \{\n\s*try \{)',
                     r'\1\n    const prod = await db.orm.public.RetailProduct.where({ id: productId }).all().first();\n    if (prod) await requireMembership(prod.organizationId, [\'OWNER\', \'ADMIN\', \'MANAGER\']);', content)
    
    # adjustStock
    content = re.sub(r'(export async function adjustStock\(productId: string, delta: number\) \{\n\s*try \{)',
                     r'\1\n    const prod = await db.orm.public.RetailProduct.where({ id: productId }).all().first();\n    if (prod) await requireMembership(prod.organizationId, [\'OWNER\', \'ADMIN\', \'MANAGER\', \'CASHIER\']);', content)
    
    # createRegister
    content = re.sub(r'(export async function createRegister\(organizationId: string, name: string\) \{\n\s*try \{)',
                     r'\1\n    await requireMembership(organizationId, [\'OWNER\', \'ADMIN\', \'MANAGER\']);', content)
    
    # openShift
    content = re.sub(r'(export async function openShift\(input: \{ organizationId: string;[^\)]+\}\) \{\n\s*try \{)',
                     r'\1\n    await requireMembership(input.organizationId, [\'OWNER\', \'ADMIN\', \'MANAGER\', \'CASHIER\']);', content)
    
    # closeShift
    content = re.sub(r'(export async function closeShift\(shiftId: string, input: \{[^\)]+\}\) \{\n\s*try \{)',
                     r'\1\n    const s = await db.orm.public.RetailShift.where({ id: shiftId }).all().first();\n    if (s) await requireMembership(s.organizationId, [\'OWNER\', \'ADMIN\', \'MANAGER\', \'CASHIER\']);', content)
    
    # createOrder
    content = re.sub(r'(export async function createOrder\(input: \{[\s\S]*?\}\) \{\n\s*try \{)',
                     r'\1\n    await requireMembership(input.organizationId, [\'OWNER\', \'ADMIN\', \'MANAGER\', \'CASHIER\']);', content)
    
    # refundOrder
    content = re.sub(r'(export async function refundOrder\(orderId: string, input: \{ refundedById: string; reason\?: string \}\) \{\n\s*try \{)',
                     r'\1\n    const o = await db.orm.public.RetailOrder.where({ id: orderId }).all().first();\n    if (o) await requireMembership(o.organizationId, [\'OWNER\', \'ADMIN\', \'MANAGER\']);', content)
    
    # createSupplier
    content = re.sub(r'(export async function createSupplier\(input: \{ organizationId: string;[\s\S]*?\}\) \{\n\s*try \{)',
                     r'\1\n    await requireMembership(input.organizationId, [\'OWNER\', \'ADMIN\', \'MANAGER\']);', content)
    
    # updateSupplier
    content = re.sub(r'(export async function updateSupplier\(supplierId: string, input: \{[\s\S]*?\}\) \{\n\s*try \{)',
                     r'\1\n    const sup = await db.orm.public.RetailSupplier.where({ id: supplierId }).all().first();\n    if (sup) await requireMembership(sup.organizationId, [\'OWNER\', \'ADMIN\', \'MANAGER\']);', content)
    
    # deleteSupplier
    content = re.sub(r'(export async function deleteSupplier\(supplierId: string\) \{\n\s*try \{)',
                     r'\1\n    const sup = await db.orm.public.RetailSupplier.where({ id: supplierId }).all().first();\n    if (sup) await requireMembership(sup.organizationId, [\'OWNER\', \'ADMIN\', \'MANAGER\']);', content)
    
    # createPurchaseOrder
    content = re.sub(r'(export async function createPurchaseOrder\(input: \{ organizationId: string;[\s\S]*?\}\) \{\n\s*try \{)',
                     r'\1\n    await requireMembership(input.organizationId, [\'OWNER\', \'ADMIN\', \'MANAGER\']);', content)
    
    # updatePurchaseOrderStatus
    content = re.sub(r'(export async function updatePurchaseOrderStatus\(poId: string, status: \'DRAFT\' \| \'SENT\' \| \'RECEIVED\' \| \'PARTIAL\'\) \{\n\s*try \{)',
                     r'\1\n    const po = await db.orm.public.PurchaseOrder.where({ id: poId }).all().first();\n    if (po) await requireMembership(po.organizationId, [\'OWNER\', \'ADMIN\', \'MANAGER\']);', content)
    
    # createExpense
    content = re.sub(r'(export async function createExpense\(input: \{[\s\S]*?\}\) \{\n\s*try \{)',
                     r'\1\n    await requireMembership(input.organizationId, [\'OWNER\', \'ADMIN\', \'MANAGER\']);', content)
    
    # updateExpense
    content = re.sub(r'(export async function updateExpense\(expenseId: string, input: \{[\s\S]*?\}\) \{\n\s*try \{)',
                     r'\1\n    const exp = await db.orm.public.BusinessExpense.where({ id: expenseId }).all().first();\n    if (exp) await requireMembership(exp.organizationId, [\'OWNER\', \'ADMIN\', \'MANAGER\']);', content)
    
    # deleteExpense
    content = re.sub(r'(export async function deleteExpense\(expenseId: string\) \{\n\s*try \{)',
                     r'\1\n    const exp = await db.orm.public.BusinessExpense.where({ id: expenseId }).all().first();\n    if (exp) await requireMembership(exp.organizationId, [\'OWNER\', \'ADMIN\', \'MANAGER\']);', content)
                     
    # createCustomer
    content = re.sub(r'(export async function createCustomer\(input: \{ organizationId: string;[\s\S]*?\}\) \{\n\s*try \{)',
                     r'\1\n    await requireMembership(input.organizationId, [\'OWNER\', \'ADMIN\', \'MANAGER\', \'CASHIER\']);', content)
                     
    # updateCustomer
    content = re.sub(r'(export async function updateCustomer\(customerDataId: string, input: \{[\s\S]*?\}\) \{\n\s*try \{)',
                     r'\1\n    const c = await db.orm.public.CustomerData.where({ id: customerDataId }).all().first();\n    if (c) {\n        const rel = await db.orm.public.Relationship.where({ id: c.relationshipId }).all().first();\n        if (rel) await requireMembership(rel.organizationId, [\'OWNER\', \'ADMIN\', \'MANAGER\', \'CASHIER\']);\n    }', content)
                     
    # deleteCustomer
    content = re.sub(r'(export async function deleteCustomer\(customerDataId: string\) \{\n\s*try \{)',
                     r'\1\n    const c = await db.orm.public.CustomerData.where({ id: customerDataId }).all().first();\n    if (c) {\n        const rel = await db.orm.public.Relationship.where({ id: c.relationshipId }).all().first();\n        if (rel) await requireMembership(rel.organizationId, [\'OWNER\', \'ADMIN\', \'MANAGER\']);\n    }', content)
                     
    # adjustLoyaltyPoints
    content = re.sub(r'(export async function adjustLoyaltyPoints\(customerDataId: string, delta: number\) \{\n\s*try \{)',
                     r'\1\n    const c = await db.orm.public.CustomerData.where({ id: customerDataId }).all().first();\n    if (c) {\n        const rel = await db.orm.public.Relationship.where({ id: c.relationshipId }).all().first();\n        if (rel) await requireMembership(rel.organizationId, [\'OWNER\', \'ADMIN\', \'MANAGER\', \'CASHIER\']);\n    }', content)

    # updateRetailSettings
    content = re.sub(r'(export async function updateRetailSettings\(organizationId: string, input: \{[\s\S]*?\}\) \{\n\s*try \{)',
                     r'\1\n    await requireMembership(organizationId, [\'OWNER\', \'ADMIN\']);', content)

    with open('lib/actions/retail.ts', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    main()

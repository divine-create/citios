import re

def main():
    with open('lib/actions/retail.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. replace `async function enrichCustomers`
    enrich_customers_replacement = """async function enrichCustomers(organizationId: string, customerDataList: any[]) {
  const orders = await db.orm.public.RetailOrder.where({ organizationId }).all();
  const enriched = [];
  
  for (const c of customerDataList) {
    const rel = await db.orm.public.Relationship.where({ id: c.relationshipId }).all().first();
    const person = rel ? await db.orm.public.Person.where({ id: rel.personId }).all().first() : null;
    
    const theirOrders = orders.filter((o) => o.customerDataId === c.id && o.status === 'COMPLETED');
    const lastVisit = theirOrders.reduce((max, o) => Math.max(max, epochMs(o.createdAt)), 0);
    
    enriched.push({
      ...c,
      name: person ? `${person.firstName} ${person.lastName}`.trim() : 'Unknown',
      phone: person?.phone,
      email: person?.email,
      totalSpent: theirOrders.reduce((sum, o) => sum + o.totalAmount, 0),
      orderCount: theirOrders.length,
      lastVisit: lastVisit > 0 ? lastVisit : null,
    });
  }
  return enriched;
}"""
    content = re.sub(r'async function enrichCustomers\(organizationId: string, customers: any\[\]\) \{[\s\S]*?return customers\.map\(\(c\) => \{[\s\S]*?\}\);\n  \}', enrich_customers_replacement, content)

    # 2. replace getCustomers
    get_customers = """export async function getCustomers(organizationId: string) {
  try {
    const relationships = await db.orm.public.Relationship.where({ organizationId, type: 'CUSTOMER' }).all();
    const customerDataList = [];
    for (const rel of relationships) {
      const cd = await db.orm.public.CustomerData.where({ relationshipId: rel.id }).all().first();
      if (cd) customerDataList.push(cd);
    }
    const enriched = await enrichCustomers(organizationId, customerDataList);
    enriched.sort((a, b) => b.totalSpent - a.totalSpent);
    return JSON.parse(JSON.stringify(enriched));
  } catch (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
}"""
    content = re.sub(r'export async function getCustomers\(organizationId: string\) \{[\s\S]*?return \[\];\n  \}\n\}', get_customers, content)

    # 3. replace getCustomer
    get_customer = """export async function getCustomer(organizationId: string, customerDataId: string) {
  try {
    const customer = await db.orm.public.CustomerData.where({ id: customerDataId }).all().first();
    if (!customer) return null;
    const [enriched] = await enrichCustomers(organizationId, [customer]);

    const orders = await db.orm.public.RetailOrder.where({ organizationId, customerDataId }).all();
    orders.sort((a, b) => epochMs(b.createdAt) - epochMs(a.createdAt));
    const orderHistory = await enrichOrders(organizationId, orders);

    return JSON.parse(JSON.stringify({ ...enriched, orders: orderHistory }));
  } catch (error) {
    console.error('Error fetching customer:', error);
    return null;
  }
}"""
    content = re.sub(r'export async function getCustomer\(organizationId: string, customerId: string\) \{[\s\S]*?return null;\n  \}\n\}', get_customer, content)

    # 4. createCustomer
    create_customer = """export async function createCustomer(input: { organizationId: string; name: string; phone?: string; email?: string; notes?: string }) {
  try {
    if (!input.name.trim()) return { error: 'Customer name is required.' };
    
    // Find or create Person
    let person;
    if (input.email) {
       person = await db.orm.public.Person.where({ email: input.email }).all().first();
    } else if (input.phone) {
       person = await db.orm.public.Person.where({ phone: input.phone }).all().first();
    }
    
    if (!person) {
       const [firstName, ...lastNames] = input.name.split(' ');
       person = await db.orm.public.Person.create({
         firstName: firstName || 'Unknown',
         lastName: lastNames.join(' ') || 'Unknown',
         email: input.email,
         phone: input.phone,
       });
    }

    const relationship = await db.orm.public.Relationship.create({
      organizationId: input.organizationId,
      personId: person.id,
      type: 'CUSTOMER',
    });

    const customerData = await db.orm.public.CustomerData.create({
      relationshipId: relationship.id,
      notes: input.notes,
      loyaltyPoints: 0,
    });

    return { success: true, customer: JSON.parse(JSON.stringify(customerData)) };
  } catch (error) {
    console.error('Error creating customer:', error);
    return { error: 'Failed to create customer.' };
  }
}"""
    content = re.sub(r'export async function createCustomer\(input: \{ organizationId: string; name: string; phone\?: string; email\?: string; notes\?: string \}\) \{[\s\S]*?return \{ error: \'Failed to create customer\.\' \};\n  \}\n\}', create_customer, content)

    # 5. updateCustomer
    update_customer = """export async function updateCustomer(customerDataId: string, input: { name?: string; phone?: string | null; email?: string | null; notes?: string | null }) {
  try {
    const customer = await db.orm.public.CustomerData.where({ id: customerDataId }).all().first();
    if (!customer) return { error: 'Customer not found.' };

    if (input.notes !== undefined) {
      await db.orm.public.CustomerData.where({ id: customerDataId }).update({ notes: input.notes });
    }

    const relationship = await db.orm.public.Relationship.where({ id: customer.relationshipId }).all().first();
    if (relationship && (input.name !== undefined || input.phone !== undefined || input.email !== undefined)) {
      const pUpdate: any = {};
      if (input.name !== undefined) {
        const [firstName, ...lastNames] = input.name.split(' ');
        pUpdate.firstName = firstName || 'Unknown';
        pUpdate.lastName = lastNames.join(' ') || 'Unknown';
      }
      if (input.phone !== undefined) pUpdate.phone = input.phone;
      if (input.email !== undefined) pUpdate.email = input.email;
      await db.orm.public.Person.where({ id: relationship.personId }).update(pUpdate);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating customer:', error);
    return { error: 'Failed to update customer.' };
  }
}"""
    content = re.sub(r'export async function updateCustomer\(customerId: string, input: \{ name\?: string; phone\?: string \| null; email\?: string \| null; notes\?: string \| null \}\) \{[\s\S]*?return \{ error: \'Failed to update customer\.\' \};\n  \}\n\}', update_customer, content)

    # 6. deleteCustomer
    delete_customer = """export async function deleteCustomer(customerDataId: string) {
  try {
    const ordersUsingIt = await db.orm.public.RetailOrder.where({ customerDataId }).all();
    if (ordersUsingIt.length > 0) return { error: `This customer has ${ordersUsingIt.length} order(s) on file - cannot delete.` };
    
    const customer = await db.orm.public.CustomerData.where({ id: customerDataId }).all().first();
    if (customer) {
      await db.orm.public.CustomerData.where({ id: customerDataId }).delete();
    }
    return { success: true };
  } catch (error) {
    console.error('Error deleting customer:', error);
    return { error: 'Failed to delete customer.' };
  }
}"""
    content = re.sub(r'export async function deleteCustomer\(customerId: string\) \{[\s\S]*?return \{ error: \'Failed to delete customer\.\' \};\n  \}\n\}', delete_customer, content)

    # 7. adjustLoyaltyPoints
    adjust_loyalty = """export async function adjustLoyaltyPoints(customerDataId: string, delta: number) {
  try {
    const customer = await db.orm.public.CustomerData.where({ id: customerDataId }).all().first();
    if (!customer) return { error: 'Customer not found.' };
    const next = customer.loyaltyPoints + delta;
    if (next < 0) return { error: 'Loyalty points cannot go below zero.' };
    await db.orm.public.CustomerData.where({ id: customerDataId }).update({ loyaltyPoints: next });
    return { success: true, loyaltyPoints: next };
  } catch (error) {
    console.error('Error adjusting loyalty points:', error);
    return { error: 'Failed to adjust loyalty points.' };
  }
}"""
    content = re.sub(r'export async function adjustLoyaltyPoints\(customerId: string, delta: number\) \{[\s\S]*?return \{ error: \'Failed to adjust loyalty points\.\' \};\n  \}\n\}', adjust_loyalty, content)

    # 8. replace customerId with customerDataId in RetailOrder inputs
    content = re.sub(r'customerId\?: string;', 'customerDataId?: string;', content)
    content = re.sub(r'customerId: input\.customerId', 'customerDataId: input.customerDataId', content)

    # 9. enrichOrders (RetailCustomer lookup, and User cashier lookup)
    enrich_orders_repl = """async function enrichOrders(organizationId: string, orders: any[]) {
  const products = await db.orm.public.RetailProduct.where({ organizationId }).all();
  
  const cashierIds = [...new Set(orders.map((o) => o.cashierId))];
  const cashiers: Record<string, string> = {};
  for (const id of cashierIds) {
    const membership = await db.orm.public.Membership.where({ id }).all().first();
    if (membership) {
       const person = await db.orm.public.Person.where({ id: membership.personId }).all().first();
       cashiers[id] = person ? `${person.firstName} ${person.lastName}`.trim() : 'Unknown';
    } else {
       cashiers[id] = 'Unknown';
    }
  }

  const customerIds = [...new Set(orders.map((o) => o.customerDataId).filter(Boolean))] as string[];
  const customers: Record<string, string> = {};
  for (const id of customerIds) {
    const cd = await db.orm.public.CustomerData.where({ id }).all().first();
    if (cd) {
       const rel = await db.orm.public.Relationship.where({ id: cd.relationshipId }).all().first();
       if (rel) {
           const person = await db.orm.public.Person.where({ id: rel.personId }).all().first();
           customers[id] = person ? `${person.firstName} ${person.lastName}`.trim() : 'Unknown';
       }
    }
  }

  const enriched = [];
  for (const order of orders) {
    const items = await db.orm.public.RetailOrderItem.where({ orderId: order.id }).all();
    enriched.push({
      ...order,
      cashierName: cashiers[order.cashierId] ?? 'Unknown',
      customerName: order.customerDataId ? (customers[order.customerDataId] ?? 'Unknown') : null,
      items: items.map((i) => ({ ...i, productName: products.find((p) => p.id === i.productId)?.name ?? 'Unknown' })),
    });
  }
  return enriched;
}"""
    content = re.sub(r'async function enrichOrders\(organizationId: string, orders: any\[\]\) \{[\s\S]*?return enriched;\n\}', enrich_orders_repl, content)

    # 10. getReceiptData
    get_receipt = """export async function getReceiptData(orderId: string) {
  try {
    const order = await db.orm.public.RetailOrder.where({ id: orderId }).all().first();
    if (!order) return null;

    const items = await db.orm.public.RetailOrderItem.where({ orderId }).all();
    const populatedItems = await Promise.all(items.map(async (item) => {
      const product = await db.orm.public.RetailProduct.where({ id: item.productId }).all().first();
      return { ...item, product };
    }));

    const cashierMembership = await db.orm.public.Membership.where({ id: order.cashierId }).all().first();
    const cashierPerson = cashierMembership ? await db.orm.public.Person.where({ id: cashierMembership.personId }).all().first() : null;
    const settings = await getRetailSettings(order.organizationId);

    return {
      order,
      items: populatedItems,
      cashier: cashierPerson ? `${cashierPerson.firstName} ${cashierPerson.lastName}`.trim() : 'Staff',
      settings
    };
  } catch (error) {
    console.error('Error fetching receipt data:', error);
    return null;
  }
}"""
    content = re.sub(r'export async function getReceiptData\(orderId: string\) \{[\s\S]*?return null;\n  \}\n\}', get_receipt, content)

    # 11. Replace User and StaffProfile in getRetailDashboardData
    # Wait! Are there User or StaffProfile queries in getRetailDashboardData? Let's check that later.
    
    with open('lib/actions/retail.ts', 'w', encoding='utf-8') as f:
        f.write(content)

    print("Replaced retail customers and orders")

if __name__ == "__main__":
    main()

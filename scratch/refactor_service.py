import re

def main():
    with open('lib/actions/service.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add requireMembership import
    if 'requireMembership' not in content:
        content = re.sub(r'import \{ db \} from \'@/src/prisma/db\';', "import { db } from '@/src/prisma/db';\nimport { requireMembership } from '@/lib/auth';", content)

    # 2. Rewrite OrgCustomer
    get_org_customers = """export async function getOrgCustomers(organizationId: string) {
  try {
    const rels = await db.orm.public.Relationship.where({ organizationId, type: 'CUSTOMER' }).all();
    const customers = [];
    for (const rel of rels) {
       const cd = await db.orm.public.CustomerData.where({ relationshipId: rel.id }).all().first();
       const person = await db.orm.public.Person.where({ id: rel.personId }).all().first();
       if (cd && person) {
          customers.push({ ...cd, firstName: person.firstName, lastName: person.lastName, email: person.email, phone: person.phone });
       }
    }
    return JSON.parse(JSON.stringify(customers));
  } catch (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
}"""
    content = re.sub(r'export async function getOrgCustomers\(organizationId: string\) \{[\s\S]*?return \[\];\n  \}\n\}', get_org_customers, content)

    create_org_customer = """export async function createOrgCustomer(input: {
  organizationId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  notes?: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    let person = null;
    if (input.email) person = await db.orm.public.Person.where({ email: input.email }).all().first();
    if (!person && input.phone) person = await db.orm.public.Person.where({ phone: input.phone }).all().first();
    if (!person) {
       person = await db.orm.public.Person.create({ firstName: input.firstName, lastName: input.lastName, email: input.email, phone: input.phone });
    }
    const rel = await db.orm.public.Relationship.create({ organizationId: input.organizationId, personId: person.id, type: 'CUSTOMER' });
    const customer = await db.orm.public.CustomerData.create({ relationshipId: rel.id, notes: input.notes, loyaltyPoints: 0 });
    return { success: true, customer: JSON.parse(JSON.stringify({ ...customer, firstName: person.firstName, lastName: person.lastName, email: person.email, phone: person.phone })) };
  } catch (error) {
    console.error('Error creating customer:', error);
    return { error: 'Failed to create customer.' };
  }
}"""
    content = re.sub(r'export async function createOrgCustomer\(input: \{[\s\S]*?\}\) \{[\s\S]*?return \{ error: \'Failed to create customer\.\' \};\n  \}\n\}', create_org_customer, content)

    # 3. Rewrite ServiceStaff
    get_staff = """export async function getServiceStaff(organizationId: string) {
  try {
    const memberships = await db.orm.public.Membership.where({ organizationId }).all();
    const staff = [];
    for (const m of memberships) {
       const person = await db.orm.public.Person.where({ id: m.personId }).all().first();
       if (person) {
          staff.push({ id: m.id, name: `${person.firstName} ${person.lastName}`.trim(), role: m.role, phone: person.phone, email: person.email });
       }
    }
    return JSON.parse(JSON.stringify(staff));
  } catch (error) {
    console.error('Error fetching service staff:', error);
    return [];
  }
}"""
    content = re.sub(r'export async function getServiceStaff\(organizationId: string\) \{[\s\S]*?return \[\];\n  \}\n\}', get_staff, content)

    create_staff = """export async function createServiceStaff(input: {
  organizationId: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    let person = null;
    if (input.email) person = await db.orm.public.Person.where({ email: input.email }).all().first();
    if (!person && input.phone) person = await db.orm.public.Person.where({ phone: input.phone }).all().first();
    if (!person) {
       const [firstName, ...lastNames] = input.name.split(' ');
       person = await db.orm.public.Person.create({ firstName: firstName || 'Unknown', lastName: lastNames.join(' ') || 'Unknown', email: input.email, phone: input.phone });
    }
    const staff = await db.orm.public.Membership.create({ organizationId: input.organizationId, personId: person.id, role: input.role as any });
    return { success: true, staff: JSON.parse(JSON.stringify({ id: staff.id, name: `${person.firstName} ${person.lastName}`.trim(), role: staff.role, phone: person.phone, email: person.email })) };
  } catch (error) {
    console.error('Error creating staff:', error);
    return { error: 'Failed to create staff.' };
  }
}"""
    content = re.sub(r'export async function createServiceStaff\(input: \{[\s\S]*?\}\) \{[\s\S]*?return \{ error: \'Failed to create staff\.\' \};\n  \}\n\}', create_staff, content)

    # 4. Rewrite createServiceAppointment
    create_apt = """export async function createServiceAppointment(input: {
  organizationId: string;
  customerDataId: string;
  serviceId: string;
  membershipId?: string;
  startTime: Date;
  endTime: Date;
  price: number;
  notes?: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const apt = await db.orm.public.ServiceAppointment.create({
      organizationId: input.organizationId,
      customerDataId: input.customerDataId,
      serviceId: input.serviceId,
      membershipId: input.membershipId,
      startTime: toInstant(input.startTime),
      endTime: toInstant(input.endTime),
    });
    return { success: true, appointment: JSON.parse(JSON.stringify(apt)) };
  } catch (error) {
    console.error('Error creating appointment:', error);
    return { error: 'Failed to create appointment.' };
  }
}"""
    content = re.sub(r'export async function createServiceAppointment\(input: \{[\s\S]*?\}\) \{[\s\S]*?return \{ error: \'Failed to create appointment\.\' \};\n  \}\n\}', create_apt, content)

    # 5. Rewrite createServiceJob
    create_job = """export async function createServiceJob(input: {
  organizationId: string;
  customerDataId: string;
  serviceId?: string;
  description: string;
  status: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const job = await db.orm.public.ServiceJob.create({
      organizationId: input.organizationId,
      customerDataId: input.customerDataId,
      serviceId: input.serviceId,
      description: input.description,
      status: input.status,
    });
    return { success: true, job: JSON.parse(JSON.stringify(job)) };
  } catch (error) {
    console.error('Error creating job:', error);
    return { error: 'Failed to create job.' };
  }
}"""
    content = re.sub(r'export async function createServiceJob\(input: \{[\s\S]*?\}\) \{[\s\S]*?return \{ error: \'Failed to create job\.\' \};\n  \}\n\}', create_job, content)

    # 6. Add requireMembership to other mutations
    content = re.sub(r'(export async function updateServiceSettings\(\n\s*organizationId: string,\n\s*updates: Partial<\{[^>]*\}>\n\) \{\n\s*try \{)', r"\1\n    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER']);", content)
    content = re.sub(r'(export async function createServiceCatalogItem\(input: \{[\s\S]*?\}\) \{\n\s*try \{)', r"\1\n    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);", content)
    content = re.sub(r'(export async function updateServiceAppointmentStatus\(id: string, status: string\) \{\n\s*try \{)', r"\1\n    const apt = await db.orm.public.ServiceAppointment.where({ id }).all().first();\n    if (apt) await requireMembership(apt.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);", content)
    
    with open('lib/actions/service.ts', 'w', encoding='utf-8') as f:
        f.write(content)

    print("Injected boundaries and refactored service.ts")

if __name__ == '__main__':
    main()

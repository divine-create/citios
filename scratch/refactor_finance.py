import re

def main():
    with open('lib/actions/school.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # createFeeType
    create_feetype = """export async function createFeeType(organizationId: string, input: {
  name: string;
  description?: string;
  amount: number;
  frequency: string;
  yearLevel?: number;
  active?: boolean;
}) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'FINANCE']);

    if (!input.name.trim()) return { error: 'Fee type name is required.' };
    await db.orm.public.FeeType.create({
      organizationId,
      name: input.name.trim(),
      description: input.description,
      amount: input.amount,
      frequency: input.frequency,
      yearLevel: input.yearLevel,
      active: input.active ?? true,
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating fee type:', error);
    return { error: 'Failed to create fee type.' };
  }
}"""
    content = re.sub(r'export async function createFeeType\(organizationId: string, input: \{[\s\S]*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error creating fee type:\', error\);\n    return \{ error: \'Failed to create fee type\.\' \};\n  \}\n\}', lambda m: create_feetype, content)


    # updateFeeType
    update_feetype = """export async function updateFeeType(feeTypeId: string, input: {
  name?: string;
  description?: string;
  amount?: number;
  frequency?: string;
  yearLevel?: number | null;
  active?: boolean;
}) {
  try {
    const feeType = await db.orm.public.FeeType.where({ id: feeTypeId }).all().first();
    if (!feeType) return { error: 'Fee type not found.' };

    await requireMembership(feeType.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'FINANCE']);

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.description !== undefined) data.description = input.description;
    if (input.amount !== undefined) data.amount = input.amount;
    if (input.frequency !== undefined) data.frequency = input.frequency;
    if (input.yearLevel !== undefined) data.yearLevel = input.yearLevel;
    if (input.active !== undefined) data.active = input.active;

    await db.orm.public.FeeType.where({ id: feeTypeId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating fee type:', error);
    return { error: 'Failed to update fee type.' };
  }
}"""
    content = re.sub(r'export async function updateFeeType\(feeTypeId: string, input: \{[\s\S]*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error updating fee type:\', error\);\n    return \{ error: \'Failed to update fee type\.\' \};\n  \}\n\}', lambda m: update_feetype, content)


    # deleteFeeType
    delete_feetype = """export async function deleteFeeType(feeTypeId: string) {
  try {
    const feeType = await db.orm.public.FeeType.where({ id: feeTypeId }).all().first();
    if (!feeType) return { error: 'Fee type not found.' };

    await requireMembership(feeType.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'FINANCE']);

    await db.orm.public.FeeType.where({ id: feeTypeId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting fee type:', error);
    return { error: 'This fee type is used on existing invoices - remove those line items first.' };
  }
}"""
    content = re.sub(r'export async function deleteFeeType\(feeTypeId: string\) \{[\s\S]*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error deleting fee type:\', error\);\n    return \{ error: \'This fee type is used on existing invoices - remove those line items first\.\' \};\n  \}\n\}', lambda m: delete_feetype, content)


    # createFeeInvoice
    create_invoice = """export async function createFeeInvoice(input: {
  organizationId: string;
  studentId: string; // Maps to StudentData.id
  dueDate: string;
  notes?: string;
  items: { feeTypeId?: string; description: string; amount: number }[];
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'FINANCE', 'REGISTRAR']);

    if (input.items.length === 0) return { error: 'Add at least one line item.' };
    const dueDate = new Date(input.dueDate);
    if (isNaN(dueDate.getTime())) return { error: 'Invalid due date.' };

    const totalAmount = input.items.reduce((sum, item) => sum + item.amount, 0);

    const invoice = await db.orm.public.FeeInvoice.create({
      organizationId: input.organizationId,
      studentDataId: input.studentId,
      issueDate: toInstant(new Date()),
      dueDate: toInstant(dueDate),
      notes: input.notes,
      totalAmount,
      paidAmount: 0,
      status: 'unpaid',
    });

    for (const item of input.items) {
      await db.orm.public.FeeInvoiceItem.create({
        invoiceId: invoice.id,
        feeTypeId: item.feeTypeId,
        description: item.description,
        amount: item.amount,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error creating fee invoice:', error);
    return { error: 'Failed to create invoice.' };
  }
}"""
    content = re.sub(r'export async function createFeeInvoice\(input: \{[\s\S]*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error creating fee invoice:\', error\);\n    return \{ error: \'Failed to create invoice\.\' \};\n  \}\n\}', lambda m: create_invoice, content)


    # updateFeeInvoice
    update_invoice = """export async function updateFeeInvoice(invoiceId: string, input: { dueDate?: string; notes?: string; status?: string }) {
  try {
    const invoice = await db.orm.public.FeeInvoice.where({ id: invoiceId }).all().first();
    if (!invoice) return { error: 'Invoice not found.' };

    await requireMembership(invoice.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'FINANCE']);

    const data: Record<string, unknown> = {};
    if (input.dueDate !== undefined) data.dueDate = toInstant(new Date(input.dueDate));
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.status !== undefined) data.status = input.status;

    await db.orm.public.FeeInvoice.where({ id: invoiceId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating fee invoice:', error);
    return { error: 'Failed to update invoice.' };
  }
}"""
    content = re.sub(r'export async function updateFeeInvoice\(invoiceId: string, input: \{ dueDate\?: string; notes\?: string; status\?: string \}\) \{[\s\S]*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error updating fee invoice:\', error\);\n    return \{ error: \'Failed to update invoice\.\' \};\n  \}\n\}', lambda m: update_invoice, content)


    # deleteFeeInvoice
    delete_invoice = """export async function deleteFeeInvoice(invoiceId: string) {
  try {
    const invoice = await db.orm.public.FeeInvoice.where({ id: invoiceId }).all().first();
    if (!invoice) return { error: 'Invoice not found.' };

    await requireMembership(invoice.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'FINANCE']);

    if (invoice.paidAmount > 0) return { error: 'Cannot delete an invoice with recorded payments.' };

    await db.orm.public.FeeInvoice.where({ id: invoiceId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting fee invoice:', error);
    return { error: 'Failed to delete invoice.' };
  }
}"""
    content = re.sub(r'export async function deleteFeeInvoice\(invoiceId: string\) \{[\s\S]*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error deleting fee invoice:\', error\);\n    return \{ error: \'Failed to delete invoice\.\' \};\n  \}\n\}', lambda m: delete_invoice, content)


    # recordFeePayment
    record_payment = """export async function recordFeePayment(input: {
  invoiceId: string;
  amount: number;
  method?: string;
  reference?: string;
  notes?: string;
  recordedBy?: string;
}) {
  try {
    if (input.amount <= 0) return { error: 'Payment amount must be greater than zero.' };

    const invoice = await db.orm.public.FeeInvoice.where({ id: input.invoiceId }).all().first();
    if (!invoice) return { error: 'Invoice not found.' };

    const { membership } = await requireMembership(invoice.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'FINANCE', 'REGISTRAR']);

    await db.orm.public.FeePayment.create({
      invoiceId: input.invoiceId,
      amount: input.amount,
      method: input.method,
      reference: input.reference,
      notes: input.notes,
      recordedBy: input.recordedBy ?? membership.id,
      paidAt: toInstant(new Date()),
    });

    const newPaidAmount = invoice.paidAmount + input.amount;
    const status = newPaidAmount >= invoice.totalAmount ? 'paid' : newPaidAmount > 0 ? 'partial' : 'unpaid';

    await db.orm.public.FeeInvoice.where({ id: input.invoiceId }).update({
      paidAmount: newPaidAmount,
      status,
    });

    return { success: true };
  } catch (error) {
    console.error('Error recording fee payment:', error);
    return { error: 'Failed to record payment.' };
  }
}"""
    content = re.sub(r'export async function recordFeePayment\(input: \{[\s\S]*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error recording fee payment:\', error\);\n    return \{ error: \'Failed to record payment\.\' \};\n  \}\n\}', lambda m: record_payment, content)

    with open('lib/actions/school.ts', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Replaced finance functions")

if __name__ == "__main__":
    main()

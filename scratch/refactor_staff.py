import re

def main():
    with open('lib/actions/school.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. createStaff
    create_staff_new = """export async function createStaff(input: {
  organizationId: string;
  name: string;
  email: string;
  role: 'TEACHER' | 'ADMIN' | 'FINANCE' | 'REGISTRAR' | 'COUNSELOR' | 'LIBRARIAN';
  employeeId?: string;
  department?: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);

    if (!input.name.trim() || !input.email.trim()) return { error: 'Name and email are required.' };

    const emailLower = input.email.toLowerCase();
    let identifier = await db.orm.public.PersonIdentifier.where({ type: "EMAIL", normalizedValue: emailLower }).all().first();
    let person;

    if (!identifier) {
      const firstName = input.name.split(' ')[0] || 'Unknown';
      const lastName = input.name.split(' ').slice(1).join(' ') || 'Staff';
      person = await db.orm.public.Person.create({ firstName, lastName });
      await db.orm.public.PersonIdentifier.create({
        personId: person.id,
        type: "EMAIL",
        normalizedValue: emailLower,
        isVerified: true
      });
    } else {
      person = await db.orm.public.Person.where({ id: identifier.personId }).all().first();
    }
    
    if (!person) return { error: 'Failed to resolve person.' };

    let membership = await db.orm.public.Membership.where({ personId: person.id, organizationId: input.organizationId }).all().first();
    if (!membership) {
      membership = await db.orm.public.Membership.create({
        personId: person.id,
        organizationId: input.organizationId,
      });
    }

    const roles = await db.orm.public.MembershipRole.where({ membershipId: membership.id }).all();
    if (!roles.some(r => r.role === input.role)) {
      await db.orm.public.MembershipRole.create({ membershipId: membership.id, role: input.role });
    }

    let staffData = await db.orm.public.StaffData.where({ membershipId: membership.id }).all().first();
    if (!staffData) {
      await db.orm.public.StaffData.create({
        membershipId: membership.id,
        employeeId: input.employeeId || `EMP-${Math.floor(Math.random() * 10000)}`,
        department: input.department || 'General',
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error creating staff:', error);
    return { error: 'Failed to create staff member.' };
  }
}"""
    content = re.sub(r'export async function createStaff\(input: \{.*?\}\) \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error creating staff:\', error\);\n    return \{ error: \'Failed to create staff member\.\' \};\n  \}\n\}', create_staff_new, content, flags=re.DOTALL)

    # 2. updateStaff
    update_staff_new = """export async function updateStaff(
  memberId: string,
  input: { name?: string; email?: string; role?: 'TEACHER' | 'ADMIN' | 'FINANCE' | 'REGISTRAR' | 'COUNSELOR' | 'LIBRARIAN' }
) {
  try {
    const membership = await db.orm.public.Membership.where({ id: memberId }).all().first();
    if (!membership) return { error: 'Staff membership not found.' };

    await requireMembership(membership.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);

    if (input.name !== undefined || input.email !== undefined) {
      // In a real system, you might not want an admin updating a global Person's name/email freely, 
      // but for V1 we keep the UX parity.
      const personData: any = {};
      if (input.name !== undefined) {
        personData.firstName = input.name.split(' ')[0] || 'Unknown';
        personData.lastName = input.name.split(' ').slice(1).join(' ') || 'Staff';
      }
      await db.orm.public.Person.where({ id: membership.personId }).update(personData);
      
      if (input.email !== undefined) {
        const emailLower = input.email.toLowerCase();
        const existingIdent = await db.orm.public.PersonIdentifier.where({ personId: membership.personId, type: "EMAIL" }).all().first();
        if (existingIdent) {
           await db.orm.public.PersonIdentifier.where({ id: existingIdent.id }).update({ normalizedValue: emailLower });
        }
      }
    }

    if (input.role) {
       const roles = await db.orm.public.MembershipRole.where({ membershipId: membership.id }).all();
       // Simplistic role replacement for V1 EduOS assuming 1 primary role per staff
       for (const r of roles) {
           await db.orm.public.MembershipRole.where({ id: r.id }).delete();
       }
       await db.orm.public.MembershipRole.create({ membershipId: membership.id, role: input.role });
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating staff:', error);
    return { error: 'Failed to update staff member.' };
  }
}"""
    content = re.sub(r'export async function updateStaff\(.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error updating staff:\', error\);\n    return \{ error: \'Failed to update staff member\.\' \};\n  \}\n\}', update_staff_new, content, flags=re.DOTALL)

    # 3. deleteStaff
    delete_staff_new = """export async function deleteStaff(memberId: string) {
  try {
    const membership = await db.orm.public.Membership.where({ id: memberId }).all().first();
    if (!membership) return { error: 'Staff membership not found.' };

    await requireMembership(membership.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);

    // Since StaffData, MembershipRole, etc Cascade on Membership deletion in Prisma,
    // we only need to delete the membership.
    await db.orm.public.Membership.where({ id: memberId }).delete();
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting staff:', error);
    return { error: 'Failed to remove staff member.' };
  }
}"""
    content = re.sub(r'export async function deleteStaff\(memberId: string\) \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error deleting staff:\', error\);\n    return \{ error: \'Failed to remove staff member\.\' \};\n  \}\n\}', delete_staff_new, content, flags=re.DOTALL)

    # 4. markStaffAttendance
    mark_staff_att_new = """export async function markStaffAttendance(input: { organizationId: string; staffId: string; date: string; status: string; notes?: string }) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const dateInstant = new Date(input.date).toISOString();

    const existing = await db.orm.public.StaffAttendance.where({ membershipId: input.staffId, date: dateInstant }).all().first();
    if (existing) {
      await db.orm.public.StaffAttendance.where({ id: existing.id }).update({ status: input.status, notes: input.notes });
    } else {
      await db.orm.public.StaffAttendance.create({
        organizationId: input.organizationId,
        membershipId: input.staffId,
        date: dateInstant,
        status: input.status,
        notes: input.notes,
      });
    }
    return { success: true };
  } catch (error) {
    console.error('Error marking staff attendance:', error);
    return { error: 'Failed to record attendance.' };
  }
}"""
    content = re.sub(r'export async function markStaffAttendance\(input: \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error marking staff attendance:\', error\);\n    return \{ error: \'Failed to record attendance\.\' \};\n  \}\n\}', mark_staff_att_new, content, flags=re.DOTALL)

    # 5. createLeaveRequest
    create_leave_new = """export async function createLeaveRequest(input: {
  organizationId: string;
  staffId: string;
  type: string;
  startDate: string;
  endDate: string;
  reason?: string;
}) {
  try {
    // A staff member can create their own leave request
    const auth = await requireMembership(input.organizationId);
    
    // Check if the staffId being passed is actually the user's membershipId (or they are an admin)
    if (auth.membership.id !== input.staffId) {
        if (!auth.roles.some(r => ['OWNER', 'ADMIN', 'MANAGER'].includes(r.role))) {
            return { error: 'Unauthorized to create a leave request for another staff member.' };
        }
    }

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) {
      return { error: 'Invalid dates.' };
    }

    await db.orm.public.LeaveRequest.create({
      organizationId: input.organizationId,
      membershipId: input.staffId,
      type: input.type,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      reason: input.reason,
      status: 'pending',
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating leave request:', error);
    return { error: 'Failed to submit leave request.' };
  }
}"""
    content = re.sub(r'export async function createLeaveRequest\(input: \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error creating leave request:\', error\);\n    return \{ error: \'Failed to submit leave request\.\' \};\n  \}\n\}', create_leave_new, content, flags=re.DOTALL)

    # 6. updateLeaveRequestStatus
    update_leave_new = """export async function updateLeaveRequestStatus(leaveRequestId: string, input: { status: 'approved' | 'rejected'; approvedBy?: string; notes?: string }) {
  try {
    const leaveReq = await db.orm.public.LeaveRequest.where({ id: leaveRequestId }).all().first();
    if (!leaveReq) return { error: 'Leave request not found' };

    await requireMembership(leaveReq.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);

    await db.orm.public.LeaveRequest.where({ id: leaveRequestId }).update({
      status: input.status,
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating leave request:', error);
    return { error: 'Failed to update request.' };
  }
}"""
    content = re.sub(r'export async function updateLeaveRequestStatus\(.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error updating leave request:\', error\);\n    return \{ error: \'Failed to update request\.\' \};\n  \}\n\}', update_leave_new, content, flags=re.DOTALL)

    with open('lib/actions/school.ts', 'w', encoding='utf-8') as f:
        f.write(content)

    print("Replaced functions")

if __name__ == "__main__":
    main()

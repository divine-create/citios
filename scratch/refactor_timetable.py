import re

def main():
    with open('lib/actions/school.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. checkTimetableConflicts
    check_conflicts_new = """async function checkTimetableConflicts(
  effective: { classId: string; membershipId?: string; roomId?: string; dayOfWeek: number; period: number },
  excludeSlotId?: string
): Promise<{ error: string } | null> {
  const classSlots = await db.orm.public.TimetableSlot.where({ classId: effective.classId }).all();
  if (classSlots.some((s) => s.id !== excludeSlotId && s.dayOfWeek === effective.dayOfWeek && s.period === effective.period)) {
    return { error: 'This class already has a slot at this day and period.' };
  }

  if (effective.membershipId) {
    const staffSlots = await db.orm.public.TimetableSlot.where({ membershipId: effective.membershipId }).all();
    const conflict = staffSlots.find((s) => s.id !== excludeSlotId && s.dayOfWeek === effective.dayOfWeek && s.period === effective.period);
    if (conflict) {
      const conflictingClass = await db.orm.public.SchoolClass.where({ id: conflict.classId }).all().first();
      return { error: `This teacher already teaches ${conflictingClass?.name ?? 'another class'} at this day/period.` };
    }
  }

  if (effective.roomId) {
    const roomSlots = await db.orm.public.TimetableSlot.where({ roomId: effective.roomId }).all();
    const conflict = roomSlots.find((s) => s.id !== excludeSlotId && s.dayOfWeek === effective.dayOfWeek && s.period === effective.period);
    if (conflict) {
      const conflictingClass = await db.orm.public.SchoolClass.where({ id: conflict.classId }).all().first();
      return { error: `Room is already booked for ${conflictingClass?.name ?? 'another class'} at this day/period.` };
    }
  }

  return null;
}"""
    content = re.sub(r'async function checkTimetableConflicts\([\s\S]*?return null;\n\}', lambda m: check_conflicts_new, content)

    # 2. getTimetableForClass
    get_timetable_class = """export async function getTimetableForClass(classId: string) {
  try {
    const cls = await db.orm.public.SchoolClass.where({ id: classId }).all().first();
    if (!cls) return [];

    await requireMembership(cls.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR', 'TEACHER']);

    const slots = await db.orm.public.TimetableSlot.where({ classId }).all();
    const rooms = await db.orm.public.Room.where({ organizationId: cls.organizationId }).all();

    const enriched = [];
    for (const slot of slots) {
      const room = rooms.find((r) => r.id === slot.roomId);
      let staffName = null;
      if (slot.membershipId) {
          const membership = await db.orm.public.Membership.where({ id: slot.membershipId }).all().first();
          if (membership) {
              const person = await db.orm.public.Person.where({ id: membership.personId }).all().first();
              if (person) staffName = `${person.firstName} ${person.lastName}`;
          }
      }
      enriched.push({
        ...slot,
        roomName: room?.name ?? null,
        staffName,
      });
    }

    enriched.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.period - b.period);
    return JSON.parse(JSON.stringify(enriched));
  } catch (error) {
    console.error('Error fetching timetable for class:', error);
    return [];
  }
}"""
    content = re.sub(r'export async function getTimetableForClass\(classId: string\) \{.*?return JSON\.parse\(JSON\.stringify\(enriched\)\);\n  \} catch \(error\) \{\n    console\.error\(\'Error fetching timetable for class:\', error\);\n    return \[\];\n  \}\n\}', lambda m: get_timetable_class, content, flags=re.DOTALL)


    # 3. getTimetableForSection
    get_timetable_section = """export async function getTimetableForSection(sectionId: string) {
  try {
    const section = await db.orm.public.ClassSection.where({ id: sectionId }).all().first();
    if (!section) return [];

    await requireMembership(section.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR', 'TEACHER']);

    const courses = await db.orm.public.SchoolClass.where({ classSectionId: sectionId }).all();
    const courseIds = courses.map((c) => c.id);
    if (courseIds.length === 0) return [];

    const allSlots = await db.orm.public.TimetableSlot.all();
    const slots = allSlots.filter((s) => courseIds.includes(s.classId));
    
    const rooms = await db.orm.public.Room.where({ organizationId: section.organizationId }).all();

    const enriched = [];
    for (const slot of slots) {
      const course = courses.find((c) => c.id === slot.classId);
      const room = rooms.find((r) => r.id === slot.roomId);
      let staffName = null;
      if (slot.membershipId) {
          const membership = await db.orm.public.Membership.where({ id: slot.membershipId }).all().first();
          if (membership) {
              const person = await db.orm.public.Person.where({ id: membership.personId }).all().first();
              if (person) staffName = `${person.firstName} ${person.lastName}`;
          }
      }
      enriched.push({
        ...slot,
        courseName: course?.name ?? null,
        roomName: room?.name ?? null,
        staffName,
      });
    }

    enriched.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.period - b.period);
    return JSON.parse(JSON.stringify(enriched));
  } catch (error) {
    console.error('Error fetching timetable for section:', error);
    return [];
  }
}"""
    content = re.sub(r'export async function getTimetableForSection\(sectionId: string\) \{.*?return JSON\.parse\(JSON\.stringify\(enriched\)\);\n  \} catch \(error\) \{\n    console\.error\(\'Error fetching timetable for section:\', error\);\n    return \[\];\n  \}\n\}', lambda m: get_timetable_section, content, flags=re.DOTALL)


    # 4. createTimetableSlot
    create_slot = """export async function createTimetableSlot(input: {
  classId: string;
  dayOfWeek: number;
  period: number;
  startTime: string;
  endTime: string;
  roomId?: string;
  staffId?: string;
  notes?: string;
}): Promise<{ success: true } | { error: string }> {
  try {
    const cls = await db.orm.public.SchoolClass.where({ id: input.classId }).all().first();
    if (!cls) return { error: 'Class not found.' };

    await requireMembership(cls.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    if (input.dayOfWeek < 1 || input.dayOfWeek > 7) return { error: 'Invalid day of week.' };
    if (!Number.isInteger(input.period) || input.period < 1) return { error: 'Invalid period.' };
    const TIME_FORMAT_LOCAL = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!TIME_FORMAT_LOCAL.test(input.startTime) || !TIME_FORMAT_LOCAL.test(input.endTime)) return { error: 'Times must be in HH:MM format.' };
    if (input.startTime >= input.endTime) return { error: 'Start time must be before end time.' };

    let membershipId = input.staffId;
    if (!membershipId) {
      const classTeachers = await db.orm.public.ClassTeacher.where({ classId: input.classId }).all();
      const primary = classTeachers.find((ct) => ct.isPrimary) ?? classTeachers[0];
      membershipId = primary?.membershipId;
    }

    const conflict = await checkTimetableConflicts({
      classId: input.classId, membershipId, roomId: input.roomId, dayOfWeek: input.dayOfWeek, period: input.period,
    });
    if (conflict) return conflict;

    await db.orm.public.TimetableSlot.create({
      classId: input.classId,
      membershipId: membershipId || undefined,
      roomId: input.roomId || undefined,
      dayOfWeek: input.dayOfWeek,
      period: input.period,
      startTime: input.startTime,
      endTime: input.endTime,
      notes: input.notes,
    });

    return { success: true };
  } catch (error) {
    console.error('Error creating timetable slot:', error);
    return { error: 'Failed to create timetable slot.' };
  }
}"""
    content = re.sub(r'export async function createTimetableSlot\(input: \{[\s\S]*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error creating timetable slot:\', error\);\n    return \{ error: \'Failed to create timetable slot\.\' \};\n  \}\n\}', lambda m: create_slot, content)


    # 5. updateTimetableSlot
    update_slot = """export async function updateTimetableSlot(slotId: string, input: {
  dayOfWeek?: number;
  period?: number;
  startTime?: string;
  endTime?: string;
  roomId?: string | null;
  staffId?: string | null;
  notes?: string | null;
}): Promise<{ success: true } | { error: string }> {
  try {
    const existing = await db.orm.public.TimetableSlot.where({ id: slotId }).all().first();
    if (!existing) return { error: 'Slot not found.' };

    const cls = await db.orm.public.SchoolClass.where({ id: existing.classId }).all().first();
    if (cls) await requireMembership(cls.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    const effective = {
      classId: existing.classId,
      membershipId: (input.staffId !== undefined ? input.staffId : existing.membershipId) ?? undefined,
      roomId: (input.roomId !== undefined ? input.roomId : existing.roomId) ?? undefined,
      dayOfWeek: input.dayOfWeek ?? existing.dayOfWeek,
      period: input.period ?? existing.period,
    };

    const TIME_FORMAT_LOCAL = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (input.startTime !== undefined && !TIME_FORMAT_LOCAL.test(input.startTime)) return { error: 'Start time must be in HH:MM format.' };
    if (input.endTime !== undefined && !TIME_FORMAT_LOCAL.test(input.endTime)) return { error: 'End time must be in HH:MM format.' };
    const effectiveStart = input.startTime ?? existing.startTime;
    const effectiveEnd = input.endTime ?? existing.endTime;
    if (effectiveStart >= effectiveEnd) return { error: 'Start time must be before end time.' };

    const conflict = await checkTimetableConflicts(effective, slotId);
    if (conflict) return conflict;

    const data: Record<string, unknown> = {};
    if (input.dayOfWeek !== undefined) data.dayOfWeek = input.dayOfWeek;
    if (input.period !== undefined) data.period = input.period;
    if (input.startTime !== undefined) data.startTime = input.startTime;
    if (input.endTime !== undefined) data.endTime = input.endTime;
    if (input.roomId !== undefined) data.roomId = input.roomId;
    if (input.staffId !== undefined) data.membershipId = input.staffId;
    if (input.notes !== undefined) data.notes = input.notes;

    await db.orm.public.TimetableSlot.where({ id: slotId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating timetable slot:', error);
    return { error: 'Failed to update timetable slot.' };
  }
}"""
    content = re.sub(r'export async function updateTimetableSlot\(slotId: string, input: \{[\s\S]*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error updating timetable slot:\', error\);\n    return \{ error: \'Failed to update timetable slot\.\' \};\n  \}\n\}', lambda m: update_slot, content)


    # 6. deleteTimetableSlot
    delete_slot = """export async function deleteTimetableSlot(slotId: string) {
  try {
    const existing = await db.orm.public.TimetableSlot.where({ id: slotId }).all().first();
    if (existing) {
        const cls = await db.orm.public.SchoolClass.where({ id: existing.classId }).all().first();
        if (cls) await requireMembership(cls.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);
        await db.orm.public.TimetableSlot.where({ id: slotId }).delete();
    }
    return { success: true };
  } catch (error) {
    console.error('Error deleting timetable slot:', error);
    return { error: 'Failed to remove timetable slot.' };
  }
}"""
    content = re.sub(r'export async function deleteTimetableSlot\(slotId: string\) \{[\s\S]*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error deleting timetable slot:\', error\);\n    return \{ error: \'Failed to remove timetable slot\.\' \};\n  \}\n\}', lambda m: delete_slot, content)


    with open('lib/actions/school.ts', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Replaced timetable functions")

if __name__ == "__main__":
    main()

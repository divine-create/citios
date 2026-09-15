import re

def main():
    with open('lib/actions/school.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # createSchoolEvent
    create_event = """export async function createSchoolEvent(input: {
  organizationId: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  allDay?: boolean;
  category?: string;
  targetRoles?: AudienceRole[] | 'all';
  targetYears?: (string | number)[] | 'all';
  createdById?: string; // Maps to Membership.id; keeping param name for backwards compatibility
}) {
  try {
    const { membership } = await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'TEACHER', 'REGISTRAR', 'COUNSELOR', 'FINANCE', 'LIBRARIAN']);

    if (!input.title.trim()) return { error: 'Event title is required.' };
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) {
      return { error: 'Invalid date range.' };
    }

    await db.orm.public.SchoolEvent.create({
      organizationId: input.organizationId,
      title: input.title.trim(),
      description: input.description,
      startDate: toInstant(startDate),
      endDate: toInstant(endDate),
      allDay: input.allDay ?? true,
      category: input.category ?? 'academic',
      targetRoles: encodeAudienceField(input.targetRoles),
      targetYears: encodeAudienceField(input.targetYears as string[] | 'all' | undefined),
      createdByMembershipId: input.createdById ?? membership.id,
    });

    return { success: true };
  } catch (error) {
    console.error('Error creating school event:', error);
    return { error: 'Failed to create event.' };
  }
}"""
    content = re.sub(r'export async function createSchoolEvent\(input: \{[\s\S]*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error creating school event:\', error\);\n    return \{ error: \'Failed to create event\.\' \};\n  \}\n\}', lambda m: create_event, content)


    # updateSchoolEvent
    update_event = """export async function updateSchoolEvent(eventId: string, input: {
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  allDay?: boolean;
  category?: string;
  targetRoles?: AudienceRole[] | 'all';
  targetYears?: (string | number)[] | 'all';
}) {
  try {
    const event = await db.orm.public.SchoolEvent.where({ id: eventId }).all().first();
    if (!event) return { error: 'Event not found.' };

    await requireMembership(event.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'TEACHER', 'REGISTRAR', 'COUNSELOR', 'FINANCE', 'LIBRARIAN']);

    const data: Record<string, unknown> = {};
    if (input.title !== undefined) data.title = input.title.trim();
    if (input.description !== undefined) data.description = input.description;
    if (input.startDate !== undefined) data.startDate = toInstant(new Date(input.startDate));
    if (input.endDate !== undefined) data.endDate = toInstant(new Date(input.endDate));
    if (input.allDay !== undefined) data.allDay = input.allDay;
    if (input.category !== undefined) data.category = input.category;
    if (input.targetRoles !== undefined) data.targetRoles = encodeAudienceField(input.targetRoles);
    if (input.targetYears !== undefined) data.targetYears = encodeAudienceField(input.targetYears as string[] | 'all');

    await db.orm.public.SchoolEvent.where({ id: eventId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating school event:', error);
    return { error: 'Failed to update event.' };
  }
}"""
    content = re.sub(r'export async function updateSchoolEvent\(eventId: string, input: \{[\s\S]*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error updating school event:\', error\);\n    return \{ error: \'Failed to update event\.\' \};\n  \}\n\}', lambda m: update_event, content)


    # deleteSchoolEvent
    delete_event = """export async function deleteSchoolEvent(eventId: string) {
  try {
    const event = await db.orm.public.SchoolEvent.where({ id: eventId }).all().first();
    if (!event) return { error: 'Event not found.' };

    await requireMembership(event.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'TEACHER', 'REGISTRAR', 'COUNSELOR', 'FINANCE', 'LIBRARIAN']);

    await db.orm.public.SchoolEvent.where({ id: eventId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting school event:', error);
    return { error: 'Failed to delete event.' };
  }
}"""
    content = re.sub(r'export async function deleteSchoolEvent\(eventId: string\) \{[\s\S]*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error deleting school event:\', error\);\n    return \{ error: \'Failed to delete event\.\' \};\n  \}\n\}', lambda m: delete_event, content)


    # createStudentNote
    create_note = """export async function createStudentNote(input: {
  organizationId: string;
  studentId: string; // Maps to StudentData.id
  authorId?: string; // Maps to Membership.id
  content: string;
  type?: 'general' | 'academic' | 'medical' | 'behaviour' | 'pastoral';
  private?: boolean;
}) {
  try {
    const { membership } = await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'TEACHER', 'REGISTRAR', 'COUNSELOR']);

    if (!input.content.trim()) return { error: 'Note content is required.' };
    await db.orm.public.StudentNote.create({
      organizationId: input.organizationId,
      studentDataId: input.studentId,
      authorMembershipId: input.authorId ?? membership.id,
      content: input.content.trim(),
      type: input.type ?? 'general',
      private: input.private ?? false,
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating student note:', error);
    return { error: 'Failed to create note.' };
  }
}"""
    content = re.sub(r'export async function createStudentNote\(input: \{[\s\S]*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error creating student note:\', error\);\n    return \{ error: \'Failed to create note\.\' \};\n  \}\n\}', lambda m: create_note, content)


    # updateStudentNote
    update_note = """export async function updateStudentNote(noteId: string, input: { content?: string; type?: string; private?: boolean }) {
  try {
    const note = await db.orm.public.StudentNote.where({ id: noteId }).all().first();
    if (!note) return { error: 'Note not found.' };

    await requireMembership(note.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'TEACHER', 'REGISTRAR', 'COUNSELOR']);

    const data: Record<string, unknown> = {};
    if (input.content !== undefined) data.content = input.content.trim();
    if (input.type !== undefined) data.type = input.type;
    if (input.private !== undefined) data.private = input.private;

    await db.orm.public.StudentNote.where({ id: noteId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating student note:', error);
    return { error: 'Failed to update note.' };
  }
}"""
    content = re.sub(r'export async function updateStudentNote\(noteId: string, input: \{ content\?: string; type\?: string; private\?: boolean \}\) \{[\s\S]*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error updating student note:\', error\);\n    return \{ error: \'Failed to update note\.\' \};\n  \}\n\}', lambda m: update_note, content)


    # deleteStudentNote
    delete_note = """export async function deleteStudentNote(noteId: string) {
  try {
    const note = await db.orm.public.StudentNote.where({ id: noteId }).all().first();
    if (!note) return { error: 'Note not found.' };

    await requireMembership(note.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'TEACHER', 'REGISTRAR', 'COUNSELOR']);

    await db.orm.public.StudentNote.where({ id: noteId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting student note:', error);
    return { error: 'Failed to delete note.' };
  }
}"""
    content = re.sub(r'export async function deleteStudentNote\(noteId: string\) \{[\s\S]*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error deleting student note:\', error\);\n    return \{ error: \'Failed to delete note\.\' \};\n  \}\n\}', lambda m: delete_note, content)

    with open('lib/actions/school.ts', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Replaced notices and events")

if __name__ == "__main__":
    main()

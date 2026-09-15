import re

def main():
    with open('lib/actions/school.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # removeTeacherFromClass
    remove_teacher_class = """export async function removeTeacherFromClass(classTeacherId: string) {
  try {
    const link = await db.orm.public.ClassTeacher.where({ id: classTeacherId }).all().first();
    if (link) {
      const cls = await db.orm.public.SchoolClass.where({ id: link.classId }).all().first();
      if (cls) {
         await requireMembership(cls.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);
      }
      await db.orm.public.ClassTeacher.where({ id: classTeacherId }).delete();
    }
    return { success: true };
  } catch (error) {
    console.error('Error removing teacher from class:', error);
    return { error: 'Failed to remove teacher.' };
  }
}"""
    content = re.sub(r'export async function removeTeacherFromClass\(classTeacherId: string\) \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error removing teacher from class:\', error\);\n    return \{ error: \'Failed to remove teacher\.\' \};\n  \}\n\}', lambda m: remove_teacher_class, content, flags=re.DOTALL)


    # removeTeacherFromSubject
    remove_teacher_subj = """export async function removeTeacherFromSubject(linkId: string) {
  try {
    const link = await db.orm.public.TeacherSubject.where({ id: linkId }).all().first();
    if (link) {
       const subj = await db.orm.public.Subject.where({ id: link.subjectId }).all().first();
       if (subj) {
           await requireMembership(subj.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);
       }
       await db.orm.public.TeacherSubject.where({ id: linkId }).delete();
    }
    return { success: true };
  } catch (error) {
    console.error('Error removing teacher from subject:', error);
    return { error: 'Failed to remove teacher.' };
  }
}"""
    content = re.sub(r'export async function removeTeacherFromSubject\(linkId: string\) \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error removing teacher from subject:\', error\);\n    return \{ error: \'Failed to remove teacher\.\' \};\n  \}\n\}', lambda m: remove_teacher_subj, content, flags=re.DOTALL)


    with open('lib/actions/school.ts', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Replaced removal functions")

if __name__ == "__main__":
    main()

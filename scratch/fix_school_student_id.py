import re

with open('lib/actions/school.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace studentId -> studentDataId everywhere (variable names, destructuring, properties)
content = re.sub(r'\bstudentId\b', 'studentDataId', content)

# But wait, there might be variables we WANT to keep as studentId? 
# In `school.ts`, every single reference to a student identifier should now be `studentDataId` because `Student` was dropped and `StudentData` is the source of truth for the student record.
# Even if the variable name is `studentDataId`, the `studentId` property on `StudentData` is just an external string ID (like "STU-001"), but the actual primary key is `id`, which was being passed as `studentId`.

with open('lib/actions/school.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed school.ts studentDataId")

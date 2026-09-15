import re

def refactor():
    with open('lib/actions/school.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # Add imports to top
    if 'import { requireMembership }' not in content:
        content = content.replace(
            "import { db } from '@/src/prisma/db';",
            "import { db } from '@/src/prisma/db';\nimport { requireMembership } from '@/lib/actions/tenant';"
        )

    # getRooms
    content = re.sub(
        r'(export async function getRooms\(organizationId: string\) {\n\s*try {\n)',
        r"\1    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'TEACHER', 'COUNSELOR', 'REGISTRAR']);\n",
        content
    )

    # createRoom
    content = re.sub(
        r'(export async function createRoom\(input: \{.*?\}\) {\n\s*try {\n)',
        r"\1    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);\n",
        content,
        flags=re.DOTALL
    )

    # updateRoom
    content = re.sub(
        r'(export async function updateRoom\(roomId: string, input: \{.*?\}\) {\n\s*try {\n)',
        r"\1    // Look up room's organization for auth\n    const room = await db.orm.public.Room.where({ id: roomId }).all().first();\n    if (!room) return { error: 'Room not found' };\n    await requireMembership(room.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);\n",
        content,
        flags=re.DOTALL
    )

    # deleteRoom
    content = re.sub(
        r'(export async function deleteRoom\(roomId: string\) {\n\s*try {\n)',
        r"\1    const room = await db.orm.public.Room.where({ id: roomId }).all().first();\n    if (!room) return { error: 'Room not found' };\n    await requireMembership(room.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);\n",
        content,
        flags=re.DOTALL
    )

    # updateSchoolSettings
    content = re.sub(
        r'(export async function updateSchoolSettings\(organizationId: string, input: \{.*?\}\) {\n\s*try {\n)',
        r"\1    await requireMembership(organizationId, ['OWNER', 'ADMIN']);\n",
        content,
        flags=re.DOTALL
    )

    with open('lib/actions/school.ts', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    refactor()

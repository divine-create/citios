import re

with open('types/next-auth.d.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('userId?: string;', 'personId?: string;')

with open('types/next-auth.d.ts', 'w', encoding='utf-8') as f:
    f.write(content)

with open('lib/auth.ts', 'r', encoding='utf-8') as f:
    auth_content = f.read()

# Replace assignments and lookups
auth_content = auth_content.replace('token.userId = user.id;', 'token.personId = user.id;')
auth_content = auth_content.replace('session.user.userId = token.userId as string;', 'session.user.personId = token.personId as string;')
auth_content = auth_content.replace('token.userId as string', 'token.personId as string')
auth_content = auth_content.replace('token.userId = account.personId;', 'token.personId = account.personId;')

with open('lib/auth.ts', 'w', encoding='utf-8') as f:
    f.write(auth_content)

print("Fixed auth types")

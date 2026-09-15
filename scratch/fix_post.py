import re

with open('lib/actions/post.ts', 'r', encoding='utf-8') as f:
    content = f.read()

if 'requireAuthenticatedAccount' not in content:
    content = 'import { requireAuthenticatedAccount } from "@/lib/actions/tenant";\n' + content

# Fix getUsers
content = content.replace(
    'const users = await db.orm.public.User.all();',
    'const users = await db.orm.public.Person.all();'
)

# Fix addComment
old_add = """    const user = await db.orm.public.User.where({ email: session.user.email }).all().first();
    if (!user) return JSON.parse(JSON.stringify({ error: 'User not found' }));

    await db.orm.public.Comment.create({
        content,
        postId,
        userId: user.id
    });"""
new_add = """    const { person } = await requireAuthenticatedAccount();

    await db.orm.public.Comment.create({
        content,
        postId,
        personId: person.id
    });"""
content = content.replace(old_add, new_add)

# Fix toggleLike
old_like = """    const user = await db.orm.public.User.where({ email: session.user.email }).all().first();
    if (!user) return JSON.parse(JSON.stringify({ error: 'User not found' }));

    const existingLike = await db.orm.public.PostLike.where({ postId, userId: user.id }).all().first();"""
new_like = """    const { person } = await requireAuthenticatedAccount();

    const existingLike = await db.orm.public.PostLike.where({ postId, personId: person.id }).all().first();"""
content = content.replace(old_like, new_like)

content = content.replace('userId: user.id', 'personId: person.id')

with open('lib/actions/post.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed post.ts")

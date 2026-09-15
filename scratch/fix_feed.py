import re

with open('lib/actions/feed.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'const users = await db.orm.public.User.all();',
    'const users = await db.orm.public.Person.all();'
)

# Any other userId refs in feed? The feed returns user objects.
# Let's hope it's not strictly typing User.

with open('lib/actions/feed.ts', 'w', encoding='utf-8') as f:
    f.write(content)
